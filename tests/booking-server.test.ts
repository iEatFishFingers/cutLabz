import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createBooking, getSlots } from "../lib/booking-server";
import { listBookingsForDate } from "../lib/store";
import type { CreateBookingInput } from "../lib/booking-shared";
import { hm, resetStore } from "./helpers";

// Tuesday 2026-11-17, 10:00 London.
const NOW = { date: "2026-11-17", min: hm(10) };
const WED = "2026-11-18";

const input = (p: Partial<CreateBookingInput> & Record<string, unknown> = {}): CreateBookingInput => ({
  serviceId: "haircut",
  addonIds: [],
  barberId: "barber-1",
  date: WED,
  startMin: hm(12),
  name: "  Sam   Smith ",
  email: " Sam@Example.COM ",
  phone: "+44 7700 900000",
  notes: " fade please ",
  ...p,
});

async function expectFail(p: Parameters<typeof input>[0] | unknown, code: string, now = NOW) {
  const r = await createBooking(
    typeof p === "object" && p !== null && !Array.isArray(p) ? input(p as Partial<CreateBookingInput>) : p,
    now,
  );
  assert.equal(r.ok, false, JSON.stringify(r));
  if (!r.ok) assert.equal(r.code, code, r.error);
  return r;
}

describe("createBooking", () => {
  beforeEach(resetStore);

  test("happy path returns a confirmed booking with a reference", async () => {
    const r = await createBooking(input({ addonIds: ["hot-towel"] }), NOW);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const b = r.booking;
    assert.match(b.reference, /^CL-[0-9A-F]{6}$/);
    assert.equal(b.barberId, "barber-1");
    assert.equal(b.barberName, "Barber One");
    assert.equal(b.durationMin, 40);
    assert.equal(b.startMin, hm(12));
    assert.equal(b.endMin, hm(12, 40));
    assert.equal(b.totalGBP, 25);
    assert.deepEqual(b.addonIds, ["hot-towel"]);

    const [row] = await listBookingsForDate(WED);
    assert.equal(row.name, "Sam Smith");
    assert.equal(row.email, "sam@example.com");
    assert.equal(row.notes, "fade please");
    assert.equal(b.reference, `CL-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`);
  });

  test("double-booking the same barber/slot returns slot_taken", async () => {
    assert.equal((await createBooking(input(), NOW)).ok, true);
    await expectFail({}, "slot_taken");
    // Overlapping (not identical) start is also taken.
    await expectFail({ startMin: hm(12, 15) }, "slot_taken");
    // Adjacent is fine.
    assert.equal((await createBooking(input({ startMin: hm(12, 30) }), NOW)).ok, true);
  });

  test("'any' assigns the free barber, then slot_taken when both are busy", async () => {
    const first = await createBooking(input({ barberId: "any" }), NOW);
    assert.ok(first.ok && first.booking.barberId === "barber-1", JSON.stringify(first));
    const second = await createBooking(input({ barberId: "any" }), NOW);
    assert.ok(second.ok && second.booking.barberId === "barber-2", JSON.stringify(second));
    await expectFail({ barberId: "any" }, "slot_taken");
  });

  test("'any' prefers the barber with fewer bookings that day", async () => {
    assert.equal((await createBooking(input({ startMin: hm(15) }), NOW)).ok, true); // barber-1 busy later
    const r = await createBooking(input({ barberId: "any", startMin: hm(12) }), NOW);
    assert.ok(r.ok && r.booking.barberId === "barber-2", JSON.stringify(r));
  });

  test("'any' skips a barber whose specific booking took the slot", async () => {
    assert.equal((await createBooking(input({ barberId: "barber-1" }), NOW)).ok, true);
    const r = await createBooking(input({ barberId: "any" }), NOW);
    assert.ok(r.ok && r.booking.barberId === "barber-2");
  });

  test("price comes from the catalog, never the client", async () => {
    const r = await createBooking(
      { ...input({ serviceId: "premium", addonIds: ["hot-towel", "wash-dry", "hot-towel"] }), totalGBP: 1, durationMin: 5 } as CreateBookingInput,
      NOW,
    );
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.booking.totalGBP, 0, "premium add-ons are free");
    assert.equal(r.booking.durationMin, 80);
    assert.deepEqual(r.booking.addonIds, ["hot-towel", "wash-dry"], "de-duped");

    const r2 = await createBooking(
      { ...input({ serviceId: "haircut-beard", addonIds: ["mask-steam", "filler"], barberId: "barber-2" }), totalGBP: 0 } as CreateBookingInput,
      NOW,
    );
    assert.ok(r2.ok && r2.booking.totalGBP === 35 && r2.booking.durationMin === 55, JSON.stringify(r2));
  });

  test("bad email returns invalid with fieldErrors", async () => {
    const r = await expectFail({ email: "nope" }, "invalid");
    if (!r.ok) assert.ok(r.fieldErrors?.email);
  });

  test("validation codes", async () => {
    await expectFail({ date: "2026-11-22" }, "unavailable"); // Sunday
    await expectFail({ date: "2026-11-23" }, "unavailable"); // Monday
    await expectFail({ date: "2026-12-15" }, "unavailable"); // outside 28-day window
    await expectFail({ date: "2026-11-14" }, "unavailable"); // past date
    await expectFail({ date: "2026-11-17", startMin: hm(10, 30) }, "unavailable"); // too soon today
    await expectFail({ date: "2026-11-17", startMin: hm(10) }, "unavailable"); // now
    await expectFail({ startMin: hm(12, 5) }, "unavailable"); // off-step
    await expectFail({ startMin: hm(20, 45) }, "unavailable"); // runs past close
    await expectFail({ startMin: hm(10) }, "unavailable"); // before open
    await expectFail({ serviceId: "bogus" }, "invalid");
    await expectFail({ addonIds: ["bogus"] }, "invalid");
    await expectFail({ barberId: "barber-9" }, "invalid");
    await expectFail({ date: "2026-02-30" }, "invalid");
    await expectFail({ startMin: 720.5 }, "invalid");
    await expectFail({ startMin: "720" as unknown as number }, "invalid");
    await expectFail({ startMin: Number.NaN }, "invalid");
    await expectFail({ addonIds: Array(11).fill("filler") }, "invalid");
    await expectFail({ addonIds: "hot-towel" as unknown as string[] }, "invalid");
    await expectFail({ name: 42 as unknown as string }, "invalid");
    await expectFail(null, "invalid");
    await expectFail("x", "invalid");
    assert.equal((await listBookingsForDate(WED)).length, 0);
  });

  test("same-day booking beyond the notice period works", async () => {
    const r = await createBooking(input({ date: "2026-11-17", startMin: hm(11) }), NOW);
    assert.ok(r.ok, JSON.stringify(r));
  });
});

describe("getSlots", () => {
  beforeEach(resetStore);

  test("'any' returns the union of free barbers", async () => {
    await createBooking(input({ barberId: "barber-1", startMin: hm(12) }), NOW);
    const r = await getSlots({ date: WED, serviceId: "haircut", addonIds: [], barberId: "any" }, NOW);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.slots.find((s) => s.startMin === hm(12))?.barberIds, ["barber-2"]);
    assert.deepEqual(r.slots.find((s) => s.startMin === hm(13))?.barberIds, ["barber-1", "barber-2"]);

    const one = await getSlots({ date: WED, serviceId: "haircut", addonIds: [], barberId: "barber-1" }, NOW);
    assert.ok(one.ok && !one.slots.some((s) => s.startMin === hm(12)));
  });

  test("duration includes add-ons (affects last slot)", async () => {
    const r = await getSlots({ date: WED, serviceId: "premium", addonIds: ["hot-towel"], barberId: "any" }, NOW);
    assert.ok(r.ok && r.slots.at(-1)?.startMin === hm(19, 45)); // 70 min -> 19:45 + 70 = 20:55
  });

  test("closed or out-of-window dates give empty slots", async () => {
    const closed = await getSlots({ date: "2026-11-22", serviceId: "core", addonIds: [], barberId: "any" }, NOW);
    assert.deepEqual(closed, { ok: true, slots: [] });
    const far = await getSlots({ date: "2027-01-05", serviceId: "core", addonIds: [], barberId: "any" }, NOW);
    assert.deepEqual(far, { ok: true, slots: [] });
  });

  test("invalid ids or shapes give an error", async () => {
    const bad = [
      { date: WED, serviceId: "bogus", addonIds: [], barberId: "any" },
      { date: WED, serviceId: "core", addonIds: ["bogus"], barberId: "any" },
      { date: WED, serviceId: "core", addonIds: [], barberId: "nobody" },
      { date: "18/11/2026", serviceId: "core", addonIds: [], barberId: "any" },
      null,
      [],
    ];
    for (const b of bad) {
      const r = await getSlots(b, NOW);
      assert.equal(r.ok, false, JSON.stringify(b));
    }
  });
});
