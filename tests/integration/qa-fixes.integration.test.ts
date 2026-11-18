// Opt-in tests against the REAL Supabase project for the QA fixes:
// booking cap (DB trigger + race guard), idempotent submit, membership
// cancel-at-period-end and account deletion.
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
import { insertBooking } from "../../lib/store";
import { deleteMyAccount } from "../../lib/customer/account";
import { cancelMembership, getMembershipOverview, subscribeToPlan } from "../../lib/customer/memberships";
import { getSupabaseAdmin, hasSupabaseEnv } from "../../lib/supabase/admin";

const ENABLED = process.env.CUTLABZ_INTEGRATION === "1";
const SKIP = ENABLED ? false : "Integration tests are opt-in: set CUTLABZ_INTEGRATION=1.";

const hm = (h: number, m = 0) => h * 60 + m;
const RUN = randomBytes(4).toString("hex");
const userIds: string[] = [];
const bookingIds: string[] = [];

async function makeUser(tag: string): Promise<{ userId: string; email: string }> {
  const email = `integration-test+${RUN}qa${tag}@example.invalid`;
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, email_confirm: true });
  assert.equal(error, null, "create test user failed");
  assert.ok(data.user);
  userIds.push(data.user.id);
  return { userId: data.user.id, email };
}

const details = { name: "ZZ Integration Test", phone: "07700900123", notes: "" };
const book = (v: BookingViewer, p: Record<string, unknown>) =>
  createBooking(
    { serviceId: "haircut", addonIds: [], barberId: "barber-1", startMin: hm(16), ...details, ...p },
    shopNow(),
    v,
  );

// Open (Tue-Sat) dates 3+ days out. Starts at 16:00 (this file) to stay clear of other files' 12:00 slots.
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
  if (userIds.length) await db.from("bookings").delete().in("user_id", userIds);
  if (bookingIds.length) await db.from("bookings").delete().in("id", bookingIds);
  for (const id of userIds) await db.auth.admin.deleteUser(id); // already-gone users just error
});

describe("QA fixes (live DB)", { skip: SKIP }, () => {
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

  test("4 parallel bookings for one user: exactly 3 succeed, 1 is limit", async () => {
    const u = await makeUser("cap");
    const v: BookingViewer = { ...u, membership: null };
    const dates = [nextOpen(), nextOpen(), nextOpen(), nextOpen()];
    const res = await Promise.all(dates.map((date) => book(v, { date })));
    const ok = res.filter((r) => r.ok);
    const limited = res.filter((r) => !r.ok);
    assert.equal(ok.length, 3, JSON.stringify(res));
    assert.equal(limited.length, 1, JSON.stringify(res));
    assert.ok(!limited[0].ok && limited[0].code === "limit" && /up to 3/.test(limited[0].error));
    const { data } = await getSupabaseAdmin()
      .from("bookings")
      .select("id")
      .eq("user_id", u.userId)
      .in("status", ["pending", "confirmed"]);
    assert.equal(data?.length, 3);
  });

  test("the same requestKey twice yields one booking", async () => {
    const u = await makeUser("key");
    const v: BookingViewer = { ...u, membership: null };
    const date = nextOpen();
    const requestKey = `qa-${RUN}-key-1`;
    const [a, b] = await Promise.all([book(v, { date, requestKey }), book(v, { date, requestKey })]);
    const c = await book(v, { date, requestKey });
    assert.ok(a.ok && b.ok && c.ok, JSON.stringify([a, b, c]));
    assert.equal(a.booking.reference, b.booking.reference);
    assert.equal(a.booking.reference, c.booking.reference);
    const { data } = await getSupabaseAdmin().from("bookings").select("id").eq("user_id", u.userId);
    assert.equal(data?.length, 1);
  });

  test("cancelMembership: marks cancelled_at, stays active until ends_on, idempotent", async () => {
    const u = await makeUser("mem");
    const today = shopNow().date;
    const sub = await subscribeToPlan(u, "core", today);
    assert.ok(sub.ok, JSON.stringify(sub));
    const c1 = await cancelMembership(u, today);
    assert.ok(c1.ok && c1.membership.cancelledAt, JSON.stringify(c1));
    const c2 = await cancelMembership(u, today);
    assert.ok(c2.ok && c2.membership.cancelledAt === c1.membership.cancelledAt, JSON.stringify(c2));
    const o = await getMembershipOverview(u, today);
    assert.ok(o.current && o.current.cancelledAt, "still current and flagged cancelled");
    assert.equal(o.current.endsOn, sub.ok ? sub.membership.endsOn : "");
    // Free cut still works, and a new plan still cannot be stacked.
    const cut = await book({ ...u, membership: o.current }, { serviceId: "core", date: nextOpen() });
    assert.ok(cut.ok, JSON.stringify(cut));
    const stack = await subscribeToPlan(u, "plus", today);
    assert.ok(!stack.ok && stack.code === "already_member", JSON.stringify(stack));
    // No active membership -> error.
    const other = await makeUser("mem2");
    const none = await cancelMembership(other, today);
    assert.ok(!none.ok && none.code === "no_membership", JSON.stringify(none));
  });

  test("deleteMyAccount: user gone, upcoming cancelled, all bookings anonymised and detached", async () => {
    const u = await makeUser("del");
    const bystander = await makeUser("del-other");
    const v: BookingViewer = { ...u, membership: null };
    const up = await book(v, { date: nextOpen() });
    assert.ok(up.ok, JSON.stringify(up));
    const past = await insertBooking({
      date: addDays(shopNow().date, -2), startMin: hm(10), endMin: hm(10, 30), barberId: "barber-2",
      serviceId: "haircut", addonIds: [], name: "Real Person", email: u.email, phone: "07700900999",
      notes: "private note", totalGBP: 20, userId: u.userId, status: "completed",
    });
    assert.ok(typeof past === "object", JSON.stringify(past));
    const keep = await book({ ...bystander, membership: null }, { date: nextOpen() });
    assert.ok(keep.ok, JSON.stringify(keep));

    const db = getSupabaseAdmin();
    const { data: before } = await db.from("bookings").select("id,status").eq("user_id", u.userId);
    const ids = (before ?? []).map((r) => r.id as string);
    bookingIds.push(...ids);
    assert.equal(ids.length, 2);

    const res = await deleteMyAccount({ userId: u.userId });
    assert.deepEqual(res, { ok: true });

    const gone = await db.auth.admin.getUserById(u.userId);
    assert.ok(gone.error || !gone.data.user, "auth user should be gone");
    const { data: rows } = await db
      .from("bookings")
      .select("id,status,name,email,phone,notes,user_id,cancelled_at")
      .in("id", ids);
    assert.equal(rows?.length, 2);
    for (const r of rows ?? []) {
      assert.equal(r.user_id, null);
      assert.equal(r.name, "Deleted customer");
      assert.equal(r.email, `deleted+${r.id}@example.invalid`);
      assert.equal(r.notes, "");
      assert.notEqual(r.phone, "07700900999");
    }
    const upcoming = rows?.find((r) => r.id !== (past as { id: string }).id);
    assert.equal(upcoming?.status, "cancelled");
    assert.ok(upcoming?.cancelled_at);
    assert.equal(rows?.find((r) => r.id === (past as { id: string }).id)?.status, "completed");

    // The other user's booking is untouched.
    const { data: other } = await db.from("bookings").select("name,user_id,status").eq("user_id", bystander.userId);
    assert.equal(other?.length, 1);
    assert.equal(other?.[0].name, details.name);
    assert.equal(other?.[0].status, "confirmed");
  });
});
