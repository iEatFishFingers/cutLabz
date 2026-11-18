import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createBooking } from "../lib/booking-server";
import { validateDetails, type CreateBookingInput } from "../lib/booking-shared";
import { deleteMyAccount } from "../lib/customer/account";
import { cancelMembership, getMembershipOverview, subscribeToPlan } from "../lib/customer/memberships";
import { insertBooking, listActiveBookingsForUser, type Booking } from "../lib/store";
import { hm, resetStore, viewer } from "./helpers";

// Tuesday 2026-11-17, 10:00 London.
const NOW = { date: "2026-11-17", min: hm(10) };
const input = (p: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceId: "haircut",
  addonIds: [],
  barberId: "barber-1",
  date: "2026-11-18",
  startMin: hm(12),
  name: "Sam Smith",
  email: "ignored@example.com",
  phone: "07700900000",
  notes: "",
  ...p,
});
const u1 = viewer({ userId: "u1", email: "u1@example.com" });
const u2 = viewer({ userId: "u2", email: "u2@example.com" });
const all = () => (globalThis as unknown as { __cutlabzBookings: Booking[] }).__cutlabzBookings;

describe("booking cap race guard (all bookings)", () => {
  beforeEach(resetStore);

  test("4 parallel paid bookings: exactly 3 succeed, 1 is limit", async () => {
    const res = await Promise.all(
      [12, 13, 14, 15].map((h) => createBooking(input({ startMin: hm(h) }), NOW, u1)),
    );
    assert.equal(res.filter((r) => r.ok).length, 3, JSON.stringify(res));
    const limited = res.filter((r) => !r.ok);
    assert.equal(limited.length, 1);
    assert.ok(!limited[0].ok && limited[0].code === "limit" && /up to 3/.test(limited[0].error));
    assert.equal((await listActiveBookingsForUser("u1")).length, 3);
  });

  test("the store itself refuses a 4th upcoming booking", async () => {
    const row = (h: number) =>
      insertBooking({
        date: "2099-01-05",
        startMin: hm(h),
        endMin: hm(h) + 30,
        barberId: "barber-1",
        serviceId: "haircut",
        addonIds: [],
        name: "S",
        email: "e@x.co",
        phone: "07700900000",
        notes: "",
        totalGBP: 20,
        userId: "u1",
      });
    for (const h of [12, 13, 14]) assert.ok(typeof (await row(h)) === "object");
    assert.equal(await row(15), "limit");
  });
});

describe("requestKey idempotency", () => {
  beforeEach(resetStore);

  test("same key twice returns the same booking, creating one row", async () => {
    const key = "abcd1234-ef56-7890";
    const a = await createBooking(input({ requestKey: key }), NOW, u1);
    const b = await createBooking(input({ requestKey: key }), NOW, u1);
    assert.ok(a.ok && b.ok, JSON.stringify([a, b]));
    assert.deepEqual(a.booking, b.booking);
    assert.equal(all().length, 1);
  });

  test("replay works even when the user is at the cap", async () => {
    const key = "key-for-replay-1";
    const first = await createBooking(input({ requestKey: key }), NOW, u1);
    assert.ok(first.ok);
    for (const h of [13, 14]) assert.ok((await createBooking(input({ startMin: hm(h) }), NOW, u1)).ok);
    const again = await createBooking(input({ requestKey: key }), NOW, u1);
    assert.ok(again.ok && again.booking.reference === first.booking.reference);
  });

  test("keys are per user; malformed keys are rejected", async () => {
    const key = "shared-key-12345";
    assert.ok((await createBooking(input({ requestKey: key }), NOW, u1)).ok);
    assert.ok((await createBooking(input({ requestKey: key, startMin: hm(14) }), NOW, u2)).ok);
    assert.equal(all().length, 2);
    for (const bad of ["short", "has space 12345", "x".repeat(65), 12345678 as unknown as string]) {
      const r = await createBooking(input({ requestKey: bad, startMin: hm(16) }), NOW, u1);
      assert.ok(!r.ok && r.code === "invalid", String(bad));
    }
  });
});

describe("cancel membership", () => {
  beforeEach(resetStore);

  test("end-of-period: stays current until ends_on, idempotent", async () => {
    const sub = await subscribeToPlan({ userId: "u1" }, "core", "2026-11-17");
    assert.ok(sub.ok && sub.membership.cancelledAt === null);
    const c1 = await cancelMembership({ userId: "u1" }, "2026-11-20");
    assert.ok(c1.ok && c1.membership.cancelledAt);
    const c2 = await cancelMembership({ userId: "u1" }, "2026-11-21");
    assert.ok(c2.ok && c2.membership.cancelledAt === c1.membership.cancelledAt);
    const o = await getMembershipOverview({ userId: "u1" }, "2026-12-01");
    assert.equal(o.current?.plan, "core");
    assert.ok(o.current?.cancelledAt);
    // Still cannot stack a new plan until it ends.
    const again = await subscribeToPlan({ userId: "u1" }, "plus", "2026-11-25");
    assert.ok(!again.ok && again.code === "already_member");
    // Free cuts continue until ends_on.
    const m = o.current!;
    const r = await createBooking(input({ serviceId: "core" }), NOW, viewer({ userId: "u1", membership: m }));
    assert.ok(r.ok, JSON.stringify(r));
  });

  test("errors without an active membership (none, or expired)", async () => {
    const none = await cancelMembership({ userId: "u1" }, "2026-11-17");
    assert.ok(!none.ok && none.code === "no_membership");
    await subscribeToPlan({ userId: "u1" }, "core", "2026-11-17");
    const expired = await cancelMembership({ userId: "u1" }, "2027-02-01");
    assert.ok(!expired.ok && expired.code === "no_membership");
  });
});

describe("deleteMyAccount (memory store)", () => {
  beforeEach(resetStore);

  test("cancels upcoming, anonymises all, detaches the user", async () => {
    const mk = (date: string, h: number, userId: string, status: string) =>
      insertBooking({
        date,
        startMin: hm(h),
        endMin: hm(h) + 30,
        barberId: "barber-1",
        serviceId: "haircut",
        addonIds: [],
        name: "Real Name",
        email: "real@example.com",
        phone: "07700900000",
        notes: "private",
        totalGBP: 20,
        userId,
        status,
      });
    const up = await mk("2026-11-20", 12, "u1", "confirmed");
    const past = await mk("2026-11-10", 12, "u1", "completed");
    const other = await mk("2026-11-20", 14, "u2", "confirmed");
    assert.ok(typeof up === "object" && typeof past === "object" && typeof other === "object");
    await subscribeToPlan({ userId: "u1" }, "core", "2026-11-17");

    assert.deepEqual(await deleteMyAccount({ userId: "u1" }, NOW), { ok: true });

    const byId = (id: string) => all().find((b) => b.id === id)!;
    assert.equal(byId(up.id).status, "cancelled");
    assert.equal(byId(past.id).status, "completed");
    for (const id of [up.id, past.id]) {
      const b = byId(id);
      assert.equal(b.name, "Deleted customer");
      assert.equal(b.email, `deleted+${id}@example.invalid`);
      assert.equal(b.notes, "");
      assert.notEqual(b.phone, "07700900000");
      assert.equal(b.userId, null);
    }
    assert.equal(byId(other.id).name, "Real Name");
    assert.equal(byId(other.id).userId, "u2");
    assert.equal((await getMembershipOverview({ userId: "u1" }, "2026-11-17")).current, null);
  });
});

describe("validation messages", () => {
  test("booking phone: empty vs malformed", () => {
    const base = { name: "Sam Smith", email: "sam@example.com", notes: "" };
    assert.equal(validateDetails({ ...base, phone: "" }).phone, "Phone number is required.");
    assert.equal(validateDetails({ ...base, phone: "  " }).phone, "Phone number is required.");
    assert.equal(validateDetails({ ...base, phone: "12ab" }).phone, "Enter a valid phone number.");
    assert.equal(validateDetails({ ...base, phone: "07700 900000" }).phone, undefined);
  });
});
