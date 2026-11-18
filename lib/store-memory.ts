// In-memory storage fallback for local dev and tests (no Supabase env).
// Dates are "YYYY-MM-DD" and times are minutes from midnight, shop-local time.
// Mirrors the Postgres semantics: only pending/confirmed rows block a slot.

import {
  isActiveStatus,
  type Booking,
  type RescheduleExpected,
  type RescheduleTarget,
} from "./store";
import { shopNow } from "./booking-shared";
import { hasStarted, MAX_UPCOMING_BOOKINGS } from "./membership";

const g = globalThis as unknown as { __cutlabzBookings?: Booking[] };
const bookings = (g.__cutlabzBookings ??= []);

const refOf = (id: string) => `CL-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const overlaps = (
  x: Booking,
  t: { date: string; barberId: string; startMin: number; endMin: number },
) =>
  isActiveStatus(x.status) &&
  x.date === t.date &&
  x.barberId === t.barberId &&
  t.startMin < x.endMin &&
  t.endMin > x.startMin;

/** Mirrors the DB trigger enforce_booking_cap: the user's OTHER upcoming active bookings. */
const atCap = (userId: string | null | undefined, exceptId: string | null): boolean => {
  if (!userId) return false;
  const now = shopNow();
  return (
    bookings.filter(
      (x) =>
        x.userId === userId &&
        x.id !== exceptId &&
        isActiveStatus(x.status) &&
        !hasStarted(x.date, x.startMin, now),
    ).length >= MAX_UPCOMING_BOOKINGS
  );
};

export async function listBookingsForDate(date: string): Promise<Booking[]> {
  return bookings.filter((b) => b.date === date && isActiveStatus(b.status));
}

export async function insertBooking(
  b: Omit<Booking, "id" | "createdAt" | "reference">,
): Promise<Booking | "conflict" | "limit" | "duplicate"> {
  if (
    b.requestKey &&
    bookings.some((x) => (x.userId ?? null) === (b.userId ?? null) && x.requestKey === b.requestKey)
  )
    return "duplicate";
  if (isActiveStatus(b.status) && atCap(b.userId, null)) return "limit";
  // Re-check at write time. With Postgres this is an exclusion constraint
  // on (barber_id, time range) so two people can never take the same slot.
  if (bookings.some((x) => overlaps(x, b))) return "conflict";
  const id = crypto.randomUUID();
  const row: Booking = {
    ...b,
    id,
    createdAt: new Date().toISOString(),
    userId: b.userId ?? null,
    membershipId: b.membershipId ?? null,
    requestKey: b.requestKey ?? null,
    status: b.status ?? "confirmed",
    reference: refOf(id),
  };
  bookings.push(row);
  return { ...row };
}

export async function listActiveBookingsForUser(
  userId: string,
  sinceDate?: string,
): Promise<Booking[]> {
  return bookings
    .filter(
      (b) =>
        b.userId === userId && isActiveStatus(b.status) && (!sinceDate || b.date >= sinceDate),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
    .map((b) => ({ ...b }));
}

export async function findBookingByRequestKey(
  userId: string | null,
  requestKey: string,
): Promise<Booking | null> {
  const b = bookings.find((x) => (x.userId ?? null) === userId && x.requestKey === requestKey);
  return b ? { ...b } : null;
}

export async function cancelUpcomingBookingsForUser(
  userId: string,
  now: { date: string; min: number },
): Promise<number> {
  let n = 0;
  for (const b of bookings) {
    if (b.userId === userId && isActiveStatus(b.status) && !hasStarted(b.date, b.startMin, now)) {
      b.status = "cancelled";
      b.cancelledAt = new Date().toISOString();
      b.statusChangedBy = "customer";
      n++;
    }
  }
  return n;
}

/** Account deletion (memory twin of the SQL path): anonymise every booking and detach the user. */
export async function anonymiseBookingsForUser(userId: string, phone: string): Promise<void> {
  for (const b of bookings) {
    if (b.userId !== userId) continue;
    b.name = "Deleted customer";
    b.email = `deleted+${b.id}@example.invalid`;
    b.phone = phone;
    b.notes = "";
    b.userId = null;
    b.requestKey = null;
  }
}

export async function listBookingsForUser(userId: string, limit: number): Promise<Booking[]> {
  return bookings
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startMin - a.startMin)
    .slice(0, limit)
    .map((b) => ({ ...b }));
}

export async function getBookingForUser(userId: string, id: string): Promise<Booking | null> {
  const b = bookings.find((x) => x.id === id && x.userId === userId);
  return b ? { ...b } : null;
}

export async function cancelBooking(userId: string, id: string): Promise<boolean> {
  const b = bookings.find((x) => x.id === id && x.userId === userId && isActiveStatus(x.status));
  if (!b) return false;
  b.status = "cancelled";
  b.cancelledAt = new Date().toISOString();
  b.statusChangedBy = "customer";
  return true;
}

export async function rescheduleBookingRow(
  userId: string,
  id: string,
  to: RescheduleTarget,
  expected: RescheduleExpected,
): Promise<Booking | "conflict" | "not_found" | "limit" | "stale"> {
  const b = bookings.find((x) => x.id === id && x.userId === userId && isActiveStatus(x.status));
  if (!b) return "not_found";
  if (
    b.date !== expected.date ||
    b.startMin !== expected.startMin ||
    b.barberId !== expected.barberId
  )
    return "stale";
  if (atCap(userId, id)) return "limit";
  if (bookings.some((x) => x.id !== id && overlaps(x, to))) return "conflict";
  b.date = to.date;
  b.startMin = to.startMin;
  b.endMin = to.endMin;
  b.barberId = to.barberId;
  return { ...b };
}
