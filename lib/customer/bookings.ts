import "server-only";
// Customer self-service over their own bookings. Plain functions: the caller
// (page / server action) resolves the viewer and passes the fields in.
// Everything is re-validated server-side; price and duration never change.
import { computeSlots } from "../availability";
import {
  isMembershipService,
  membershipBlock,
  orderCandidates,
  type BookingViewer,
} from "../booking-server";
import {
  isInWindow,
  isOpenDay,
  addDays,
  isValidDateString,
  shopNow,
  type SlotsResult,
} from "../booking-shared";
import type { ServerCatalog } from "../catalog";
import { loadCatalog } from "../catalog-db";
import { canSelfServe, hasStarted } from "../membership";
import {
  BOOKING_LIMIT_MESSAGE,
  cancelBooking,
  getBookingForUser,
  isActiveStatus,
  listActiveBookingsForUser,
  listBookingsForDate,
  listBookingsForUser,
  rescheduleBookingRow,
  type Booking,
} from "../store";

type Now = { date: string; min: number };

export type MyBookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export type MyBooking = {
  id: string;
  reference: string;
  date: string;
  startMin: number;
  endMin: number;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  addonIds: string[];
  addonNames: string[];
  totalGBP: number;
  status: MyBookingStatus;
  isMemberCut: boolean;
  /** Active and at least 24h before the start: the customer may cancel/reschedule online. */
  canSelfServe: boolean;
  started: boolean;
  /** Who cancelled: the customer, the shop (a staff stamp), or null (not cancelled / unknown, old rows). */
  cancelledBy: "customer" | "shop" | null;
  /** ISO time of cancellation, when known. */
  cancelledAt: string | null;
};

export const TOO_LATE_MESSAGE =
  "Cancellations within 24 hours aren't available online. Please contact the shop.";
const STALE_MESSAGE =
  "This appointment was changed in another tab or window. Reload the page to see its current time.";
const TOO_LATE_RESCHEDULE =
  "Changes within 24 hours aren't available online. Please contact the shop.";

const STATUSES: readonly string[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];
const PAST_LIMIT = 20;

function toMyBooking(b: Booking, catalog: ServerCatalog, now: Now): MyBooking {
  const active = isActiveStatus(b.status);
  const started = hasStarted(b.date, b.startMin, now);
  const status = (STATUSES.includes(b.status ?? "") ? b.status : "confirmed") as MyBookingStatus;
  return {
    id: b.id,
    reference: b.reference ?? `CL-${b.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    date: b.date,
    startMin: b.startMin,
    endMin: b.endMin,
    barberId: b.barberId,
    barberName: catalog.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId,
    serviceId: b.serviceId,
    serviceName: catalog.services.find((s) => s.id === b.serviceId)?.name ?? b.serviceId,
    addonIds: b.addonIds,
    addonNames: b.addonIds.map((id) => catalog.addons.find((a) => a.id === id)?.name ?? id),
    totalGBP: b.totalGBP,
    status,
    isMemberCut: !!b.membershipId || isMembershipService(catalog, b.serviceId),
    canSelfServe: active && canSelfServe(b.date, b.startMin, now),
    started,
    cancelledBy:
      status !== "cancelled" || !b.statusChangedBy
        ? null
        : b.statusChangedBy === "customer"
          ? "customer"
          : "shop",
    cancelledAt: b.cancelledAt ?? null,
  };
}

/** Upcoming = active and not started. Lets the booking page warn before the customer fills in the flow. */
export async function getMyBookingLimits(
  viewer: { userId: string },
  now: Now = shopNow(),
): Promise<{ upcomingCount: number; upcomingMemberCut: { date: string; startMin: number } | null }> {
  const [catalog, rows] = await Promise.all([
    loadCatalog(),
    listActiveBookingsForUser(viewer.userId, addDays(now.date, -1)),
  ]);
  const upcoming = rows
    .filter((b) => !hasStarted(b.date, b.startMin, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  const cut = upcoming.find((b) => !!b.membershipId || isMembershipService(catalog, b.serviceId));
  return {
    upcomingCount: upcoming.length,
    upcomingMemberCut: cut ? { date: cut.date, startMin: cut.startMin } : null,
  };
}

export async function listMyBookings(
  viewer: BookingViewer,
  now: Now,
): Promise<{ upcoming: MyBooking[]; past: MyBooking[] }> {
  const [catalog, rows] = await Promise.all([
    loadCatalog(),
    listBookingsForUser(viewer.userId, 100),
  ]);
  const all = rows.map((b) => toMyBooking(b, catalog, now));
  const isUpcoming = (b: MyBooking) =>
    (b.status === "pending" || b.status === "confirmed") && !b.started;
  const upcoming = all
    .filter(isUpcoming)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  const past = all
    .filter((b) => !isUpcoming(b))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startMin - a.startMin)
    .slice(0, PAST_LIMIT);
  return { upcoming, past };
}

export type CancelResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "too_late" | "not_active" | "error"; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export async function cancelMyBooking(
  viewer: BookingViewer,
  bookingId: unknown,
  now: Now,
): Promise<CancelResult> {
  if (typeof bookingId !== "string" || bookingId.length > 64)
    return { ok: false, code: "not_found", error: "Booking not found." };
  const b = await getBookingForUser(viewer.userId, bookingId);
  if (!b) return { ok: false, code: "not_found", error: "Booking not found." };
  if (!isActiveStatus(b.status))
    return { ok: false, code: "not_active", error: "This booking is already closed." };
  if (!canSelfServe(b.date, b.startMin, now))
    return { ok: false, code: "too_late", error: TOO_LATE_MESSAGE };
  const done = await cancelBooking(viewer.userId, b.id);
  if (!done) return { ok: false, code: "not_active", error: "This booking is already closed." };
  return { ok: true };
}

type Prepared =
  | { ok: true; booking: Booking; catalog: ServerCatalog }
  | { ok: false; code: "not_found" | "not_active" | "too_late"; error: string };

async function prepare(viewer: BookingViewer, bookingId: unknown, now: Now): Promise<Prepared> {
  if (typeof bookingId !== "string" || bookingId.length > 64)
    return { ok: false, code: "not_found", error: "Booking not found." };
  const booking = await getBookingForUser(viewer.userId, bookingId);
  if (!booking) return { ok: false, code: "not_found", error: "Booking not found." };
  if (!isActiveStatus(booking.status))
    return { ok: false, code: "not_active", error: "This booking is already closed." };
  // The 24h notice is measured against the ORIGINAL start.
  if (!canSelfServe(booking.date, booking.startMin, now))
    return { ok: false, code: "too_late", error: TOO_LATE_RESCHEDULE };
  return { ok: true, booking, catalog: await loadCatalog() };
}

export async function getRescheduleSlots(
  viewer: BookingViewer,
  input: unknown,
  now: Now,
): Promise<SlotsResult> {
  if (!isObject(input)) return { ok: false, error: "Invalid request." };
  const prep = await prepare(viewer, input.bookingId, now);
  if (!prep.ok) return { ok: false, error: prep.error };
  const { booking, catalog } = prep;
  const { date, barberId } = input;
  if (typeof date !== "string" || date.length > 10 || !isValidDateString(date))
    return { ok: false, error: "Choose a valid date." };
  if (
    typeof barberId !== "string" ||
    (barberId !== "any" && !catalog.barbers.some((b) => b.id === barberId))
  )
    return { ok: false, error: "Choose a valid barber." };

  if (booking.membershipId || isMembershipService(catalog, booking.serviceId)) {
    const block = membershipBlock(viewer, booking.serviceId, now, date);
    if (block) return { ok: true, slots: [] };
  }
  if (!isInWindow(date, now.date) || !isOpenDay(catalog, date)) return { ok: true, slots: [] };

  // The booking being moved must not block its own old slot.
  const others = (await listBookingsForDate(date)).filter((b) => b.id !== booking.id);
  return {
    ok: true,
    slots: computeSlots({
      date,
      durationMin: booking.endMin - booking.startMin,
      barberId,
      bookings: others,
      now,
      catalog,
    }),
  };
}

export type RescheduleResult =
  | { ok: true; booking: MyBooking }
  | {
      ok: false;
      code:
        | "not_found"
        | "too_late"
        | "not_active"
        | "unavailable"
        | "slot_taken"
        | "membership"
        | "invalid"
        | "limit"
        | "stale"
        | "error";
      error: string;
    };

export async function rescheduleMyBooking(
  viewer: BookingViewer,
  input: unknown,
  now: Now,
): Promise<RescheduleResult> {
  if (!isObject(input)) return { ok: false, code: "invalid", error: "Invalid request." };
  const prep = await prepare(viewer, input.bookingId, now);
  if (!prep.ok) return prep;
  const { booking, catalog } = prep;
  const { date, startMin, barberId } = input;

  const exp = input.expected;
  if (
    !isObject(exp) ||
    typeof exp.date !== "string" ||
    exp.date.length > 10 ||
    typeof exp.startMin !== "number" ||
    !Number.isInteger(exp.startMin) ||
    typeof exp.barberId !== "string" ||
    exp.barberId.length > 64
  )
    return { ok: false, code: "invalid", error: "Invalid request." };
  const expected = { date: exp.date, startMin: exp.startMin, barberId: exp.barberId };
  if (
    booking.date !== expected.date ||
    booking.startMin !== expected.startMin ||
    booking.barberId !== expected.barberId
  )
    return { ok: false, code: "stale", error: STALE_MESSAGE };

  if (typeof date !== "string" || date.length > 10 || !isValidDateString(date))
    return { ok: false, code: "invalid", error: "Choose a valid date." };
  if (typeof startMin !== "number" || !Number.isInteger(startMin))
    return { ok: false, code: "invalid", error: "Choose a valid time." };
  if (
    typeof barberId !== "string" ||
    (barberId !== "any" && !catalog.barbers.some((b) => b.id === barberId))
  )
    return { ok: false, code: "invalid", error: "Choose a valid barber." };

  if (booking.membershipId || isMembershipService(catalog, booking.serviceId)) {
    const block = membershipBlock(viewer, booking.serviceId, now, date);
    if (block) return { ok: false, code: "membership", error: block };
  }
  if (!isInWindow(date, now.date))
    return { ok: false, code: "unavailable", error: "That date can't be booked." };
  if (!isOpenDay(catalog, date))
    return { ok: false, code: "unavailable", error: "We're closed that day." };

  const durationMin = booking.endMin - booking.startMin;
  const possible = computeSlots({ date, durationMin, barberId, bookings: [], now, catalog });
  if (!possible.some((s) => s.startMin === startMin))
    return { ok: false, code: "unavailable", error: "That time isn't available. Pick another." };

  const others = (await listBookingsForDate(date)).filter((b) => b.id !== booking.id);
  const slot = computeSlots({ date, durationMin, barberId, bookings: others, now, catalog }).find(
    (s) => s.startMin === startMin,
  );
  const taken = {
    ok: false,
    code: "slot_taken",
    error: "That time was just taken. Pick another.",
  } as const;
  if (!slot) return taken;

  const candidates = orderCandidates(catalog, barberId, slot.barberIds, others);
  for (const candidate of candidates) {
    const res = await rescheduleBookingRow(viewer.userId, booking.id, {
      date,
      startMin,
      endMin: startMin + durationMin,
      barberId: candidate,
    }, expected);
    if (res === "conflict") continue;
    if (res === "stale") return { ok: false, code: "stale", error: STALE_MESSAGE };
    if (res === "limit")
      return { ok: false, code: "limit", error: BOOKING_LIMIT_MESSAGE };
    if (res === "not_found")
      return { ok: false, code: "not_active", error: "This booking is already closed." };
    return { ok: true, booking: toMyBooking(res, catalog, now) };
  }
  return taken;
}
