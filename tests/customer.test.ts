import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createBooking, getSlots } from "../lib/booking-server";
import {
  cancelMyBooking,
  getRescheduleSlots,
  listMyBookings,
  rescheduleMyBooking,
} from "../lib/customer/bookings";
import { getMembershipOverview, subscribeToPlan } from "../lib/customer/memberships";
import {
  getBookingForUser,
  insertBooking,
  listBookingsForDate,
  rescheduleBookingRow,
} from "../lib/store";
import type { CreateBookingInput } from "../lib/booking-shared";
import { hm, member, resetStore, viewer } from "./helpers";

// Tuesday 2026-11-17, 10:00 London.
const NOW = { date: "2026-11-17", min: hm(10) };
const WED = "2026-11-18";
const THU = "2026-11-19";

const input = (p: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceId: "haircut",
  addonIds: [],
  barberId: "barber-1",
  date: WED,
  startMin: hm(12),
  name: "Sam Smith",
  email: "ignored@example.com",
  phone: "07700900000",
  notes: "",
  ...p,
});

const u1 = viewer({ userId: "u1", email: "u1@example.com" });
const u2 = viewer({ userId: "u2", email: "u2@example.com" });

const seed = async (p: { date: string; startMin: number; userId: string; serviceId?: string; membershipId?: string }) =>
{
  const r = await insertBooking({
    date: p.date,
    startMin: p.startMin,
    endMin: p.startMin + 30,
    barberId: "barber-1",
    serviceId: p.serviceId ?? "haircut",
    addonIds: [],
    name: "S",
    email: "e@x.co",
    phone: "07700900000",
    notes: "",
    totalGBP: 20,
    userId: p.userId,
    membershipId: p.membershipId ?? null,
  });
  return r === "limit" || r === "duplicate" ? "conflict" : r;
};

async function book(v = u1, p: Partial<CreateBookingInput> = {}) {
  const r = await createBooking(input(p), NOW, v);
  assert.ok(r.ok, JSON.stringify(r));
  const row = (await listBookingsForDate(r.booking.date)).find(
    (b) => b.reference === r.booking.reference,
  );
  assert.ok(row);
  return { ref: r.booking, id: row.id };
}

describe("membership booking rules", () => {
  beforeEach(resetStore);

  test("membership service requires an active matching membership", async () => {
    const none = await createBooking(input({ serviceId: "core" }), NOW, u1);
    assert.ok(!none.ok && none.code === "membership" && /Members only/.test(none.error), JSON.stringify(none));
    const wrong = await createBooking(
      input({ serviceId: "plus" }),
      NOW,
      viewer({ membership: member("core") }),
    );
    assert.ok(!wrong.ok && wrong.code === "membership", JSON.stringify(wrong));
    const expired = await createBooking(
      input({ serviceId: "core" }),
      NOW,
      viewer({ membership: member("core", { startsOn: "2026-09-01", endsOn: "2026-10-01" }) }),
    );
    assert.ok(!expired.ok && expired.code === "membership" && /ended/.test(expired.error));
    assert.equal((await listBookingsForDate(WED)).length, 0);
  });

  test("member cut is free, stores membershipId; premium add-ons are free", async () => {
    const v = viewer({ userId: "u1", membership: member("premium") });
    const r = await createBooking(
      input({ serviceId: "premium", addonIds: ["hot-towel", "filler"] }),
      NOW,
      v,
    );
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(r.booking.totalGBP, 0);
    const [row] = await listBookingsForDate(WED);
    assert.equal(row.membershipId, "mem-1");
    assert.equal(row.userId, "u1");
  });

  test("a date after membership.endsOn is rejected, the end day itself is fine", async () => {
    const v = viewer({ membership: member("core", { endsOn: "2026-11-19" }) });
    const late = await createBooking(input({ serviceId: "core", date: "2026-11-20" }), NOW, v);
    assert.ok(!late.ok && late.code === "membership" && /ends on/.test(late.error), JSON.stringify(late));
    const ok = await createBooking(input({ serviceId: "core", date: "2026-11-19" }), NOW, v);
    assert.ok(ok.ok, JSON.stringify(ok));
  });

  test("getSlots: members only, empty past the end date", async () => {
    const q = { date: WED, serviceId: "core", addonIds: [], barberId: "any" };
    assert.deepEqual(await getSlots(q, NOW), { ok: false, error: "Members only." });
    assert.deepEqual(await getSlots(q, NOW, u1), { ok: false, error: "Members only." });
    const v = viewer({ membership: member("core", { endsOn: "2026-11-17" }) });
    assert.deepEqual(await getSlots(q, NOW, v), { ok: true, slots: [] });
    const r = await getSlots(q, NOW, viewer({ membership: member("core") }));
    assert.ok(r.ok && r.slots.length > 0);
  });

  test("only one upcoming member cut at a time", async () => {
    const v = viewer({ userId: "u1", membership: member("core") });
    assert.ok((await createBooking(input({ serviceId: "core" }), NOW, v)).ok);
    const second = await createBooking(input({ serviceId: "core", startMin: hm(14) }), NOW, v);
    assert.ok(!second.ok && second.code === "limit", JSON.stringify(second));
    // A paid one-off is still allowed.
    assert.ok((await createBooking(input({ startMin: hm(15) }), NOW, v)).ok);
    // Cancelling frees the allowance.
    const row = (await listBookingsForDate(WED)).find((b) => b.serviceId === "core");
    assert.ok(row);
    assert.ok((await cancelMyBooking(v, row.id, NOW)).ok);
    assert.ok((await createBooking(input({ serviceId: "core", startMin: hm(14) }), NOW, v)).ok);
  });

  test("a member cut that already started does not count", async () => {
    const v = viewer({ userId: "u1", membership: member("core") });
    await seed({ date: "2026-11-17", startMin: hm(9), userId: "u1", serviceId: "core", membershipId: "mem-1" });
    assert.ok((await createBooking(input({ serviceId: "core" }), NOW, v)).ok);
  });

  test("at most 3 upcoming bookings in total", async () => {
    for (const h of [12, 13, 14]) await book(u1, { startMin: hm(h) });
    const r = await createBooking(input({ startMin: hm(15) }), NOW, u1);
    assert.ok(!r.ok && r.code === "limit", JSON.stringify(r));
    // Another account is unaffected.
    assert.ok((await createBooking(input({ startMin: hm(15) }), NOW, u2)).ok);
  });
});

describe("cancel", () => {
  beforeEach(resetStore);

  test("ok when >= 24h away; moves to past; frees the slot", async () => {
    const { id } = await book(u1);
    assert.deepEqual(await cancelMyBooking(u1, id, NOW), { ok: true });
    const { upcoming, past } = await listMyBookings(u1, NOW);
    assert.equal(upcoming.length, 0);
    assert.equal(past[0].status, "cancelled");
    assert.equal((await listBookingsForDate(WED)).length, 0);
    assert.ok((await createBooking(input(), NOW, u2)).ok);
    const again = await cancelMyBooking(u1, id, NOW);
    assert.ok(!again.ok && again.code === "not_active");
  });

  test("too_late within 24h of the start", async () => {
    const row = await seed({ date: "2026-11-18", startMin: hm(9), userId: "u1" });
    assert.notEqual(row, "conflict");
    if (row === "conflict") return;
    const r = await cancelMyBooking(u1, row.id, NOW); // 23h away
    assert.ok(!r.ok && r.code === "too_late" && /24 hours/.test(r.error), JSON.stringify(r));
    assert.equal((await getBookingForUser("u1", row.id))?.status, "confirmed");
  });

  test("not_found for another user's or a bogus booking", async () => {
    const { id } = await book(u1);
    const r = await cancelMyBooking(u2, id, NOW);
    assert.ok(!r.ok && r.code === "not_found");
    assert.ok(!(await cancelMyBooking(u2, "nope", NOW)).ok);
    assert.equal((await getBookingForUser("u1", id))?.status, "confirmed");
  });

  test("listMyBookings flags", async () => {
    const { id } = await book(u1);
    const { upcoming } = await listMyBookings(u1, NOW);
    assert.equal(upcoming.length, 1);
    assert.equal(upcoming[0].id, id);
    assert.equal(upcoming[0].canSelfServe, true);
    assert.equal(upcoming[0].serviceName, "Haircut");
    assert.equal(upcoming[0].barberName, "Wayne Graham");
    assert.equal(upcoming[0].isMemberCut, false);
    assert.equal((await listMyBookings(u2, NOW)).upcoming.length, 0);
  });
});

describe("reschedule", () => {
  beforeEach(resetStore);

  test("ok: moves the booking, price/duration unchanged", async () => {
    const { id } = await book(u1, { addonIds: ["hot-towel"] });
    const r = await rescheduleMyBooking(
      u1,
      { bookingId: id, date: THU, startMin: hm(15), barberId: "barber-2" },
      NOW,
    );
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(r.booking.date, THU);
    assert.equal(r.booking.startMin, hm(15));
    assert.equal(r.booking.endMin, hm(15, 30));
    assert.equal(r.booking.barberId, "barber-2");
    assert.equal(r.booking.totalGBP, 25);
    assert.equal((await listBookingsForDate(WED)).length, 0);
    assert.equal((await listBookingsForDate(THU)).length, 1);
  });

  test("own old slot is usable (overlapping shift) and offered by getRescheduleSlots", async () => {
    const { id } = await book(u1);
    const slots = await getRescheduleSlots(u1, { bookingId: id, date: WED, barberId: "barber-1" }, NOW);
    assert.ok(slots.ok && slots.slots.some((s) => s.startMin === hm(12)));
    assert.ok(slots.ok && slots.slots.some((s) => s.startMin === hm(12, 15)));
    const move = { bookingId: id, date: WED, startMin: hm(12, 15), barberId: "barber-1" };
    assert.ok((await rescheduleMyBooking(u1, move, NOW)).ok);
    assert.ok((await rescheduleMyBooking(u1, move, NOW)).ok, "same slot again");
  });

  test("slot_taken when someone else holds it", async () => {
    const { id } = await book(u1);
    await book(u2, { date: THU, startMin: hm(15) });
    const to = { bookingId: id, date: THU, startMin: hm(15) };
    const r = await rescheduleMyBooking(u1, { ...to, barberId: "barber-1" }, NOW);
    assert.ok(!r.ok && r.code === "slot_taken", JSON.stringify(r));
    assert.equal((await getBookingForUser("u1", id))?.date, WED);
    // 'any' falls through to the free barber.
    const any = await rescheduleMyBooking(u1, { ...to, barberId: "any" }, NOW);
    assert.ok(any.ok && any.booking.barberId === "barber-2", JSON.stringify(any));
  });

  test("too_late is measured against the original start", async () => {
    const row = await seed({ date: "2026-11-18", startMin: hm(9), userId: "u1" });
    if (row === "conflict") throw new Error("setup");
    const r = await rescheduleMyBooking(
      u1,
      { bookingId: row.id, date: THU, startMin: hm(15), barberId: "barber-1" },
      NOW,
    );
    assert.ok(!r.ok && r.code === "too_late", JSON.stringify(r));
    const s = await getRescheduleSlots(u1, { bookingId: row.id, date: THU, barberId: "any" }, NOW);
    assert.equal(s.ok, false);
  });

  test("not_found for someone else's booking; invalid / unavailable inputs", async () => {
    const { id } = await book(u1);
    const mv = (p: Record<string, unknown>, v = u1) =>
      rescheduleMyBooking(v, { bookingId: id, date: THU, startMin: hm(15), barberId: "any", ...p }, NOW);
    const other = await mv({}, u2);
    assert.ok(!other.ok && other.code === "not_found");
    const bad = await mv({ startMin: 1.5 });
    assert.ok(!bad.ok && bad.code === "invalid");
    const nobody = await mv({ barberId: "x" });
    assert.ok(!nobody.ok && nobody.code === "invalid");
    const closed = await mv({ date: "2026-11-23" });
    assert.ok(!closed.ok && closed.code === "unavailable");
    const offstep = await mv({ startMin: hm(15, 5) });
    assert.ok(!offstep.ok && offstep.code === "unavailable");
    assert.ok(!(await rescheduleMyBooking(u1, null, NOW)).ok);
  });

  test("member cut cannot move past the membership end date", async () => {
    const v = viewer({ userId: "u1", membership: member("core", { endsOn: "2026-11-19" }) });
    const { id } = await book(v, { serviceId: "core" });
    const late = await rescheduleMyBooking(
      v,
      { bookingId: id, date: "2026-11-20", startMin: hm(15), barberId: "any" },
      NOW,
    );
    assert.ok(!late.ok && late.code === "membership", JSON.stringify(late));
    const slots = await getRescheduleSlots(v, { bookingId: id, date: "2026-11-20", barberId: "any" }, NOW);
    assert.deepEqual(slots, { ok: true, slots: [] });
    const ok = await rescheduleMyBooking(
      v,
      { bookingId: id, date: THU, startMin: hm(15), barberId: "any" },
      NOW,
    );
    assert.ok(ok.ok && ok.booking.isMemberCut && ok.booking.totalGBP === 0, JSON.stringify(ok));
  });

  test("atomic: a conflicting update leaves the original booking intact", async () => {
    const { id } = await book(u1);
    await book(u2, { date: THU, startMin: hm(15) });
    const res = await rescheduleBookingRow("u1", id, {
      date: THU,
      startMin: hm(15, 15),
      endMin: hm(15, 45),
      barberId: "barber-1",
    });
    assert.equal(res, "conflict");
    const b = await getBookingForUser("u1", id);
    assert.equal(b?.date, WED);
    assert.equal(b?.startMin, hm(12));
    const foreign = await rescheduleBookingRow("u2", id, {
      date: THU,
      startMin: hm(18),
      endMin: hm(18, 30),
      barberId: "barber-1",
    });
    assert.equal(foreign, "not_found");
  });
});

describe("memberships", () => {
  beforeEach(resetStore);

  test("subscribeToPlan ok: 30-day period starting today", async () => {
    const r = await subscribeToPlan({ userId: "u1" }, "plus", "2026-11-17");
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(r.membership.plan, "plus");
    assert.equal(r.membership.startsOn, "2026-11-17");
    assert.equal(r.membership.endsOn, "2026-12-16");
    const o = await getMembershipOverview({ userId: "u1" }, "2026-11-17");
    assert.equal(o.current?.id, r.membership.id);
    assert.equal(o.past.length, 0);
    assert.equal((await getMembershipOverview({ userId: "u2" }, "2026-11-17")).current, null);
  });

  test("already_member while a period is active", async () => {
    assert.ok((await subscribeToPlan({ userId: "u1" }, "core", "2026-11-17")).ok);
    const r = await subscribeToPlan({ userId: "u1" }, "plus", "2026-11-20");
    assert.ok(!r.ok && r.code === "already_member");
    // Once it has ended, a new one is allowed and the old one is in the past.
    const later = await subscribeToPlan({ userId: "u1" }, "plus", "2026-12-17");
    assert.ok(later.ok, JSON.stringify(later));
    const o = await getMembershipOverview({ userId: "u1" }, "2026-12-17");
    assert.equal(o.current?.plan, "plus");
    assert.equal(o.past.length, 1);
  });

  test("invalid plans: unknown, one-off service, non-string", async () => {
    for (const p of ["bogus", "haircut", 5, null, undefined]) {
      const r = await subscribeToPlan({ userId: "u1" }, p, "2026-11-17");
      assert.ok(!r.ok && r.code === "invalid", String(p));
    }
  });
});
