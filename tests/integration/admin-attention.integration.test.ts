// Opt-in tests against the REAL Supabase project: needs-attention lists, contacted stamp,
// and the "can't reopen a past cancelled booking" rule.
//
//   CUTLABZ_INTEGRATION=1 npm run test:integration
//
// Throwaway bookings (name "ZZ Attention Integration") are removed in `after`.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { addDays, shopNow } from "../../lib/booking-shared";
import { changeBookingStatus, getAttentionItems, markBookingContacted } from "../../lib/admin/bookings";
import type { AdminSession } from "../../lib/admin/auth";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1.";

const RUN = randomBytes(4).toString("hex");
const ids: string[] = [];
const today = shopNow().date;

const session = (): AdminSession => ({
  userId: "00000000-0000-0000-0000-000000000000",
  email: `integration-attn+${RUN}@example.invalid`,
  db: getSupabaseAdmin(),
  barberId: null,
});

/** Inserts a throwaway row directly (past dates can't go through the booking API). */
async function insert(p: Record<string, unknown>): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert({
      booking_date: today,
      start_min: 540,
      end_min: 570,
      barber_id: "barber-1",
      service_id: "haircut",
      addon_ids: [],
      name: "ZZ Attention Integration",
      email: "",
      phone: "07700900123",
      notes: "",
      total_pence: 0,
      status: "confirmed",
      ...p,
    })
    .select("id")
    .single();
  assert.ok(!error && data, JSON.stringify(error));
  ids.push(data.id as string);
  return data.id as string;
}

after(async () => {
  if (!ENABLED || !hasSupabaseEnv()) return;
  if (ids.length) await getSupabaseAdmin().from("bookings").delete().in("id", ids);
});

describe("Admin attention (live DB)", { skip: SKIP }, () => {
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

  test("unresolvedPast lists a started confirmed booking", async () => {
    // Yesterday at 03:00-03:30, far from any real slot.
    const id = await insert({ booking_date: addDays(today, -1), start_min: 180, end_min: 210 });
    const r = await getAttentionItems(session());
    assert.ok(r.unresolvedPast.some((b) => b.id === id));
  });

  test("toContact + markContacted; customer cancels never appear", async () => {
    const recent = new Date().toISOString();
    const shop = await insert({
      status: "cancelled",
      cancelled_at: recent,
      status_changed_at: recent,
      status_changed_by: "staff@example.invalid",
      booking_date: addDays(today, 20),
      start_min: 190,
      end_min: 220,
    });
    const cust = await insert({
      status: "cancelled",
      cancelled_at: recent,
      status_changed_at: recent,
      status_changed_by: "customer",
      booking_date: addDays(today, 20),
      start_min: 230,
      end_min: 260,
    });
    const before1 = await getAttentionItems(session());
    assert.ok(before1.toContact.some((b) => b.id === shop && b.cancelledBy === "shop"));
    assert.ok(!before1.toContact.some((b) => b.id === cust));

    assert.deepEqual(await markBookingContacted(session(), shop), { ok: true });
    assert.deepEqual(await markBookingContacted(session(), shop), { ok: true });
    assert.equal((await markBookingContacted(session(), cust)).ok, false);
    const after1 = await getAttentionItems(session());
    assert.ok(!after1.toContact.some((b) => b.id === shop));
  });

  test("a past cancelled booking cannot be reopened", async () => {
    const id = await insert({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      booking_date: addDays(today, -2),
      start_min: 270,
      end_min: 300,
    });
    const r = await changeBookingStatus(session(), id, "confirmed", "cancelled");
    assert.ok(!r.ok && /already started/.test(r.error), JSON.stringify(r));
    const { data } = await getSupabaseAdmin().from("bookings").select("status").eq("id", id).single();
    assert.equal(data?.status, "cancelled");
  });
});
