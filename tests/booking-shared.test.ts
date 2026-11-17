import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  isInWindow,
  isOpenDay,
  isValidDateString,
  quote,
  shopNow,
  validateDetails,
  windowDates,
} from "../lib/booking-shared";
import { seedCatalog as C } from "../lib/catalog";

describe("booking-shared", () => {
  test("shopNow in BST (summer) is UTC+1", () => {
    assert.deepEqual(shopNow(new Date("2026-07-01T10:30:00Z")), { date: "2026-07-01", min: 11 * 60 + 30 });
  });

  test("shopNow in GMT (winter) is UTC", () => {
    assert.deepEqual(shopNow(new Date("2026-12-01T10:30:00Z")), { date: "2026-12-01", min: 10 * 60 + 30 });
  });

  test("shopNow rolls the date over at London midnight in BST", () => {
    assert.deepEqual(shopNow(new Date("2026-07-01T23:15:00Z")), { date: "2026-07-02", min: 15 });
  });

  test("addDays crosses month and year ends", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });

  test("isValidDateString", () => {
    assert.equal(isValidDateString("2026-11-17"), true);
    assert.equal(isValidDateString("2026-02-30"), false);
    assert.equal(isValidDateString("2026-13-01"), false);
    assert.equal(isValidDateString("2026-1-01"), false);
    assert.equal(isValidDateString("nope"), false);
  });

  test("window is 28 days starting today", () => {
    const w = windowDates("2026-11-17");
    assert.equal(w.length, 28);
    assert.equal(w[0], "2026-11-17");
    assert.equal(w.at(-1), "2026-12-14");
    assert.equal(isInWindow("2026-12-14", "2026-11-17"), true);
    assert.equal(isInWindow("2026-12-15", "2026-11-17"), false);
    assert.equal(isInWindow("2026-11-16", "2026-11-17"), false);
  });

  test("isOpenDay: Tue-Sat open, Sun/Mon closed", () => {
    assert.equal(isOpenDay(C, "2026-11-17"), true);
    assert.equal(isOpenDay(C, "2026-11-21"), true);
    assert.equal(isOpenDay(C, "2026-11-22"), false);
    assert.equal(isOpenDay(C, "2026-11-23"), false);
  });

  test("quote: premium add-ons are free, others are charged, duplicates/unknown dropped", () => {
    assert.deepEqual(quote(C, "premium", ["hot-towel", "filler"]), { durationMin: 30, totalGBP: 0 });
    assert.deepEqual(quote(C, "haircut", ["hot-towel", "hot-towel", "bogus"]), { durationMin: 30, totalGBP: 25 });
    assert.equal(quote(C, "bogus", []), null);
  });

  test("quote: add-on extraMin is added to duration (custom catalog)", () => {
    const custom = {
      ...C,
      addons: C.addons.map((a) => (a.id === "hot-towel" ? { ...a, extraMin: 10 } : a.id === "filler" ? { ...a, extraMin: 5 } : a)),
    };
    assert.deepEqual(quote(custom, "premium", ["hot-towel", "filler"]), { durationMin: 45, totalGBP: 0 });
    assert.deepEqual(quote(custom, "haircut", ["hot-towel", "hot-towel"]), { durationMin: 40, totalGBP: 25 });
  });

  test("validateDetails", () => {
    const ok = { name: "Sam Smith", email: "sam@example.com", phone: "+44 7700 900000", notes: "" };
    assert.deepEqual(validateDetails(ok), {});
    const bad = validateDetails({ name: "S", email: "sam@", phone: "12", notes: "x".repeat(501) });
    assert.deepEqual(Object.keys(bad).sort(), ["email", "name", "notes", "phone"]);
  });
});
