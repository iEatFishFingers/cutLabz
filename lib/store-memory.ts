// In-memory storage fallback for local dev and tests (no Supabase env).
// Dates are "YYYY-MM-DD" and times are minutes from midnight, shop-local time.
// Mirrors the Postgres semantics: only pending/confirmed rows block a slot.

import { isActiveStatus, type Booking, type RescheduleTarget } from "./store";

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

export async function listBookingsForDate(date: string): Promise<Booking[]> {
  return bookings.filter((b) => b.date === date && isActiveStatus(b.status));
}

export async function insertBooking(
  b: Omit<Booking, "id" | "createdAt" | "reference">,
): Promise<Booking | "conflict"> {
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
  return true;
}

export async function rescheduleBookingRow(
  userId: string,
  id: string,
  to: RescheduleTarget,
): Promise<Booking | "conflict" | "not_found"> {
  const b = bookings.find((x) => x.id === id && x.userId === userId && isActiveStatus(x.status));
  if (!b) return "not_found";
  if (bookings.some((x) => x.id !== id && overlaps(x, to))) return "conflict";
  b.date = to.date;
  b.startMin = to.startMin;
  b.endMin = to.endMin;
  b.barberId = to.barberId;
  return { ...b };
}
