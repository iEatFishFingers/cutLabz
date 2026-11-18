import "server-only";
import type { AdminSession } from "@/lib/admin/auth";
import type { ServerCatalog, TimeOff, Window } from "@/lib/catalog";
import {
  LIMITS,
  REQUEST_KEY_RE,
  isValidDateString,
  quote,
  resolveAddons,
  shopNow,
  stripBidi,
} from "@/lib/booking-shared";
import { hasStarted } from "@/lib/membership";
import { findBookingByRequestKey, insertBooking, type Booking } from "@/lib/store";
import {
  STEP,
  UUID_RE,
  barberWindows,
  clampDate,
  fitsInWindows,
  isActiveStatus,
  isOnLeave,
  isStatus,
  type AdminActionResult,
  type AdminBarber,
  type AdminBooking,
  type BookingStatus,
} from "./bookings-shared";

type Db = AdminSession["db"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLS =
  "id,reference,booking_date,start_min,end_min,barber_id,service_id,addon_ids,name,email,phone,notes,total_pence,status,payment_status,status_changed_at,status_changed_by";

type NameDir = Pick<AdminDirectory, "serviceNames" | "addonNames">;

function mapBooking(r: any, dir: NameDir): AdminBooking {
  return {
    id: r.id,
    reference: r.reference ?? "",
    date: String(r.booking_date),
    startMin: r.start_min,
    endMin: r.end_min,
    barberId: r.barber_id,
    serviceName: dir.serviceNames[r.service_id] || "Removed service",
    addonNames: ((r.addon_ids ?? []) as string[]).map((id) => dir.addonNames[id] || "Removed add-on"),
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    notes: r.notes ?? "",
    totalGBP: (r.total_pence ?? 0) / 100,
    status: isStatus(r.status) ? r.status : "unknown",
    statusRaw: String(r.status ?? ""),
    paymentStatus: r.payment_status ?? "",
    statusChangedAt: r.status_changed_at ? String(r.status_changed_at) : null,
    statusChangedBy: r.status_changed_by ? String(r.status_changed_by) : null,
  };
}

export type AdminDirectory = {
  barbers: AdminBarber[]; // ALL barbers, including inactive
  serviceNames: Record<string, string>;
  addonNames: Record<string, string>;
  timeOff: TimeOff[];
};

/** Every barber/service/add-on (no active filter) so old bookings still render. */
export async function loadAdminDirectory(db: Db): Promise<AdminDirectory> {
  const [b, s, a, av, to] = await Promise.all([
    db.from("barbers").select("id,name,active"),
    db.from("services").select("id,name"),
    db.from("addons").select("id,name"),
    db.from("availability").select("barber_id,weekday,open_min,close_min"),
    db.from("time_off").select("barber_id,start_date,end_date"),
  ]);
  for (const r of [b, s, a, av, to]) {
    if (r.error || !Array.isArray(r.data)) throw new Error("Could not load calendar data.");
  }
  const avail = av.data as any[];
  const barbers: AdminBarber[] = (b.data as any[])
    .map((r) => {
      const hours: Record<number, Window[]> = {};
      for (const x of avail.filter((x) => x.barber_id === r.id))
        (hours[x.weekday] ??= []).push({ open: x.open_min, close: x.close_min });
      for (const k of Object.keys(hours)) hours[Number(k)].sort((p, q) => p.open - q.open);
      return { id: r.id as string, name: (r.name as string) ?? "", active: r.active !== false, hours };
    })
    .sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name));
  const names = (rows: any[]) => Object.fromEntries(rows.map((r) => [r.id, r.name ?? ""]));
  return {
    barbers,
    serviceNames: names(s.data as any[]),
    addonNames: names(a.data as any[]),
    timeOff: (to.data as any[]).map((r) => ({
      barberId: r.barber_id,
      startDate: String(r.start_date),
      endDate: String(r.end_date),
    })),
  };
}

/** Bookings for an inclusive date range, via the admin's RLS session. */
export async function listAdminBookings(
  db: Db,
  from: string,
  to: string,
  dir: Pick<AdminDirectory, "serviceNames" | "addonNames">,
): Promise<AdminBooking[]> {
  if (!isValidDateString(from) || !isValidDateString(to)) throw new Error("Bad date range.");
  // Clamp rather than throw for far-away (but well-formed) dates.
  const { data, error } = await db
    .from("bookings")
    .select(COLS)
    .gte("booking_date", clampDate(from))
    .lte("booking_date", clampDate(to))
    .order("start_min", { ascending: true });
  if (error) {
    console.error("admin bookings list failed", error.code);
    throw new Error("Could not load bookings.");
  }
  return ((data ?? []) as any[]).map((r) => mapBooking(r, dir));
}

const STALE = "This booking changed. Refresh and try again.";
const FUTURE_BLOCKED = "A future booking can't be marked completed or no-show.";

/** Server-side transition rules. `started` = the booking's start time has passed (shop-local). */
export function checkTransition(
  from: BookingStatus,
  to: BookingStatus,
  started: boolean,
): { ok: true } | { ok: false; error: string } {
  const open = from === "pending" || from === "confirmed";
  if (open && to === "cancelled") return { ok: true };
  if (open && (to === "completed" || to === "no_show"))
    return started ? { ok: true } : { ok: false, error: FUTURE_BLOCKED };
  if (!open && to === "confirmed") return { ok: true }; // Reopen (overlap constraint still applies)
  return { ok: false, error: "That status change isn't allowed." };
}

export async function changeBookingStatus(
  session: AdminSession,
  id: unknown,
  status: unknown,
  expected: unknown,
): Promise<AdminActionResult> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "Invalid booking." };
  if (!isStatus(status)) return { ok: false, error: "Invalid status." };
  if (!isStatus(expected)) return { ok: false, error: STALE };
  const next: BookingStatus = status;
  const db = session.db;

  const read = async () =>
    db.from("bookings").select("id,status,booking_date,start_min").eq("id", id).maybeSingle();
  const { data: cur, error: readErr } = await read();
  if (readErr) {
    console.error("admin status read failed", readErr.code);
    return { ok: false, error: "Could not update the booking." };
  }
  if (!cur) return { ok: false, error: "Booking not found." };
  if (cur.status !== expected) return { ok: false, error: STALE };

  const started = hasStarted(String(cur.booking_date), Number(cur.start_min), shopNow());
  const verdict = checkTransition(expected, next, started);
  if (!verdict.ok) return verdict;

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("bookings")
    .update({
      status: next,
      status_changed_at: nowIso,
      status_changed_by: session.email || null,
      cancelled_at: next === "cancelled" ? nowIso : null,
    })
    .eq("id", id)
    .eq("status", expected)
    .select("id");
  if (error) {
    if (error.code === "23P01" && isActiveStatus(next))
      return { ok: false, error: "That barber already has a booking at that time." };
    console.error("admin status update failed", error.code);
    return { ok: false, error: "Could not update the booking." };
  }
  if (!data?.length) {
    const { data: again } = await read();
    return { ok: false, error: again ? STALE : "Booking not found." };
  }
  return { ok: true };
}

/* ---------- search ---------- */

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 100;
export const SEARCH_LIMIT = 25;

/** Escapes a user string for a PostgREST ilike value: LIKE wildcards are made
 *  literal and `*` (PostgREST's own wildcard alias) becomes a single-char match.
 *  Used with .ilike() (never inside an .or() string), so commas/parens are inert. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "_");
}

export async function searchAdminBookings(
  session: AdminSession,
  query: unknown,
): Promise<AdminBooking[]> {
  if (typeof query !== "string") return [];
  const q = query.trim().slice(0, SEARCH_MAX);
  if (q.length < SEARCH_MIN) return [];
  const db = session.db;
  const today = shopNow().date;
  const like = `%${escapeLike(q)}%`;

  const digits = /^[\d\s()+-]+$/.test(q) ? q.replace(/\D/g, "").slice(0, 15) : "";
  const phoneLike = digits.length >= SEARCH_MIN ? `%${digits.split("").join("%")}%` : null;

  const targets: [string, string][] = [
    ["name", like],
    ["email", like],
    ["reference", like],
  ];
  if (phoneLike) targets.push(["phone", phoneLike]);

  const jobs = targets.flatMap(([col, pat]) => [
    db
      .from("bookings")
      .select(COLS)
      .ilike(col, pat)
      .gte("booking_date", today)
      .order("booking_date", { ascending: true })
      .order("start_min", { ascending: true })
      .limit(SEARCH_LIMIT),
    db
      .from("bookings")
      .select(COLS)
      .ilike(col, pat)
      .lt("booking_date", today)
      .order("booking_date", { ascending: false })
      .order("start_min", { ascending: false })
      .limit(SEARCH_LIMIT),
  ]);
  const results = await Promise.all(jobs);
  const byId = new Map<string, any>();
  results.forEach((r, i) => {
    if (r.error) {
      console.error("admin booking search failed", r.error.code);
      throw new Error("Could not search bookings.");
    }
    const isPhone = targets[Math.floor(i / 2)][0] === "phone";
    for (const row of (r.data ?? []) as any[]) {
      // The spread digit pattern is loose; keep only real digit-substring phone matches.
      if (isPhone && !String(row.phone ?? "").replace(/\D/g, "").includes(digits)) continue;
      byId.set(row.id, row);
    }
  });
  const rows = [...byId.values()];
  const upcoming = rows
    .filter((r) => String(r.booking_date) >= today)
    .sort((a, b) =>
      String(a.booking_date).localeCompare(String(b.booking_date)) || a.start_min - b.start_min,
    );
  const past = rows
    .filter((r) => String(r.booking_date) < today)
    .sort((a, b) =>
      String(b.booking_date).localeCompare(String(a.booking_date)) || b.start_min - a.start_min,
    );
  const dir = await loadAdminDirectory(db);
  return [...upcoming, ...past].slice(0, SEARCH_LIMIT).map((r) => mapBooking(r, dir));
}

export type CreateInput = {
  barberId: unknown;
  serviceId: unknown;
  addonIds: unknown;
  date: unknown;
  startMin: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  notes: unknown;
  overrideHours: unknown;
  /** Optional idempotency key (hidden form field) so a double submit books once. */
  requestKey?: unknown;
};

export type CreateResult =
  | { ok: true; reference: string; date: string; startMin: number; barberName: string }
  | { ok: false; error: string };

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.length <= max * 4 ? stripBidi(v).trim() : null;

export async function createAdminBooking(
  _session: AdminSession,
  input: CreateInput,
  catalog: ServerCatalog,
): Promise<CreateResult> {
  const fail = (error: string): CreateResult => ({ ok: false, error });

  let requestKey: string | null = null;
  if (input.requestKey !== undefined && input.requestKey !== null && input.requestKey !== "") {
    if (typeof input.requestKey !== "string" || !REQUEST_KEY_RE.test(input.requestKey))
      return fail("Invalid request. Reload the page and try again.");
    requestKey = input.requestKey;
  }
  const fromExisting = (b: Booking): CreateResult => ({
    ok: true,
    reference: b.reference ?? `CL-${b.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    date: b.date,
    startMin: b.startMin,
    barberName: catalog.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId,
  });
  if (requestKey) {
    const existing = await findBookingByRequestKey(null, requestKey);
    if (existing) return fromExisting(existing);
  }

  const barber =
    typeof input.barberId === "string"
      ? catalog.barbers.find((b) => b.id === input.barberId)
      : undefined;
  if (!barber) return fail("Choose a barber.");
  const service =
    typeof input.serviceId === "string"
      ? catalog.services.find((s) => s.id === input.serviceId)
      : undefined;
  if (!service) return fail("Choose a service.");

  if (!Array.isArray(input.addonIds) || input.addonIds.length > 20) return fail("Invalid add-ons.");
  const addonIds = [...new Set(input.addonIds)];
  if (addonIds.some((a) => typeof a !== "string")) return fail("Invalid add-ons.");
  if (resolveAddons(catalog, addonIds as string[]).length !== addonIds.length)
    return fail("Unknown add-on.");

  const date = input.date;
  if (typeof date !== "string" || !isValidDateString(date)) return fail("Enter a valid date.");
  const startMin = input.startMin;
  if (
    typeof startMin !== "number" ||
    !Number.isInteger(startMin) ||
    startMin < 0 ||
    startMin >= 1440 ||
    startMin % STEP !== 0
  )
    return fail("Choose a start time.");

  const name = str(input.name, LIMITS.name);
  if (!name || name.length > LIMITS.name) return fail(`Enter a name (max ${LIMITS.name} characters).`);
  const phone = str(input.phone, LIMITS.phone);
  const email = str(input.email, LIMITS.email);
  const notes = typeof input.notes === "string" ? stripBidi(input.notes).trim() : null;
  if (phone === null || email === null || notes === null) return fail("Invalid details.");
  if (phone && (!/^\d{7,15}$/.test(phone.replace(/[\s()+-]/g, "")) || phone.length > LIMITS.phone))
    return fail("Enter a valid phone number or leave it blank.");
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > LIMITS.email))
    return fail("Enter a valid email or leave it blank.");
  if (notes.length > LIMITS.notes) return fail(`Notes: max ${LIMITS.notes} characters.`);

  const q = quote(catalog, service.id, addonIds as string[]);
  if (!q) return fail("Choose a service.");
  const endMin = startMin + q.durationMin;
  if (endMin > 1440) return fail("That booking would run past midnight.");

  if (input.overrideHours !== true) {
    if (isOnLeave(catalog.timeOff, barber.id, date))
      return fail(`${barber.name} is on time off that day. Tick "Override hours" to book anyway.`);
    if (!fitsInWindows(barberWindows(barber, date), startMin, endMin))
      return fail(
        `That time is outside ${barber.name}'s working hours. Tick "Override hours" to book anyway.`,
      );
  }

  const saved = await insertBooking({
    date,
    startMin,
    endMin,
    barberId: barber.id,
    serviceId: service.id,
    addonIds: addonIds as string[],
    name,
    email,
    phone,
    notes,
    totalGBP: q.totalGBP,
    userId: null,
    requestKey,
  });
  if (saved === "conflict") {
    // A concurrent request with the same key may have just taken this slot: return its booking.
    if (requestKey) {
      const winner = await findBookingByRequestKey(null, requestKey);
      if (winner) return fromExisting(winner);
    }
    return fail("That barber already has a booking at that time.");
  }
  if (saved === "duplicate" && requestKey) {
    // Lost a race with the same key: return the winner instead of an error.
    const winner = await findBookingByRequestKey(null, requestKey);
    if (winner) return fromExisting(winner);
  }
  // Admin bookings carry no user id, so the cap result cannot occur.
  if (typeof saved === "string") return fail("Could not save booking.");
  // insertBooking derives the reference from the id the same way.
  const reference = `CL-${saved.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  return { ok: true, reference, date, startMin, barberName: barber.name };
}
