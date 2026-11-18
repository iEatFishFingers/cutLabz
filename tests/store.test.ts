import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { insertBooking, listBookingsForDate, type Booking } from "../lib/store";
import { hm, resetStore } from "./helpers";

const base: Omit<Booking, "id" | "createdAt"> = {
  date: "2026-11-18",
  startMin: hm(12),
  endMin: hm(12, 30),
  barberId: "barber-1",
  serviceId: "haircut",
  addonIds: [],
  name: "A",
  email: "a@example.com",
  phone: "07700900000",
  notes: "",
  totalGBP: 20,
};

describe("store", () => {
  beforeEach(resetStore);

  test("insert returns a row with id + createdAt", async () => {
    const row = await insertBooking(base);
    assert.ok(typeof row === "object");
    assert.match(row.id, /^[0-9a-f-]{36}$/);
    assert.equal((await listBookingsForDate(base.date)).length, 1);
  });

  test("overlap for the same barber/date is a conflict", async () => {
    await insertBooking(base);
    assert.equal(await insertBooking({ ...base, startMin: hm(12, 15), endMin: hm(12, 45) }), "conflict");
    assert.equal(await insertBooking({ ...base, startMin: hm(11, 45), endMin: hm(12, 15) }), "conflict");
    assert.equal(await insertBooking({ ...base, startMin: hm(11), endMin: hm(13) }), "conflict");
  });

  test("different barber is allowed", async () => {
    await insertBooking(base);
    assert.notEqual(await insertBooking({ ...base, barberId: "barber-2" }), "conflict");
  });

  test("different date is allowed", async () => {
    await insertBooking(base);
    assert.notEqual(await insertBooking({ ...base, date: "2026-11-19" }), "conflict");
  });

  test("adjacent bookings (end == start) are allowed", async () => {
    await insertBooking(base);
    assert.notEqual(await insertBooking({ ...base, startMin: hm(12, 30), endMin: hm(13) }), "conflict");
    assert.notEqual(await insertBooking({ ...base, startMin: hm(11, 30), endMin: hm(12) }), "conflict");
  });
});
