import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { AdminSession } from "../lib/admin/auth";
import {
  checkTransition,
  getAttentionItems,
  markBookingContacted,
  searchAdminBookings,
} from "../lib/admin/bookings";
import {
  STATUSES,
  allowedStatusChanges,
  cancelledByOf,
  type BookingStatus,
} from "../lib/admin/bookings-shared";
import { addDays, shopNow } from "../lib/booking-shared";
import { DELETED_PHONE } from "../lib/store";

type Row = Record<string, unknown>;

/** Minimal supabase-js query-builder fake (eq/in/gte/lte/lt/is/ilike/order/limit/update). */
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      const order: [string, boolean][] = [];
      let lim = Infinity;
      const has = (r: Row, k: string) => r[k] !== null && r[k] !== undefined;
      const run = () => {
        let res = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) for (const r of res) Object.assign(r, patch);
        for (const [k, asc] of [...order].reverse())
          res = [...res].sort(
            (a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (asc ? 1 : -1),
          );
        return res.slice(0, lim);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {
        select: () => b,
        update: (p: Row) => ((patch = p), b),
        eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), b),
        in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), b),
        is: (k: string, v: null) => (filters.push((r) => (v === null ? !has(r, k) : r[k] === v)), b),
        gte: (k: string, v: string) => (filters.push((r) => has(r, k) && String(r[k]) >= v), b),
        lte: (k: string, v: string) => (filters.push((r) => has(r, k) && String(r[k]) <= v), b),
        lt: (k: string, v: string) => (filters.push((r) => has(r, k) && String(r[k]) < v), b),
        ilike: (k: string, p: string) => {
          const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "is");
          filters.push((r) => re.test(String(r[k] ?? "")));
          return b;
        },
        order: (k: string, o: { ascending: boolean }) => (order.push([k, o.ascending]), b),
        limit: (n: number) => ((lim = n), b),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: run(), error: null }).then(ok, bad),
      };
      return b;
    },
  };
}

const today = shopNow().date;
let n = 0;
const id = () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12, "0")}`;
const bk = (p: Row = {}): Row => ({
  id: id(),
  reference: "CL-AAAAAA",
  booking_date: addDays(today, 3),
  start_min: 600,
  end_min: 630,
  barber_id: "b1",
  service_id: "haircut",
  addon_ids: [],
  name: "Sam Smith",
  email: "sam@example.com",
  phone: "07700 900000",
  notes: "",
  total_pence: 2500,
  status: "confirmed",
  payment_status: "unpaid",
  status_changed_at: null,
  status_changed_by: null,
  contacted_at: null,
  ...p,
});

const rota = (extra: Record<string, Row[]> = {}) => ({
  barbers: [{ id: "b1", name: "Ali", active: true }],
  services: [{ id: "haircut", name: "Haircut" }],
  addons: [],
  availability: Array.from({ length: 7 }, (_, d) => ({
    barber_id: "b1",
    weekday: d,
    open_min: 540,
    close_min: 1020,
  })),
  time_off: [],
  ...extra,
});

const sessionOf = (tables: Record<string, Row[]>): AdminSession => ({
  userId: "u1",
  email: "boss@cutlabz.test",
  db: fakeDb(tables) as unknown as AdminSession["db"],
  barberId: null,
});

describe("allowedStatusChanges / checkTransition table", () => {
  const expected: Record<string, BookingStatus[]> = {
    "pending:true": ["completed", "no_show", "cancelled"],
    "confirmed:true": ["completed", "no_show", "cancelled"],
    "pending:false": ["cancelled"],
    "confirmed:false": ["cancelled"],
    "completed:true": ["no_show"],
    "completed:false": [],
    "no_show:true": ["completed"],
    "no_show:false": [],
    "cancelled:true": [],
    "cancelled:false": ["confirmed"],
  };
  test("every cell of the table, and checkTransition agrees", () => {
    for (const from of STATUSES)
      for (const started of [true, false]) {
        const allowed = allowedStatusChanges(from, started);
        assert.deepEqual([...allowed].sort(), [...expected[`${from}:${started}`]].sort(), `${from}:${started}`);
        for (const to of STATUSES)
          assert.equal(checkTransition(from, to, started).ok, allowed.includes(to), `${from}->${to}:${started}`);
      }
  });
  test("specific error messages", () => {
    const early = checkTransition("confirmed", "completed", false);
    assert.ok(!early.ok && /future booking/.test(early.error));
    const reopen = checkTransition("cancelled", "confirmed", true);
    assert.ok(!reopen.ok && reopen.error === "A booking that has already started can't be reopened.");
  });
});

describe("cancelledBy mapping", () => {
  test("customer / shop / null", () => {
    assert.equal(cancelledByOf("cancelled", "customer"), "customer");
    assert.equal(cancelledByOf("cancelled", "boss@cutlabz.test"), "shop");
    assert.equal(cancelledByOf("cancelled", null), null);
    assert.equal(cancelledByOf("cancelled", ""), null);
    assert.equal(cancelledByOf("confirmed", "boss@cutlabz.test"), null);
  });
});

describe("attention items", () => {
  test("unresolvedPast: started pending/confirmed within 45 days, oldest first", async () => {
    const old = bk({ booking_date: addDays(today, -10) });
    const newer = bk({ booking_date: addDays(today, -2), status: "pending" });
    const tooOld = bk({ booking_date: addDays(today, -60) });
    const done = bk({ booking_date: addDays(today, -5), status: "completed" });
    const future = bk({ booking_date: addDays(today, 2) });
    const s = sessionOf({ bookings: [newer, old, tooOld, done, future], ...rota() });
    const r = await getAttentionItems(s);
    assert.deepEqual(r.unresolvedPast.map((b) => b.id), [old.id, newer.id]);
    assert.equal(r.unresolvedPast[0].clash, null);
  });

  test("clashes: time off and outside hours, soonest first, within 28 days, active only", async () => {
    const off = addDays(today, 5);
    const leave = bk({ booking_date: off });
    const early = bk({ booking_date: addDays(today, 2), start_min: 480, end_min: 510 });
    const fine = bk({ booking_date: addDays(today, 3) });
    const far = bk({ booking_date: addDays(today, 40), start_min: 480, end_min: 510 });
    const cancelled = bk({ booking_date: addDays(today, 4), start_min: 480, end_min: 510, status: "cancelled" });
    const s = sessionOf({
      bookings: [leave, early, fine, far, cancelled],
      ...rota({ time_off: [{ barber_id: "b1", start_date: off, end_date: off }] }),
    });
    const r = await getAttentionItems(s);
    assert.deepEqual(r.clashes.map((b) => b.id), [early.id, leave.id]);
    assert.ok(r.clashes.every((b) => b.clash === true));
  });

  test("toContact: shop-cancelled, recent, not contacted, real phone, soonest first", async () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const stale = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const a = bk({ status: "cancelled", status_changed_by: "boss@x", status_changed_at: recent, booking_date: addDays(today, 6) });
    const b = bk({ status: "cancelled", status_changed_by: "boss@x", status_changed_at: recent, booking_date: addDays(today, 1) });
    const byCustomer = bk({ status: "cancelled", status_changed_by: "customer", status_changed_at: recent });
    const unknownWho = bk({ status: "cancelled", status_changed_by: null, status_changed_at: recent });
    const contacted = bk({ status: "cancelled", status_changed_by: "boss@x", status_changed_at: recent, contacted_at: recent });
    const old = bk({ status: "cancelled", status_changed_by: "boss@x", status_changed_at: stale });
    const anon = bk({ status: "cancelled", status_changed_by: "boss@x", status_changed_at: recent, phone: DELETED_PHONE });
    const s = sessionOf({ bookings: [a, b, byCustomer, unknownWho, contacted, old, anon], ...rota() });
    const r = await getAttentionItems(s);
    assert.deepEqual(r.toContact.map((x) => x.id), [b.id, a.id]);
    assert.equal(r.toContact[0].cancelledBy, "shop");
  });

  test("caps each list at 100", async () => {
    const many = Array.from({ length: 130 }, () => bk({ booking_date: addDays(today, -3) }));
    const r = await getAttentionItems(sessionOf({ bookings: many, ...rota() }));
    assert.equal(r.unresolvedPast.length, 100);
  });
});

describe("markBookingContacted", () => {
  const shopCancelled = () => bk({ status: "cancelled", status_changed_by: "boss@x" });
  test("stamps a shop-cancelled booking and is idempotent", async () => {
    const row = shopCancelled();
    const s = sessionOf({ bookings: [row] });
    assert.deepEqual(await markBookingContacted(s, row.id), { ok: true });
    const first = row.contacted_at;
    assert.ok(first);
    assert.deepEqual(await markBookingContacted(s, row.id), { ok: true });
    assert.equal(row.contacted_at, first);
  });
  test("refuses customer-cancelled, unknown-who, active, missing and bad ids", async () => {
    const cust = bk({ status: "cancelled", status_changed_by: "customer" });
    const unknown = bk({ status: "cancelled" });
    const active = bk();
    const s = sessionOf({ bookings: [cust, unknown, active] });
    for (const r of [cust, unknown, active]) {
      const res = await markBookingContacted(s, r.id);
      assert.equal(res.ok, false);
      assert.equal(r.contacted_at, null);
    }
    assert.deepEqual(await markBookingContacted(s, "aaaaaaaa-aaaa-4aaa-8aaa-ffffffffffff"), {
      ok: false,
      error: "Booking not found.",
    });
    assert.equal((await markBookingContacted(s, "nope")).ok, false);
    assert.equal((await markBookingContacted(s, 5)).ok, false);
  });
});

describe("search truncation and clash", () => {
  test("truncated only when more than 25 match; clash set for upcoming, null for past", async () => {
    const upClash = bk({ name: "Zed Clash", booking_date: addDays(today, 4), start_min: 480, end_min: 510 });
    const upFine = bk({ name: "Zed Fine", booking_date: addDays(today, 5) });
    const upCancelled = bk({ name: "Zed Gone", status: "cancelled", booking_date: addDays(today, 6), start_min: 480, end_min: 510 });
    const past = bk({ name: "Zed Past", booking_date: addDays(today, -4), start_min: 480, end_min: 510 });
    const s = sessionOf({ bookings: [upClash, upFine, upCancelled, past], ...rota() });
    const r = await searchAdminBookings(s, "zed");
    assert.equal(r.truncated, false);
    const by = Object.fromEntries(r.bookings.map((b) => [b.id, b.clash]));
    assert.equal(by[upClash.id as string], true);
    assert.equal(by[upFine.id as string], false);
    assert.equal(by[upCancelled.id as string], false);
    assert.equal(by[past.id as string], null);

    const exactly = Array.from({ length: 25 }, () => bk({ name: "Exact Person" }));
    assert.equal((await searchAdminBookings(sessionOf({ bookings: exactly, ...rota() }), "exact")).truncated, false);
    const over = Array.from({ length: 26 }, () => bk({ name: "Exact Person" }));
    const o = await searchAdminBookings(sessionOf({ bookings: over, ...rota() }), "exact");
    assert.equal(o.bookings.length, 25);
    assert.equal(o.truncated, true);
  });
});
