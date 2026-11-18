// Opt-in customer-lifecycle tests against the REAL Supabase project.
//
//   CUTLABZ_INTEGRATION=1 npm run test:integration
//
// Creates throwaway auth users `integration-test+<random>@example.invalid`
// (tracked by id, never matched by pattern), exercises memberships, free member
// cuts, the end-date and limit rules, cancel and reschedule against the real
// constraints, then deletes everything it created (users cascade memberships).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { dayOfWeek } from "../../lib/availability";
import { addDays, shopNow } from "../../lib/booking-shared";
import { createBooking, getSlots, type BookingViewer } from "../../lib/booking-server";
import { insertBooking } from "../../lib/store";
import { getMembershipOverview, subscribeToPlan } from "../../lib/customer/memberships";
import { cancelMyBooking, listMyBookings, rescheduleMyBooking } from "../../lib/customer/bookings";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1.";

const hm = (h: number, m = 0) => h * 60 + m;
const RUN = randomBytes(4).toString("hex");
const userIds: string[] = [];

async function makeUser(tag: string): Promise<{ userId: string; email: string }> {
  const email = `integration-test+${RUN}${tag}@example.invalid`;
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, email_confirm: true });
  assert.equal(error, null, "create test user failed");
  assert.ok(data.user);
  userIds.push(data.user.id);
  return { userId: data.user.id, email };
}

const details = { name: "ZZ Integration Test", phone: "07700900123", notes: "" };
const book = (v: BookingViewer, p: Record<string, unknown>) =>
  createBooking({ serviceId: "haircut", addonIds: [], barberId: "barber-1", startMin: hm(12), ...details, ...p }, shopNow(), v);

// Open (Tue-Sat) dates 3+ days out so the 24h self-serve rule is satisfied.
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

after(async () => {
  if (!ENABLED || !hasSupabaseEnv()) return;
  const db = getSupabaseAdmin();
  if (userIds.length) {
    await db.from("bookings").delete().in("user_id", userIds);
    for (const id of userIds) await db.auth.admin.deleteUser(id);
  }
  // Rows inserted without a user (slot blockers) are tagged by this email.
  await db.from("bookings").delete().eq("email", `integration-test+${RUN}-blocker@example.invalid`);
});

describe("customer lifecycle (live DB)", { skip: SKIP }, () => {
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

  test("membership: subscribe, no stacking, one-off plans rejected", async () => {
    const u = await makeUser("m1");
    const first = await subscribeToPlan(u, "core", shopNow().date);
    assert.ok(first.ok, JSON.stringify(first));
    const again = await subscribeToPlan(u, "plus", shopNow().date);
    assert.ok(!again.ok && again.code === "already_member", JSON.stringify(again));
    const u2 = await makeUser("m2");
    const bad = await subscribeToPlan(u2, "haircut", shopNow().date);
    assert.ok(!bad.ok && bad.code === "invalid", JSON.stringify(bad));
    const overview = await getMembershipOverview(u, shopNow().date);
    assert.equal(overview.current?.plan, "core");
  });

  test("member cut is free, owned by the user, limited to one upcoming; cancel frees it", async () => {
    const u = await makeUser("m3");
    const sub = await subscribeToPlan(u, "core", shopNow().date);
    assert.ok(sub.ok);
    const viewer: BookingViewer = { ...u, membership: sub.ok ? sub.membership : null };
    const date = nextOpen();

    const r = await book(viewer, { serviceId: "core", date });
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.booking.totalGBP, 0);
    const { data } = await getSupabaseAdmin().from("bookings").select("user_id,membership_id,email,status").eq("barber_id", r.booking.barberId).eq("booking_date", date).eq("user_id", u.userId).single();
    assert.equal(data?.user_id, u.userId);
    assert.equal(data?.membership_id, viewer.membership?.id);
    assert.equal(data?.email, u.email.toLowerCase());

    const second = await book(viewer, { serviceId: "core", date: nextOpen() });
    assert.ok(!second.ok && second.code === "limit", JSON.stringify(second));

    const list = await listMyBookings(viewer, shopNow());
    assert.equal(list.upcoming.length, 1);
    const mine = list.upcoming[0];
    assert.equal(mine.isMemberCut, true);
    assert.equal(mine.canSelfServe, true);

    const c = await cancelMyBooking(viewer, mine.id, shopNow());
    assert.ok(c.ok, JSON.stringify(c));
    const c2 = await cancelMyBooking(viewer, mine.id, shopNow());
    assert.ok(!c2.ok && c2.code === "not_active", JSON.stringify(c2));
    const third = await book(viewer, { serviceId: "core", date: nextOpen() });
    assert.ok(third.ok, `cut can be rebooked after cancelling: ${JSON.stringify(third)}`);
  });

  test("non-members cannot book member cuts; a user cannot touch another user's booking", async () => {
    const a = await makeUser("n1");
    const b = await makeUser("n2");
    const va: BookingViewer = { ...a, membership: null };
    const vb: BookingViewer = { ...b, membership: null };
    const denied = await book(va, { serviceId: "core", date: nextOpen() });
    assert.ok(!denied.ok && denied.code === "membership", JSON.stringify(denied));
    const slots = await getSlots({ date: nextOpen(), serviceId: "core", addonIds: [], barberId: "any" }, shopNow(), va);
    assert.equal(slots.ok, false);

    const ok = await book(va, { date: nextOpen() });
    assert.ok(ok.ok, JSON.stringify(ok));
    const [row] = (await listMyBookings(va, shopNow())).upcoming;
    const steal = await cancelMyBooking(vb, row.id, shopNow());
    assert.ok(!steal.ok && steal.code === "not_found", JSON.stringify(steal));
    const move = await rescheduleMyBooking(vb, { bookingId: row.id, date: nextOpen(), startMin: hm(13), barberId: "barber-1" }, shopNow());
    assert.ok(!move.ok && move.code === "not_found", JSON.stringify(move));
  });

  test("membership end date blocks later bookings (booking and slots)", async () => {
    const u = await makeUser("e1");
    const today = shopNow().date;
    const endsOn = addDays(today, 4);
    const ins = await getSupabaseAdmin()
      .from("memberships")
      .insert({ user_id: u.userId, plan: "core", starts_on: addDays(today, -25), ends_on: endsOn })
      .select("id,plan,starts_on,ends_on")
      .single();
    assert.equal(ins.error, null);
    const viewer: BookingViewer = {
      ...u,
      membership: { id: ins.data!.id, plan: "core", startsOn: ins.data!.starts_on, endsOn: ins.data!.ends_on, cancelledAt: null },
    };
    const late = open.find((d) => d > endsOn)!;
    const r = await book(viewer, { serviceId: "core", date: late });
    assert.ok(!r.ok && r.code === "membership", JSON.stringify(r));
    const s = await getSlots({ date: late, serviceId: "core", addonIds: [], barberId: "any" }, shopNow(), viewer);
    assert.deepEqual(s, { ok: true, slots: [] });
  });

  test("reschedule is atomic: a taken slot leaves the original booking untouched; a free one moves it", async () => {
    const u = await makeUser("r1");
    const viewer: BookingViewer = { ...u, membership: null };
    const date = nextOpen();
    const r = await book(viewer, { date, startMin: hm(12) });
    assert.ok(r.ok, JSON.stringify(r));
    const [mine] = (await listMyBookings(viewer, shopNow())).upcoming;

    const target = nextOpen();
    const blocker = await insertBooking({
      date: target, startMin: hm(14), endMin: hm(14, 30), barberId: "barber-1", serviceId: "haircut",
      addonIds: [], name: "blocker", email: `integration-test+${RUN}-blocker@example.invalid`,
      phone: "07700900124", notes: "", totalGBP: 20,
    });
    assert.notEqual(blocker, "conflict");

    const clash = await rescheduleMyBooking(viewer, { bookingId: mine.id, date: target, startMin: hm(14), barberId: "barber-1" }, shopNow());
    assert.ok(!clash.ok && clash.code === "slot_taken", JSON.stringify(clash));
    const still = (await listMyBookings(viewer, shopNow())).upcoming[0];
    assert.equal(still.date, date);
    assert.equal(still.startMin, hm(12));

    // Shifting inside your own old slot is allowed (it doesn't block itself).
    const nudge = await rescheduleMyBooking(viewer, { bookingId: mine.id, date, startMin: hm(12, 15), barberId: "barber-1" }, shopNow());
    assert.ok(nudge.ok, JSON.stringify(nudge));

    const free = await rescheduleMyBooking(viewer, { bookingId: mine.id, date: target, startMin: hm(15), barberId: "barber-1" }, shopNow());
    assert.ok(free.ok, JSON.stringify(free));
    if (free.ok) {
      assert.equal(free.booking.id, mine.id);
      assert.equal(free.booking.date, target);
      assert.equal(free.booking.totalGBP, 20, "price never changes");
    }
  });

  test("inside 24h: cancel and reschedule are refused", async () => {
    const u = await makeUser("t1");
    const viewer: BookingViewer = { ...u, membership: null };
    const now = shopNow();
    // Tomorrow at 00:00 is always < 24h away unless it is exactly midnight.
    const row = await insertBooking({
      date: addDays(now.date, 1), startMin: 0, endMin: 30, barberId: "barber-2", serviceId: "haircut",
      addonIds: [], name: "ZZ", email: u.email, phone: "07700900125", notes: "", totalGBP: 20, userId: u.userId,
    });
    assert.ok(row !== "conflict");
    const id = (row as { id: string }).id;
    const c = await cancelMyBooking(viewer, id, now);
    assert.ok(!c.ok && c.code === "too_late", JSON.stringify(c));
    const m = await rescheduleMyBooking(viewer, { bookingId: id, date: nextOpen(), startMin: hm(13), barberId: "barber-1" }, now);
    assert.ok(!m.ok && m.code === "too_late", JSON.stringify(m));
  });

  test("anyone is capped at 3 upcoming bookings", async () => {
    const u = await makeUser("c1");
    const viewer: BookingViewer = { ...u, membership: null };
    for (let i = 0; i < 3; i++) {
      const r = await book(viewer, { date: nextOpen() });
      assert.ok(r.ok, JSON.stringify(r));
    }
    const fourth = await book(viewer, { date: nextOpen() });
    assert.ok(!fourth.ok && fourth.code === "limit", JSON.stringify(fourth));
  });
});
