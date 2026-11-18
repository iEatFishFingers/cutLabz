import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { AdminSession } from "../lib/admin/auth";
import {
  changeBookingStatus,
  checkTransition,
  createAdminBooking,
  escapeLike,
  searchAdminBookings,
} from "../lib/admin/bookings";
import {
  MAX_DATE,
  MIN_DATE,
  parseDateParam,
  parseDateParamChecked,
  shiftDate,
  weekDates,
} from "../lib/admin/bookings-shared";
import {
  cleanText,
  parseSchedule,
  pluralPhrase,
  validateTimeOffRange,
} from "../lib/admin/catalog-admin";
import { seedCatalog } from "../lib/catalog";
import { withoutHourlessBarbers } from "../lib/catalog-db";
import { shopNow, stripBidi, validateContact } from "../lib/booking-shared";
import { addDays } from "../lib/booking-shared";
import { listBookingsForDate } from "../lib/store";
import { resetStore } from "./helpers";

/* ---------- a tiny fake of the supabase-js query builder ---------- */

type Row = Record<string, unknown>;

function likeToRegex(p: string): RegExp {
  let out = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "\\" && i + 1 < p.length) out += p[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "%") out += ".*";
    else if (c === "_") out += ".";
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "is");
}

function fakeDb(tables: Record<string, Row[]>, hooks: { beforeUpdate?: () => void } = {}) {
  const db = {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      const order: [string, boolean][] = [];
      let lim = Infinity;
      const run = () => {
        let res = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) {
          hooks.beforeUpdate?.();
          res = rows.filter((r) => filters.every((f) => f(r)));
          for (const r of res) Object.assign(r, patch);
        }
        for (const [k, asc] of [...order].reverse())
          res = [...res].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (asc ? 1 : -1));
        return res.slice(0, lim);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {
        select: () => b,
        update: (p: Row) => ((patch = p), b),
        eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), b),
        gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), b),
        lt: (k: string, v: string) => (filters.push((r) => String(r[k]) < v), b),
        ilike: (k: string, p: string) => (filters.push((r) => likeToRegex(p).test(String(r[k] ?? ""))), b),
        order: (k: string, o: { ascending: boolean }) => (order.push([k, o.ascending]), b),
        limit: (n: number) => ((lim = n), b),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: run(), error: null }).then(ok, bad),
      };
      return b;
    },
  };
  return db;
}

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const ID3 = "33333333-3333-4333-8333-333333333333";

const bk = (id: string, p: Row = {}): Row => ({
  id,
  reference: `CL-${id.slice(0, 6).toUpperCase()}`,
  booking_date: "2099-01-01",
  start_min: 600,
  end_min: 630,
  barber_id: "barber-1",
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
  cancelled_at: null,
  ...p,
});

const session = (db: unknown): AdminSession => ({
  userId: "u1",
  email: "boss@cutlabz.test",
  db: db as AdminSession["db"],
  barberId: null,
});

describe("status transitions", () => {
  test("rule table", () => {
    for (const from of ["pending", "confirmed"] as const) {
      assert.equal(checkTransition(from, "cancelled", false).ok, true);
      assert.equal(checkTransition(from, "completed", true).ok, true);
      assert.equal(checkTransition(from, "no_show", true).ok, true);
      const early = checkTransition(from, "completed", false);
      assert.ok(!early.ok && /future booking/.test(early.error));
      assert.equal(checkTransition(from, "no_show", false).ok, false);
      assert.equal(checkTransition(from, from, true).ok, false);
    }
    assert.equal(checkTransition("cancelled", "confirmed", false).ok, true);
    for (const from of ["cancelled", "completed", "no_show"] as const) {
      assert.equal(checkTransition(from, "pending", true).ok, false);
      assert.equal(checkTransition(from, "cancelled", true).ok, false);
    }
    assert.equal(checkTransition("completed", "confirmed", false).ok, false);
    assert.equal(checkTransition("pending", "confirmed", true).ok, false);
  });

  test("cancel stamps audit fields and cancelled_at; reopen clears cancelled_at", async () => {
    const rows = [bk(ID1)];
    const s = session(fakeDb({ bookings: rows }));
    const r = await changeBookingStatus(s, ID1, "cancelled", "confirmed");
    assert.deepEqual(r, { ok: true });
    assert.equal(rows[0].status, "cancelled");
    assert.ok(rows[0].cancelled_at);
    assert.equal(rows[0].status_changed_by, "boss@cutlabz.test");
    assert.ok(rows[0].status_changed_at);
    const back = await changeBookingStatus(s, ID1, "confirmed", "cancelled");
    assert.deepEqual(back, { ok: true });
    assert.equal(rows[0].cancelled_at, null);
  });

  test("future booking cannot be completed or no-show; a started one can", async () => {
    const rows = [bk(ID1), bk(ID2, { booking_date: "2000-01-01" })];
    const s = session(fakeDb({ bookings: rows }));
    const a = await changeBookingStatus(s, ID1, "completed", "confirmed");
    assert.ok(!a.ok && /future booking/.test(a.error));
    const n = await changeBookingStatus(s, ID1, "no_show", "confirmed");
    assert.ok(!n.ok);
    assert.equal(rows[0].status, "confirmed");
    assert.deepEqual(await changeBookingStatus(s, ID2, "completed", "confirmed"), { ok: true });
  });

  test("stale expected status is refused and nothing changes", async () => {
    const rows = [bk(ID1, { status: "cancelled" })];
    const s = session(fakeDb({ bookings: rows }));
    const r = await changeBookingStatus(s, ID1, "cancelled", "confirmed");
    assert.deepEqual(r, { ok: false, error: "This booking changed. Refresh and try again." });
    assert.equal(rows[0].status_changed_at, null);
  });

  test("a change landing between the read and the write is stale, not overwritten", async () => {
    const rows = [bk(ID1)];
    const s = session(
      fakeDb(
        { bookings: rows },
        {
          beforeUpdate: () => {
            rows[0].status = "cancelled"; // someone else got there first
          },
        },
      ),
    );
    const r = await changeBookingStatus(s, ID1, "cancelled", "confirmed");
    assert.ok(!r.ok && /changed/.test(r.error));
    assert.equal(rows[0].status_changed_at, null);
  });

  test("not found, bad ids and bad statuses", async () => {
    const s = session(fakeDb({ bookings: [bk(ID1)] }));
    assert.deepEqual(await changeBookingStatus(s, ID3, "cancelled", "confirmed"), {
      ok: false,
      error: "Booking not found.",
    });
    assert.equal((await changeBookingStatus(s, "nope", "cancelled", "confirmed")).ok, false);
    assert.equal((await changeBookingStatus(s, ID1, "bogus", "confirmed")).ok, false);
    assert.equal((await changeBookingStatus(s, ID1, "cancelled", "bogus")).ok, false);
    assert.equal((await changeBookingStatus(s, ID1, "cancelled", undefined)).ok, false);
  });
});

describe("admin search", () => {
  const rows = [
    bk(ID1, { name: "Sam Smith", booking_date: "2099-01-01" }),
    bk(ID2, { name: "Sam Past", booking_date: "2000-01-01", status: "completed" }),
    bk(ID3, { name: "100% Joe_Bloggs", email: "joe@x.com", phone: "+44 7700 111222", booking_date: "2099-02-01" }),
  ];
  const s = () => session(fakeDb({ bookings: rows, barbers: [], services: [], addons: [], availability: [], time_off: [] }));

  test("escapeLike makes wildcards literal", () => {
    assert.equal(escapeLike("a%b_c\\d"), "a\\%b\\_c\\\\d");
    assert.equal(escapeLike("a*b"), "a_b");
    assert.equal(escapeLike("a,b(c)"), "a,b(c)");
  });

  test("too short or non-string returns nothing", async () => {
    assert.deepEqual(await searchAdminBookings(s(), " a "), { bookings: [], truncated: false });
    assert.deepEqual(await searchAdminBookings(s(), 42), { bookings: [], truncated: false });
  });

  test("matches name case-insensitively, upcoming first then most recent", async () => {
    const r = (await searchAdminBookings(s(), "sAm")).bookings;
    assert.deepEqual(r.map((b) => b.id), [ID1, ID2]);
    assert.equal(r[0].statusChangedAt, null);
  });

  test("wildcard characters are literal", async () => {
    assert.deepEqual((await searchAdminBookings(s(), "0% J")).bookings.map((b) => b.id), [ID3]);
    assert.deepEqual((await searchAdminBookings(s(), "%%")).bookings.map((b) => b.id), []);
    assert.deepEqual((await searchAdminBookings(s(), "S%h")).bookings.map((b) => b.id), []);
    assert.deepEqual((await searchAdminBookings(s(), "e_b")).bookings.map((b) => b.id), [ID3]);
    assert.deepEqual((await searchAdminBookings(s(), "sa_")).bookings.map((b) => b.id), []);
  });

  test("phone matches by digits regardless of spacing, email and reference match too", async () => {
    assert.deepEqual((await searchAdminBookings(s(), "07700 900000")).bookings.map((b) => b.id).sort(), [ID1, ID2].sort());
    assert.deepEqual((await searchAdminBookings(s(), "7700111")).bookings.map((b) => b.id), [ID3]);
    assert.deepEqual((await searchAdminBookings(s(), "joe@x")).bookings.map((b) => b.id), [ID3]);
    assert.deepEqual((await searchAdminBookings(s(), "cl-333333")).bookings.map((b) => b.id), [ID3]);
  });

  test("caps at 25", async () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      bk(`aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`, { name: "Bulk Person", booking_date: "2099-03-01" }),
    );
    const sess = session(fakeDb({ bookings: many, barbers: [], services: [], addons: [], availability: [], time_off: [] }));
    const res = await searchAdminBookings(sess, "bulk");
    assert.equal(res.bookings.length, 25);
    assert.equal(res.truncated, true);
  });
});

describe("date params", () => {
  test("clamps to 2000-2100 and never produces year 10000", () => {
    assert.equal(parseDateParam("9999-12-31", "2026-11-18"), "2026-11-18");
    assert.equal(parseDateParam("1999-12-31", "2026-11-18"), "2026-11-18");
    assert.equal(parseDateParam("2100-12-31", "x"), "2100-12-31");
    assert.equal(parseDateParam("2000-01-01", "x"), "2000-01-01");
    assert.equal(parseDateParam("2026-02-30", "fb"), "fb");
    assert.equal(parseDateParam(undefined, "fb"), "fb");
    for (const d of weekDates(MAX_DATE)) assert.ok(d.length === 10 && d.startsWith("2100") || d.startsWith("2101"));
    assert.equal(shiftDate(MAX_DATE, 7), MAX_DATE);
    assert.equal(shiftDate(MIN_DATE, -7), MIN_DATE);
    assert.equal(shiftDate("2026-11-18", 1), "2026-11-19");
  });

  test("parseDateParamChecked flags only supplied-but-bad values", () => {
    assert.deepEqual(parseDateParamChecked("2026-11-18", "fb"), { date: "2026-11-18", fellBack: false });
    assert.deepEqual(parseDateParamChecked(undefined, "fb"), { date: "fb", fellBack: false });
    assert.deepEqual(parseDateParamChecked("", "fb"), { date: "fb", fellBack: false });
    assert.deepEqual(parseDateParamChecked("garbage", "fb"), { date: "fb", fellBack: true });
    assert.deepEqual(parseDateParamChecked("9999-01-01", "fb"), { date: "fb", fellBack: true });
    assert.deepEqual(parseDateParamChecked(["2026-11-18"], "fb"), { date: "fb", fellBack: true });
  });
});

describe("time-off and hours sanity", () => {
  const today = "2026-11-18";
  test("length, start and end limits", () => {
    assert.equal(validateTimeOffRange("2026-12-01", "2026-12-05", today), null);
    assert.equal(validateTimeOffRange("2026-11-18", addDays("2026-11-18", 365), today), null); // 366 days
    const long = validateTimeOffRange("2026-11-18", addDays("2026-11-18", 366), today);
    assert.equal(long?.field, "endDate");
    assert.match(long?.error ?? "", /366 days/);
    const far = validateTimeOffRange("2028-11-19", "2028-11-20", today);
    assert.equal(far?.field, "startDate");
    assert.equal(validateTimeOffRange("2028-11-18", "2028-11-18", today), null);
    // The end limit is implied by the other two; the latest legal block ends 2029-11-18.
    assert.equal(validateTimeOffRange("2028-11-18", "2029-11-18", today), null);
    assert.equal(validateTimeOffRange("2028-11-18", "2029-11-19", today)?.field, "endDate");
  });

  test("more than 4 windows is rejected with the clear message", () => {
    const w = Array.from({ length: 5 }, (_, i) => ({ open: 360 + i * 60, close: 390 + i * 60 }));
    const r = parseSchedule({ 1: w });
    assert.ok(!r.ok && /At most 4 opening windows per day\./.test(r.error));
    assert.ok(parseSchedule({ 1: w.slice(0, 4) }).ok);
  });

  test("plural phrases read correctly", () => {
    const one = "{n} upcoming booking falls outside the new hours and needs handling.";
    const many = "{n} upcoming bookings fall outside the new hours and need handling.";
    assert.equal(pluralPhrase(1, one, many), "1 upcoming booking falls outside the new hours and needs handling.");
    assert.equal(pluralPhrase(3, one, many), "3 upcoming bookings fall outside the new hours and need handling.");
  });
});

describe("bidi control characters", () => {
  const sneaky = "Sam‮evil‬ ⁦x⁩‎‏";
  test("stripBidi removes them all", () => {
    assert.equal(stripBidi(sneaky), "Samevil x");
    assert.equal(stripBidi("‪‫‭‮⁦⁧⁨⁩‎‏ok"), "ok");
  });
  test("a name made only of bidi marks fails validation", () => {
    const e = validateContact({ name: "‮‮‮", phone: "07700900000", notes: "" });
    assert.ok(e.name);
  });
  test("admin cleanText strips them", () => {
    assert.equal(cleanText("A‮B⁧C", 20), "ABC");
    assert.equal(cleanText("‮", 20), null);
  });
});

describe("walk-in idempotency (memory store)", () => {
  beforeEach(resetStore);
  const date = addDays(shopNow().date, 3);
  const input = (p: Record<string, unknown> = {}) => ({
    barberId: "barber-1",
    serviceId: "haircut",
    addonIds: [],
    date,
    startMin: 600,
    name: "Walk In‮",
    phone: "",
    email: "",
    notes: "",
    overrideHours: true,
    ...p,
  });

  test("same requestKey returns the first booking, creates one row", async () => {
    const s = session({});
    const key = "walkin-key-0001";
    const a = await createAdminBooking(s, input({ requestKey: key }), seedCatalog);
    const b = await createAdminBooking(s, input({ requestKey: key }), seedCatalog);
    assert.ok(a.ok && b.ok, JSON.stringify([a, b]));
    assert.equal(a.ok && b.ok && a.reference, b.ok ? b.reference : "");
    assert.equal((await listBookingsForDate(date)).length, 1);
    assert.equal((await listBookingsForDate(date))[0].name, "Walk In");
  });

  test("concurrent submits with one key give one booking", async () => {
    const s = session({});
    const key = "walkin-key-0002";
    const res = await Promise.all([
      createAdminBooking(s, input({ requestKey: key }), seedCatalog),
      createAdminBooking(s, input({ requestKey: key }), seedCatalog),
    ]);
    assert.ok(res.every((r) => r.ok), JSON.stringify(res));
    assert.equal((await listBookingsForDate(date)).length, 1);
  });

  test("without a key a second identical slot conflicts; a bad key is refused", async () => {
    const s = session({});
    assert.ok((await createAdminBooking(s, input(), seedCatalog)).ok);
    assert.equal((await createAdminBooking(s, input(), seedCatalog)).ok, false);
    const bad = await createAdminBooking(s, input({ requestKey: "x" }), seedCatalog);
    assert.equal(bad.ok, false);
  });
});

describe("customer catalog", () => {
  test("barbers with no availability rows are excluded", () => {
    const cat = {
      ...seedCatalog,
      barbers: [...seedCatalog.barbers, { id: "ghost", name: "Ghost", role: "", hours: {} }],
    };
    const out = withoutHourlessBarbers(cat);
    assert.ok(!out.barbers.some((b) => b.id === "ghost"));
    assert.equal(out.barbers.length, seedCatalog.barbers.length);
  });
});
