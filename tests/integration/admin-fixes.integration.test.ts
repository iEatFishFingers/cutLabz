// Opt-in tests against the REAL Supabase project for the admin fixes:
// stale-safe status updates and walk-in idempotency.
//
//   CUTLABZ_INTEGRATION=1 npm run test:integration
//
// Throwaway bookings (name "ZZ Admin Integration") are tracked by key/id and removed in `after`.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { dayOfWeek } from "../../lib/availability";
import { addDays, shopNow } from "../../lib/booking-shared";
import { changeBookingStatus, createAdminBooking } from "../../lib/admin/bookings";
import type { AdminSession } from "../../lib/admin/auth";
import { loadAdminCatalog } from "../../lib/catalog-db";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1.";

const RUN = randomBytes(4).toString("hex");
const keys: string[] = [];
const ids: string[] = [];

const now0 = shopNow();
const open: string[] = [];
for (let i = 5; i < 27; i++) {
  const d = addDays(now0.date, i);
  const dow = dayOfWeek(d);
  if (dow >= 2 && dow <= 6) open.push(d);
}
const nextOpen = () => {
  const d = open.pop();
  assert.ok(d, "ran out of open dates");
  return d;
};

// The service-role client stands in for the admin's RLS session (same table access).
const session = (): AdminSession => ({
  userId: "00000000-0000-0000-0000-000000000000",
  email: `integration-admin+${RUN}@example.invalid`,
  db: getSupabaseAdmin(),
  barberId: null,
});

// 17:30 keeps clear of other files' slots; override hours keeps this independent of the rota.
const walkIn = async (p: { date: string; requestKey?: string }) =>
  createAdminBooking(
    session(),
    {
      barberId: "barber-1",
      serviceId: "haircut",
      addonIds: [],
      startMin: 17 * 60 + 30,
      name: "ZZ Admin Integration",
      phone: "",
      email: "",
      notes: "",
      overrideHours: true,
      ...p,
    },
    await loadAdminCatalog(),
  );

after(async () => {
  if (!ENABLED || !hasSupabaseEnv()) return;
  const db = getSupabaseAdmin();
  if (keys.length) await db.from("bookings").delete().in("request_key", keys);
  if (ids.length) await db.from("bookings").delete().in("id", ids);
});

describe("Admin fixes (live DB)", { skip: SKIP }, () => {
  before(() => {
    if (!hasSupabaseEnv()) {
      try {
        process.loadEnvFile(".env.local");
      } catch {
        // checked below
      }
    }
    if (!hasSupabaseEnv()) throw new Error("Missing Supabase env (.env.local).");
  });

  test("walk-in with the same requestKey (parallel + retry) creates exactly one row", async () => {
    const date = nextOpen();
    const requestKey = `adm-${RUN}-key-1`;
    keys.push(requestKey);
    const [a, b] = await Promise.all([walkIn({ date, requestKey }), walkIn({ date, requestKey })]);
    const c = await walkIn({ date, requestKey });
    assert.ok(a.ok && b.ok && c.ok, JSON.stringify([a, b, c]));
    assert.equal(a.reference, b.reference);
    assert.equal(a.reference, c.reference);
    const { data } = await getSupabaseAdmin()
      .from("bookings")
      .select("id,user_id")
      .eq("request_key", requestKey);
    assert.equal(data?.length, 1);
    assert.equal(data?.[0].user_id, null);
  });

  test("stale status update is refused; matching one succeeds and stamps the audit columns", async () => {
    const date = nextOpen();
    const requestKey = `adm-${RUN}-key-2`;
    keys.push(requestKey);
    const r = await walkIn({ date, requestKey });
    assert.ok(r.ok, JSON.stringify(r));
    const db = getSupabaseAdmin();
    const { data: row } = await db.from("bookings").select("id").eq("request_key", requestKey).single();
    assert.ok(row);
    const id = row.id as string;
    ids.push(id);

    // Two admins cancel at once from the same "confirmed" view: exactly one wins.
    const [x, y] = await Promise.all([
      changeBookingStatus(session(), id, "cancelled", "confirmed"),
      changeBookingStatus(session(), id, "cancelled", "confirmed"),
    ]);
    assert.equal([x, y].filter((v) => v.ok).length, 1, JSON.stringify([x, y]));
    const loser = [x, y].find((v) => !v.ok);
    assert.ok(loser && !loser.ok && /changed/.test(loser.error));

    const { data: after1 } = await db
      .from("bookings")
      .select("status,cancelled_at,status_changed_at,status_changed_by")
      .eq("id", id)
      .single();
    assert.equal(after1?.status, "cancelled");
    assert.ok(after1?.cancelled_at && after1?.status_changed_at);
    assert.match(String(after1?.status_changed_by), /^integration-admin\+/);

    // Stale: the UI still thinks it is confirmed.
    const stale = await changeBookingStatus(session(), id, "completed", "confirmed");
    assert.ok(!stale.ok && /changed/.test(stale.error));

    // Reopen works; a future booking then cannot be completed even with a correct expected status.
    const reopen = await changeBookingStatus(session(), id, "confirmed", "cancelled");
    assert.ok(reopen.ok, JSON.stringify(reopen));
    const early = await changeBookingStatus(session(), id, "completed", "confirmed");
    assert.ok(!early.ok && /future booking/.test(early.error));
    const { data: after2 } = await db.from("bookings").select("status,cancelled_at").eq("id", id).single();
    assert.equal(after2?.status, "confirmed");
    assert.equal(after2?.cancelled_at, null);
  });
});
