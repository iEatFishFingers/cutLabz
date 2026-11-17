import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots, dayOfWeek, formatTime } from "../lib/availability";
import { booking, hm } from "./helpers";

// 2026-11-17 is a Tuesday.
const NOW = { date: "2026-11-17", min: hm(9) };
const WED = "2026-11-18";

const starts = (slots: { startMin: number }[]) => slots.map((s) => s.startMin);

describe("computeSlots", () => {
  test("day-of-week sanity", () => {
    assert.equal(dayOfWeek("2026-11-17"), 2);
    assert.equal(dayOfWeek("2026-11-22"), 0);
    assert.equal(dayOfWeek("2026-11-23"), 1);
  });

  test("closed days (Sun/Mon) return no slots", () => {
    for (const date of ["2026-11-22", "2026-11-23"]) {
      assert.deepEqual(
        computeSlots({ date, durationMin: 25, barberId: "any", bookings: [], now: NOW }),
        [],
      );
    }
  });

  test("past dates return no slots", () => {
    assert.deepEqual(
      computeSlots({ date: "2026-11-14", durationMin: 25, barberId: "any", bookings: [], now: NOW }),
      [],
    );
  });

  test("same day hides starts before now + 60 min", () => {
    const now = { date: "2026-11-17", min: hm(13, 10) };
    const slots = computeSlots({ date: now.date, durationMin: 25, barberId: "any", bookings: [], now });
    assert.equal(slots[0].startMin, hm(14, 15));
    assert.ok(slots.every((s) => s.startMin >= now.min + 60));
  });

  test("same day exactly on a step boundary keeps that start", () => {
    const now = { date: "2026-11-17", min: hm(13) };
    const slots = computeSlots({ date: now.date, durationMin: 25, barberId: "any", bookings: [], now });
    assert.equal(slots[0].startMin, hm(14));
  });

  test("same day after closing returns nothing", () => {
    const now = { date: "2026-11-17", min: hm(20, 30) };
    assert.deepEqual(
      computeSlots({ date: now.date, durationMin: 25, barberId: "any", bookings: [], now }),
      [],
    );
  });

  test("future open day starts at opening, 15-min steps", () => {
    const s = starts(computeSlots({ date: WED, durationMin: 25, barberId: "any", bookings: [], now: NOW }));
    assert.equal(s[0], hm(11));
    assert.equal(s[1], hm(11, 15));
  });

  test("end-of-day cutoff: 25 min -> last 20:30, 60 min -> last 20:00", () => {
    const s25 = starts(computeSlots({ date: WED, durationMin: 25, barberId: "any", bookings: [], now: NOW }));
    assert.equal(formatTime(s25.at(-1)!), "20:30");
    const s60 = starts(computeSlots({ date: WED, durationMin: 60, barberId: "any", bookings: [], now: NOW }));
    assert.equal(formatTime(s60.at(-1)!), "20:00");
  });

  test("overlap removes starts but keeps touching ones", () => {
    const bookings = [booking({ date: WED, startMin: hm(12), endMin: hm(12, 30), barberId: "barber-1" })];
    const s = starts(computeSlots({ date: WED, durationMin: 30, barberId: "barber-1", bookings, now: NOW }));
    assert.ok(s.includes(hm(11, 30)), "ends exactly at 12:00 -> allowed");
    assert.ok(!s.includes(hm(11, 45)));
    assert.ok(!s.includes(hm(12)));
    assert.ok(!s.includes(hm(12, 15)));
    assert.ok(s.includes(hm(12, 30)), "starts exactly at 12:30 -> allowed");
  });

  test("'any' returns the union with free barbers listed", () => {
    const bookings = [
      booking({ date: WED, startMin: hm(12), endMin: hm(12, 30), barberId: "barber-1" }),
      booking({ date: WED, startMin: hm(14), endMin: hm(14, 30), barberId: "barber-1" }),
      booking({ date: WED, startMin: hm(14), endMin: hm(14, 30), barberId: "barber-2" }),
    ];
    const slots = computeSlots({ date: WED, durationMin: 30, barberId: "any", bookings, now: NOW });
    const at = (m: number) => slots.find((s) => s.startMin === m);
    assert.deepEqual(at(hm(11))?.barberIds, ["barber-1", "barber-2"]);
    assert.deepEqual(at(hm(12))?.barberIds, ["barber-2"]);
    assert.equal(at(hm(14)), undefined, "both busy -> no slot");
  });

  test("a specific barber ignores other barbers' bookings", () => {
    const bookings = [booking({ date: WED, startMin: hm(12), endMin: hm(13), barberId: "barber-2" })];
    const slots = computeSlots({ date: WED, durationMin: 30, barberId: "barber-1", bookings, now: NOW });
    assert.ok(slots.some((s) => s.startMin === hm(12)));
    assert.ok(slots.every((s) => s.barberIds.length === 1 && s.barberIds[0] === "barber-1"));
  });

  test("bookings on other dates are ignored only if caller filters (store does)", () => {
    // computeSlots trusts its input list to be for `date` (listBookingsForDate).
    const slots = computeSlots({ date: WED, durationMin: 30, barberId: "barber-1", bookings: [], now: NOW });
    assert.equal(slots.length, (hm(21) - 30 - hm(11)) / 15 + 1);
  });
});
