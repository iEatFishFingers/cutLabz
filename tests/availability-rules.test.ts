import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots } from "../lib/availability";
import { seedCatalog, type Hours, type ServerCatalog, type TimeOff } from "../lib/catalog";
import { isOpenDay } from "../lib/booking-shared";
import { booking, hm } from "./helpers";

// 2026-11-17 is a Tuesday.
const NOW = { date: "2026-11-17", min: hm(9) };
const WED = "2026-11-18";
const SAT = "2026-11-21";
const SUN = "2026-11-22";
const MON = "2026-11-23";
const FULL = { open: hm(11), close: hm(21) };

type Hrs = { "barber-1"?: Hours; "barber-2"?: Hours };

function cat(hours: Hrs, timeOff: TimeOff[] = []): ServerCatalog {
  return {
    ...seedCatalog,
    barbers: seedCatalog.barbers.map((b) => ({
      ...b,
      hours: hours[b.id as keyof Hrs] ?? b.hours,
    })),
    timeOff,
  };
}

function run(
  catalog: ServerCatalog,
  o: {
    date: string;
    barberId?: string;
    durationMin?: number;
    bookings?: ReturnType<typeof booking>[];
    now?: { date: string; min: number };
  },
) {
  return computeSlots({
    date: o.date,
    durationMin: o.durationMin ?? 30,
    barberId: o.barberId ?? "any",
    bookings: o.bookings ?? [],
    now: o.now ?? NOW,
    catalog,
  });
}
const starts = (slots: { startMin: number }[]) => slots.map((s) => s.startMin);
const off = (barberId: string, startDate: string, endDate: string): TimeOff => ({
  barberId,
  startDate,
  endDate,
});

describe("per-barber hours", () => {
  // Barber 2 only works Saturday; barber 1 keeps the seed Tue-Sat hours.
  const sat2 = cat({ "barber-2": { 6: [FULL] } });

  test("barber 2 works Sat only: 'any' returns only the working barber's slots", () => {
    const wed = run(sat2, { date: WED });
    assert.ok(wed.length > 0);
    assert.ok(wed.every((s) => s.barberIds.join() === "barber-1"));
    assert.deepEqual(run(sat2, { date: WED, barberId: "barber-2" }), []);
    assert.deepEqual(run(sat2, { date: SAT })[0].barberIds, ["barber-1", "barber-2"]);
  });

  test("only barber 2 working on a day -> 'any' lists only barber 2", () => {
    const c = cat({ "barber-1": { 6: [] }, "barber-2": { 6: [FULL] } });
    const slots = run(c, { date: SAT });
    assert.ok(slots.length > 0);
    assert.ok(slots.every((s) => s.barberIds.join() === "barber-2"));
  });

  test("isOpenDay is true when any barber works that weekday", () => {
    const c = cat({ "barber-1": { 6: [] }, "barber-2": { 6: [FULL] } });
    assert.equal(isOpenDay(c, SAT), true);
    assert.equal(isOpenDay(c, SUN), false);
    assert.equal(isOpenDay(cat({ "barber-1": {}, "barber-2": {} }), SAT), false);
  });

  test("closed weekday returns []", () => {
    assert.deepEqual(run(seedCatalog, { date: MON }), []);
    assert.deepEqual(run(seedCatalog, { date: SUN, barberId: "barber-1" }), []);
  });

  test("unknown barberId returns []", () => {
    assert.deepEqual(run(seedCatalog, { date: WED, barberId: "barber-9" }), []);
  });

  test("different hours per barber shift the slot range", () => {
    const c = cat({
      "barber-1": { 3: [{ open: hm(9), close: hm(12) }] },
      "barber-2": { 3: [{ open: hm(10), close: hm(13) }] },
    });
    const slots = run(c, { date: WED });
    assert.equal(slots[0].startMin, hm(9));
    assert.deepEqual(slots[0].barberIds, ["barber-1"]);
    assert.deepEqual(slots.find((s) => s.startMin === hm(10))?.barberIds, ["barber-1", "barber-2"]);
    assert.equal(slots.at(-1)!.startMin, hm(12, 30));
    assert.deepEqual(slots.at(-1)!.barberIds, ["barber-2"]);
  });
});

describe("split windows", () => {
  const lunch = cat({
    "barber-1": { 3: [{ open: hm(10), close: hm(13) }, { open: hm(14), close: hm(18) }] },
  });

  test("no starts inside the lunch gap; a service fits entirely inside one window", () => {
    const s = starts(run(lunch, { date: WED, barberId: "barber-1", durationMin: 60 }));
    assert.ok(s.includes(hm(12)), "12:00-13:00 fits exactly");
    assert.ok(!s.includes(hm(12, 15)), "would run into the gap");
    assert.ok(!s.includes(hm(13)));
    assert.ok(!s.includes(hm(13, 30)));
    assert.ok(s.includes(hm(14)));
    assert.ok(s.includes(hm(17)));
    assert.ok(!s.includes(hm(17, 15)));
  });

  test("a long service never straddles the gap", () => {
    const s = starts(run(lunch, { date: WED, barberId: "barber-1", durationMin: 120 }));
    assert.ok(s.includes(hm(10)) && s.includes(hm(11)));
    assert.ok(!s.includes(hm(11, 15)));
    assert.ok(s.includes(hm(14)) && s.includes(hm(16)));
    assert.ok(!s.includes(hm(16, 15)));
  });

  test("'any' only lists a barber for starts inside that barber's window", () => {
    const c = cat({
      "barber-1": { 3: [{ open: hm(10), close: hm(13) }, { open: hm(14), close: hm(18) }] },
      "barber-2": { 3: [{ open: hm(10), close: hm(18) }] },
    });
    const slots = run(c, { date: WED });
    assert.deepEqual(slots.find((s) => s.startMin === hm(13))?.barberIds, ["barber-2"]);
    assert.deepEqual(slots.find((s) => s.startMin === hm(13, 30))?.barberIds, ["barber-2"]);
    assert.deepEqual(slots.find((s) => s.startMin === hm(14))?.barberIds, ["barber-1", "barber-2"]);
  });
});

describe("time off", () => {
  const c = cat({}, [off("barber-1", "2026-11-19", "2026-11-21")]); // Thu-Sat

  test("inclusive on start and end; day before is fine", () => {
    for (const d of ["2026-11-19", "2026-11-20", "2026-11-21"]) {
      assert.deepEqual(run(c, { date: d, barberId: "barber-1" }), [], d);
    }
    assert.ok(run(c, { date: WED, barberId: "barber-1" }).length > 0, "day before");
  });

  test("the day after the end date is fine", () => {
    const sunOpen = cat({ "barber-1": { 0: [FULL], 6: [FULL] } }, [off("barber-1", "2026-11-19", SAT)]);
    assert.deepEqual(run(sunOpen, { date: SAT, barberId: "barber-1" }), []);
    assert.ok(run(sunOpen, { date: SUN, barberId: "barber-1" }).length > 0, "day after");
  });

  test("single-day time off", () => {
    const one = cat({}, [off("barber-1", WED, WED)]);
    assert.deepEqual(run(one, { date: WED, barberId: "barber-1" }), []);
    assert.ok(run(one, { date: "2026-11-19", barberId: "barber-1" }).length > 0);
  });

  test("only affects that barber: 'any' still returns the other", () => {
    const slots = run(c, { date: SAT });
    assert.ok(slots.length > 0);
    assert.ok(slots.every((s) => s.barberIds.join() === "barber-2"));
    assert.ok(run(c, { date: SAT, barberId: "barber-2" }).length > 0);
  });

  test("explicit barber on leave -> none; both on leave -> none for 'any'", () => {
    assert.deepEqual(run(c, { date: SAT, barberId: "barber-1" }), []);
    const both = cat({}, [off("barber-1", SAT, SAT), off("barber-2", SAT, SAT)]);
    assert.deepEqual(run(both, { date: SAT }), []);
  });

  test("time off for an unrelated barber id is ignored", () => {
    assert.ok(run(cat({}, [off("barber-9", WED, WED)]), { date: WED }).length > 0);
  });
});

describe("notice, past dates and overlap with the seed catalog", () => {
  test("minimum notice and past dates still hide times", () => {
    const now = { date: "2026-11-17", min: hm(13) };
    assert.equal(run(seedCatalog, { date: now.date, now })[0].startMin, hm(14));
    assert.deepEqual(run(seedCatalog, { date: "2026-11-16" }), []);
  });

  test("bookings only block the same barber", () => {
    const bookings = [booking({ date: WED, startMin: hm(12), endMin: hm(13), barberId: "barber-1" })];
    const slots = run(seedCatalog, { date: WED, bookings });
    assert.deepEqual(slots.find((s) => s.startMin === hm(12))?.barberIds, ["barber-2"]);
    assert.deepEqual(slots.find((s) => s.startMin === hm(13))?.barberIds, ["barber-1", "barber-2"]);
    assert.equal(
      run(seedCatalog, { date: WED, barberId: "barber-1", bookings }).find((s) => s.startMin === hm(12)),
      undefined,
    );
  });
});

describe("duration with add-on minutes", () => {
  test("a longer duration (service + extraMin) moves the last start earlier", () => {
    const s30 = run(seedCatalog, { date: WED, durationMin: 30 }).at(-1)!.startMin;
    const s70 = run(seedCatalog, { date: WED, durationMin: 70 }).at(-1)!.startMin;
    assert.equal(s30, hm(20, 30));
    assert.equal(s70, hm(19, 45)); // 19:45 + 70 = 20:55 <= 21:00
  });
});
