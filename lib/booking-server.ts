// Server-side booking logic. Called by app/book/actions.ts with the request-time
// `now`. Kept free of 'use server' so it can be unit tested directly.
// Every input is treated as untrusted JSON: never trust client duration/price.
import type { ServerCatalog } from "./catalog";
import { loadCatalog } from "./catalog-db";
import { computeSlots } from "./availability";
import {
  BOOKING_LIMIT_MESSAGE,
  cancelBooking,
  findBookingByRequestKey,
  insertBooking,
  isActiveStatus,
  listActiveBookingsForUser,
  listBookingsForDate,
  type Booking,
} from "./store";
import {
  MAX_UPCOMING_BOOKINGS,
  MAX_UPCOMING_MEMBER_CUTS,
  hasStarted,
  memberCanBookOn,
  type Membership,
} from "./membership";
import {
  addDays,
  getBarberName,
  isInWindow,
  isOpenDay,
  formatDate,
  isValidDateString,
  quote,
  REQUEST_KEY_RE,
  validateContact,
  type ConfirmedBooking,
  type CreateBookingResult,
  type SlotsResult,
} from "./booking-shared";

type Now = { date: string; min: number };

/** Minimal signed-in customer the booking rules need (no DB handle). */
export type BookingViewer = {
  userId: string;
  email: string;
  membership: Membership | null;
};

const MAX_ADDONS = 10;
const MAX_ID_LEN = 64;

type Common = {
  serviceId: string;
  addonIds: string[];
  barberId: string;
  date: string;
  durationMin: number;
  totalGBP: number;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isShortString = (v: unknown, max = MAX_ID_LEN): v is string =>
  typeof v === "string" && v.length <= max;

/** Validates the fields shared by getSlots and createBooking. */
function parseCommon(
  catalog: ServerCatalog,
  input: unknown,
): { ok: true; value: Common } | { ok: false; error: string } {
  if (!isObject(input)) return { ok: false, error: "Invalid request." };
  const { serviceId, addonIds, barberId, date } = input;

  if (!isShortString(serviceId) || !catalog.services.some((s) => s.id === serviceId))
    return { ok: false, error: "Choose a valid service." };

  const rawAddons = addonIds ?? [];
  if (
    !Array.isArray(rawAddons) ||
    rawAddons.length > MAX_ADDONS ||
    !rawAddons.every((a) => isShortString(a))
  )
    return { ok: false, error: "Invalid add-ons." };
  if (!rawAddons.every((a) => catalog.addons.some((x) => x.id === a)))
    return { ok: false, error: "Unknown add-on." };
  // De-dupe, catalog order.
  const cleanAddons = catalog.addons.filter((a) => rawAddons.includes(a.id)).map((a) => a.id);

  if (
    !isShortString(barberId) ||
    (barberId !== "any" && !catalog.barbers.some((b) => b.id === barberId))
  )
    return { ok: false, error: "Choose a valid barber." };

  if (!isShortString(date, 10) || !isValidDateString(date))
    return { ok: false, error: "Choose a valid date." };

  const q = quote(catalog, serviceId, cleanAddons);
  if (!q) return { ok: false, error: "Choose a valid service." };

  return {
    ok: true,
    value: { serviceId, addonIds: cleanAddons, barberId, date, ...q },
  };
}

const isBookableDate = (catalog: ServerCatalog, date: string, now: Now) =>
  isInWindow(date, now.date) && isOpenDay(catalog, date);

export function isMembershipService(catalog: ServerCatalog, serviceId: string): boolean {
  return catalog.services.find((s) => s.id === serviceId)?.kind === "membership";
}

/** Member-cut gate shared by booking and rescheduling. Null when allowed. */
export function membershipBlock(
  viewer: Pick<BookingViewer, "membership"> | undefined,
  serviceId: string,
  now: Now,
  date: string,
): string | null {
  const m = viewer?.membership ?? null;
  if (!m || m.plan !== serviceId) return "Members only.";
  if (!memberCanBookOn(m, now.date, date)) {
    if (m.endsOn < now.date || m.startsOn > now.date) return "Your membership has ended.";
    return `Your membership ends on ${formatDate(m.endsOn)}. Pick an earlier date.`;
  }
  return null;
}

/** Least-busy barber first, ties in catalog order. */
export function orderCandidates(
  catalog: ServerCatalog,
  barberId: string,
  barberIds: string[],
  dayBookings: Booking[],
): string[] {
  if (barberId !== "any") return [barberId];
  const countFor = (id: string) => dayBookings.filter((b) => b.barberId === id).length;
  const order = catalog.barbers.map((b) => b.id);
  return [...barberIds].sort(
    (a, b) => countFor(a) - countFor(b) || order.indexOf(a) - order.indexOf(b),
  );
}

export async function getSlots(
  input: unknown,
  now: Now,
  viewer?: BookingViewer | null,
): Promise<SlotsResult> {
  const catalog = await loadCatalog();
  const parsed = parseCommon(catalog, input);
  if (!parsed.ok) return parsed;
  const { date, durationMin, barberId, serviceId } = parsed.value;
  if (isMembershipService(catalog, serviceId)) {
    const m = viewer?.membership ?? null;
    if (!m || m.plan !== serviceId) return { ok: false, error: "Members only." };
    if (!memberCanBookOn(m, now.date, date)) return { ok: true, slots: [] };
  }
  if (!isBookableDate(catalog, date, now)) return { ok: true, slots: [] };

  const bookings = await listBookingsForDate(date);
  return { ok: true, slots: computeSlots({ date, durationMin, barberId, bookings, now, catalog }) };
}

const normaliseSpaces = (s: string) => s.trim().replace(/\s+/g, " ");

const LIMIT_RESULT = {
  ok: false,
  code: "limit",
  error: BOOKING_LIMIT_MESSAGE,
} as const;

function confirmed(catalog: ServerCatalog, row: Booking): ConfirmedBooking {
  return {
    reference: row.reference ?? `CL-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    date: row.date,
    startMin: row.startMin,
    endMin: row.endMin,
    barberId: row.barberId,
    barberName: getBarberName(catalog, row.barberId) ?? row.barberId,
    serviceId: row.serviceId,
    addonIds: row.addonIds,
    durationMin: row.endMin - row.startMin,
    totalGBP: row.totalGBP,
  };
}

export async function createBooking(
  input: unknown,
  now: Now,
  viewer?: BookingViewer | null,
): Promise<CreateBookingResult> {
  if (!viewer) return { ok: false, code: "auth", error: "Sign in to book." };
  const catalog = await loadCatalog();
  const parsed = parseCommon(catalog, input);
  if (!parsed.ok) return { ok: false, code: "invalid", error: parsed.error };
  const { serviceId, addonIds, barberId, date, durationMin, totalGBP } = parsed.value;
  const raw = input as Record<string, unknown>;

  // Details: must all be strings; bound length before regex work.
  // The email comes from the signed-in account; any client email is ignored.
  const fields = ["name", "phone", "notes"] as const;
  const details = { name: "", phone: "", notes: "" };
  for (const f of fields) {
    const v = raw[f] ?? (f === "notes" ? "" : undefined);
    if (typeof v !== "string" || v.length > 2000)
      return { ok: false, code: "invalid", error: "Check your details." };
    details[f] = v;
  }
  const fieldErrors = validateContact(details);
  if (Object.keys(fieldErrors).length)
    return { ok: false, code: "invalid", error: "Check your details.", fieldErrors };

  const startMin = raw.startMin;
  if (typeof startMin !== "number" || !Number.isInteger(startMin))
    return { ok: false, code: "invalid", error: "Choose a valid time." };

  // Idempotency: a retry with the same key returns the booking already made.
  let requestKey: string | null = null;
  if (raw.requestKey !== undefined && raw.requestKey !== null) {
    if (typeof raw.requestKey !== "string" || !REQUEST_KEY_RE.test(raw.requestKey))
      return { ok: false, code: "invalid", error: "Invalid request." };
    requestKey = raw.requestKey;
  }
  const replay = async (): Promise<CreateBookingResult | null> => {
    if (!requestKey) return null;
    const prior = await findBookingByRequestKey(viewer.userId, requestKey);
    if (!prior) return null;
    if (!isActiveStatus(prior.status))
      return {
        ok: false,
        code: "invalid",
        error: "This booking request was already used. Please start again.",
      };
    return { ok: true, booking: confirmed(catalog, prior) };
  };
  const replayed = await replay();
  if (replayed) return replayed;

  const memberCut = isMembershipService(catalog, serviceId);
  if (memberCut) {
    const block = membershipBlock(viewer, serviceId, now, date);
    if (block) return { ok: false, code: "membership", error: block };
  }

  const mine = (await listActiveBookingsForUser(viewer.userId, addDays(now.date, -1))).filter(
    (b) => !hasStarted(b.date, b.startMin, now),
  );
  const isMemberRow = (b: Booking) =>
    !!b.membershipId || isMembershipService(catalog, b.serviceId);
  if (memberCut && mine.filter(isMemberRow).length >= MAX_UPCOMING_MEMBER_CUTS)
    return {
      ok: false,
      code: "limit",
      error: "You already have an upcoming member cut. Cancel or complete it first.",
    };
  if (mine.length >= MAX_UPCOMING_BOOKINGS)
    return LIMIT_RESULT;

  if (!isInWindow(date, now.date))
    return { ok: false, code: "unavailable", error: "That date can't be booked." };
  if (!isOpenDay(catalog, date))
    return { ok: false, code: "unavailable", error: "We're closed that day." };

  // Is it a valid start at all (step, hours, notice), ignoring other bookings?
  const possible = computeSlots({ date, durationMin, barberId, bookings: [], now, catalog });
  if (!possible.some((s) => s.startMin === startMin))
    return { ok: false, code: "unavailable", error: "That time isn't available. Pick another." };

  const bookings = await listBookingsForDate(date);
  const slot = computeSlots({ date, durationMin, barberId, bookings, now, catalog }).find(
    (s) => s.startMin === startMin,
  );
  const taken = { ok: false, code: "slot_taken", error: "That time was just taken. Pick another." } as const;
  // A concurrent request with the same key may have just taken this slot: return its booking.
  if (!slot) return (await replay()) ?? taken;

  // For "any": least busy barber that day first, ties in catalog order.
  const candidates = orderCandidates(catalog, barberId, slot.barberIds, bookings);

  const endMin = startMin + durationMin;
  for (const candidate of candidates) {
    const row = await insertBooking({
      date,
      startMin,
      endMin,
      barberId: candidate,
      serviceId,
      addonIds,
      name: normaliseSpaces(details.name),
      email: viewer.email.trim().toLowerCase(),
      phone: normaliseSpaces(details.phone),
      notes: details.notes.trim(),
      totalGBP,
      userId: viewer.userId,
      membershipId: memberCut ? viewer.membership?.id ?? null : null,
      requestKey,
    });
    if (row === "conflict") continue;
    if (row === "limit") return LIMIT_RESULT;
    if (row === "duplicate") {
      // Lost a race against the same request key: return the winner.
      const again = await replay();
      return again ?? { ok: false, code: "error", error: "Something went wrong. Try again." };
    }
    // Race guard (belt and braces; the DB trigger is the hard cap): parallel
    // requests could both pass the checks above. The earliest-created survive.
    const after = (await listActiveBookingsForUser(viewer.userId, addDays(now.date, -1))).filter(
      (b) => !hasStarted(b.date, b.startMin, now),
    );
    const rank = (b: Booking) => `${b.createdAt}|${b.id}`;
    const olderThanRow = (b: Booking) => b.id !== row.id && rank(b) < rank(row);
    if (memberCut) {
      const members = after.filter(isMemberRow);
      if (
        members.length > MAX_UPCOMING_MEMBER_CUTS &&
        members.filter(olderThanRow).length >= MAX_UPCOMING_MEMBER_CUTS
      ) {
        await cancelBooking(viewer.userId, row.id);
        return {
          ok: false,
          code: "limit",
          error: "You already have an upcoming member cut. Cancel or complete it first.",
        };
      }
    }
    if (
      after.length > MAX_UPCOMING_BOOKINGS &&
      after.filter(olderThanRow).length >= MAX_UPCOMING_BOOKINGS
    ) {
      await cancelBooking(viewer.userId, row.id);
      return LIMIT_RESULT;
    }
    return { ok: true, booking: confirmed(catalog, row) };
  }
  return (await replay()) ?? taken;
}
