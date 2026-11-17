// Opt-in integration tests against the REAL Supabase project.
//
//   CUTLABZ_INTEGRATION=1 npm run test:integration
//
// (PowerShell: `$env:CUTLABZ_INTEGRATION = "1"; npm run test:integration`)
//
// Reads credentials from .env.local (never logged). Only creates rows whose
// email is `integration-test+<random>@example.invalid`, and deletes only such
// rows afterwards. Not matched by `npm test`.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { dayOfWeek } from "../../lib/availability";
import { addDays, shopNow } from "../../lib/booking-shared";
import type { CreateBookingInput } from "../../lib/booking-shared";
import { createBooking } from "../../lib/booking-server";
import type { Membership } from "../../lib/membership";
import { loadCatalog } from "../../lib/catalog-db";
import { insertBooking } from "../../lib/store";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1 to run them against the real database.";

const hm = (h: number, m = 0) => h * 60 + m;
const EMAIL_PREFIX = "integration-test+";
const EMAIL_SUFFIX = "@example.invalid";
const RUN_ID = randomBytes(4).toString("hex");
let counter = 0;
const freshEmail = () => `${EMAIL_PREFIX}${RUN_ID}${(counter++).toString(16)}${randomBytes(2).toString("hex")}${EMAIL_SUFFIX}`;
const isTestEmail = (e: unknown) =>
  typeof e === "string" && e.startsWith(EMAIL_PREFIX) && e.endsWith(EMAIL_SUFFIX);

const input = (date: string, p: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceId: "haircut",
  addonIds: [],
  barberId: "barber-1",
  date,
  startMin: hm(12),
  name: "ZZ Integration Test",
  email: freshEmail(),
  phone: "07700900123",
  notes: "",
  ...p,
});

// Distinct open (Tue-Sat) dates, 14-27 days ahead, handed out once each.
const dates: string[] = [];
const closedDates: string[] = [];
const nextOpen = () => {
  const d = dates.shift();
  assert.ok(d, "ran out of open test dates");
  return d;
};

async function dbRows(email: string) {
  const { data, error } = await getSupabaseAdmin().from("bookings").select("*").eq("email", email);
  assert.equal(error, null, "select bookings failed");
  return data ?? [];
}

// Bookings now require a signed-in user (bookings.user_id references auth.users),
// so each booking gets a throwaway auth user whose email is the test email.
const createdUserIds: string[] = [];
async function bookAs(inp: unknown, now: { date: string; min: number }) {
  const email = (inp as { email: string }).email;
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, email_confirm: true });
  assert.equal(error, null, "create test auth user failed");
  assert.ok(data.user);
  createdUserIds.push(data.user.id);
  const membership: Membership | null = null;
  return createBooking(inp, now, { userId: data.user.id, email, membership });
}

async function cleanup() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("bookings")
    .select("id,email")
    .like("email", `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`);
  if (error) {
    console.error("cleanup select failed:", error.code);
    return;
  }
  const ids = (data ?? []).filter((r) => isTestEmail(r.email)).map((r) => r.id as string);
  if (ids.length) {
    const del = await db.from("bookings").delete().in("id", ids);
    if (del.error) console.error("cleanup delete failed:", del.error.code);
  }
  // Only auth users this run created (never matched by pattern).
  for (const id of createdUserIds.splice(0)) {
    const r = await db.auth.admin.deleteUser(id);
    if (r.error) console.error("cleanup user delete failed");
  }
}

describe("database integration", { skip: SKIP }, () => {
  before(async () => {
    if (!hasSupabaseEnv()) {
      try {
        process.loadEnvFile(".env.local");
      } catch {
        // fall through to the explicit check below
      }
    }
    if (!hasSupabaseEnv()) {
      throw new Error(
        "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (or the shell).",
      );
    }
    const today = shopNow().date;
    for (let i = 14; i <= 27; i++) {
      const d = addDays(today, i);
      const dow = dayOfWeek(d);
      (dow >= 2 && dow <= 6 ? dates : closedDates).push(d);
    }
    assert.ok(dates.length >= 6 && closedDates.length >= 2);
    await cleanup(); // leftovers from an aborted earlier run
  });

  after(async () => {
    if (hasSupabaseEnv()) await cleanup();
  });

  test("(a) booking on an open future day is stored correctly", async () => {
    const date = nextOpen();
    const inp = input(date);
    const r = await bookAs(inp, shopNow());
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) return;
    assert.match(r.booking.reference, /^CL-[0-9A-Fa-f]{6}$/);
    const rows = await dbRows(inp.email);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.booking_date, date);
    assert.equal(row.start_min, hm(12));
    assert.equal(row.end_min, hm(12, 30));
    assert.equal(row.total_pence, 2000);
    assert.equal(row.barber_id, "barber-1");
    assert.match(row.reference, /^CL-[0-9A-Fa-f]{6}$/);
    assert.equal(row.reference, r.booking.reference);
  });

  test("(b) overlapping booking is rejected by the app and by the DB constraint", async () => {
    const date = nextOpen();
    const first = input(date);
    assert.ok((await bookAs(first, shopNow())).ok);

    const second = await bookAs(input(date, { startMin: hm(12, 15) }), shopNow());
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.code, "slot_taken");

    // Bypass the app's availability check: the no_overlap constraint must reject it.
    const direct = await insertBooking({
      date,
      startMin: hm(12, 15),
      endMin: hm(12, 45),
      barberId: "barber-1",
      serviceId: "haircut",
      addonIds: [],
      name: "ZZ Integration Test",
      email: freshEmail(),
      phone: "07700900123",
      notes: "",
      totalGBP: 20,
    });
    assert.equal(direct, "conflict");
  });

  test("(c) back-to-back bookings (end == next start) are allowed", async () => {
    const date = nextOpen();
    const a = await bookAs(input(date, { startMin: hm(12) }), shopNow());
    const b = await bookAs(input(date, { startMin: hm(12, 30) }), shopNow());
    assert.ok(a.ok, JSON.stringify(a));
    assert.ok(b.ok, JSON.stringify(b));
  });

  test("(d) closed day, past slot and inside minimum notice are unavailable", async () => {
    for (const date of closedDates.slice(0, 4)) {
      if (dayOfWeek(date) !== 0 && dayOfWeek(date) !== 1) continue;
      const r = await bookAs(input(date), shopNow());
      assert.equal(r.ok, false, date);
      if (!r.ok) assert.equal(r.code, "unavailable", date);
    }
    const now = shopNow();
    const past = await bookAs(input(addDays(now.date, -1)), now);
    assert.ok(!past.ok && past.code === "unavailable", JSON.stringify(past));

    const soon = await bookAs(
      input(now.date, { startMin: Math.ceil((now.min + 5) / 15) * 15 }),
      now,
    );
    assert.ok(!soon.ok && soon.code === "unavailable", JSON.stringify(soon));
  });

  test("(e) 'any' spreads two same-time bookings onto the two barbers", async () => {
    const date = nextOpen();
    const a = await bookAs(input(date, { barberId: "any" }), shopNow());
    const b = await bookAs(input(date, { barberId: "any" }), shopNow());
    assert.ok(a.ok && b.ok, JSON.stringify([a, b]));
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.booking.barberId, b.booking.barberId);
    const third = await bookAs(input(date, { barberId: "any" }), shopNow());
    assert.ok(!third.ok && third.code === "slot_taken", JSON.stringify(third));
  });

  test("(f) loadCatalog returns the seeded catalog, Tue-Sat hours, no time-off reason", async () => {
    const c = await loadCatalog();
    assert.equal(c.services.length, 5);
    assert.equal(c.addons.length, 4);
    assert.equal(c.barbers.length, 2);
    for (const b of c.barbers) {
      for (const dow of [2, 3, 4, 5, 6]) {
        assert.ok((b.hours[dow] ?? []).length > 0, `${b.id} should work weekday ${dow}`);
      }
      for (const dow of [0, 1]) {
        assert.equal((b.hours[dow] ?? []).length, 0, `${b.id} should be off weekday ${dow}`);
      }
    }
    for (const t of c.timeOff) {
      assert.deepEqual(Object.keys(t).sort(), ["barberId", "endDate", "startDate"]);
      assert.ok(!("reason" in t));
    }
  });
});
