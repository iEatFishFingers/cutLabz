// Opt-in tests against the REAL Supabase project for the customer-side fix round:
// stale-reschedule guard, customer-cancel stamp and Premium free add-ons.
//
//   CUTLABZ_INTEGRATION=1 npm run test:integration
//
// Throwaway users `integration-test+<random>@example.invalid` are tracked by
// id and everything created is removed in `after`.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { dayOfWeek } from "../../lib/availability";
import { addDays, shopNow } from "../../lib/booking-shared";
import { createBooking, type BookingViewer } from "../../lib/booking-server";
import { cancelMyBooking, listMyBookings, rescheduleMyBooking } from "../../lib/customer/bookings";
import { subscribeToPlan } from "../../lib/customer/memberships";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1.";

const hm = (h: number, m = 0) => h * 60 + m;
const RUN = randomBytes(4).toString("hex");
const userIds: string[] = [];

async function makeUser(tag: string): Promise<{ userId: string; email: string }> {
  const email = `integration-test+${RUN}cf${tag}@example.invalid`;
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, email_confirm: true });
  assert.equal(error, null, "create test user failed");
  assert.ok(data.user);
  userIds.push(data.user.id);
  return { userId: data.user.id, email };
}

const details = { name: "ZZ Integration Test", phone: "07700900123", notes: "" };
const book = (v: BookingViewer, p: Record<string, unknown>) =>
  createBooking(
    { serviceId: "haircut", addonIds: [], barberId: "barber-1", startMin: hm(17), ...details, ...p },
    shopNow(),
    v,
  );

// Open (Tue-Sat) dates 3+ days out. Uses 17:00 to stay clear of other files' slots.
const now0 = shopNow();
const open: string[] = [];
for (let i = 3; i < 27; i++) {
  const d = addDays(now0.date, i);
  const dow = dayOfWeek(d);
  if (dow >= 2 && dow <= 6) open.push(d);
}
const nextOpen = () => {
  const d = open.shift();
  assert.ok(d, "ran out of open dates");
  return d;
};

async function rowFor(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id,booking_date,start_min,barber_id,status,cancelled_at,status_changed_by,total_pence,addon_ids")
    .eq("user_id", userId)
    .single();
  assert.equal(error, null);
  assert.ok(data);
  return data;
}

after(async () => {
  if (!ENABLED || !hasSupabaseEnv()) return;
  const db = getSupabaseAdmin();
  if (userIds.length) {
    await db.from("bookings").delete().in("user_id", userIds);
    await db.from("memberships").delete().in("user_id", userIds);
  }
  for (const id of userIds) await db.auth.admin.deleteUser(id);
});

describe("customer fixes (live DB)", { skip: SKIP }, () => {
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

  test("stale reschedule: second move with the old `expected` is refused, first stands", async () => {
    const u = await makeUser("stale");
    const v: BookingViewer = { ...u, membership: null };
    const date = nextOpen();
    const created = await book(v, { date });
    assert.ok(created.ok, JSON.stringify(created));
    const row = await rowFor(u.userId);
    const expected = { date, startMin: hm(17), barberId: "barber-1" };
    const dest = nextOpen();

    const first = await rescheduleMyBooking(
      v,
      { bookingId: row.id, date: dest, startMin: hm(17, 30), barberId: "barber-1", expected },
      shopNow(),
    );
    assert.ok(first.ok, JSON.stringify(first));

    const second = await rescheduleMyBooking(
      v,
      { bookingId: row.id, date, startMin: hm(18), barberId: "barber-1", expected },
      shopNow(),
    );
    assert.ok(!second.ok && second.code === "stale", JSON.stringify(second));

    const after = await rowFor(u.userId);
    assert.equal(after.booking_date, dest);
    assert.equal(after.start_min, hm(17, 30));
  });

  test("customer cancel stamps status_changed_by 'customer'", async () => {
    const u = await makeUser("cancel");
    const v: BookingViewer = { ...u, membership: null };
    const created = await book(v, { date: nextOpen() });
    assert.ok(created.ok, JSON.stringify(created));
    const row = await rowFor(u.userId);
    const res = await cancelMyBooking(v, row.id, shopNow());
    assert.ok(res.ok, JSON.stringify(res));
    const after = await rowFor(u.userId);
    assert.equal(after.status, "cancelled");
    assert.equal(after.status_changed_by, "customer");
    assert.ok(after.cancelled_at);
    const mine = (await listMyBookings(v, shopNow())).past.find((b) => b.id === row.id);
    assert.equal(mine?.cancelledBy, "customer");
    assert.ok(mine?.cancelledAt);
  });

  test("premium member cut with add-ons is free; a core member's add-ons are charged", async () => {
    const p = await makeUser("prem");
    const sub = await subscribeToPlan({ userId: p.userId }, "premium", shopNow().date);
    assert.ok(sub.ok, JSON.stringify(sub));
    const pv: BookingViewer = { ...p, membership: sub.membership };
    const r = await book(pv, { serviceId: "premium", addonIds: ["hot-towel", "filler"], date: nextOpen() });
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(r.booking.totalGBP, 0);
    const prow = await rowFor(p.userId);
    assert.equal(prow.total_pence, 0);
    assert.equal(prow.addon_ids?.length, 2);

    const c = await makeUser("core");
    const csub = await subscribeToPlan({ userId: c.userId }, "core", shopNow().date);
    assert.ok(csub.ok, JSON.stringify(csub));
    const cv: BookingViewer = { ...c, membership: csub.membership };
    const cr = await book(cv, { serviceId: "core", addonIds: ["hot-towel", "filler"], date: nextOpen() });
    assert.ok(cr.ok, JSON.stringify(cr));
    assert.equal(cr.booking.totalGBP, 10);
    assert.equal((await rowFor(c.userId)).total_pence, 1000);
  });
});
