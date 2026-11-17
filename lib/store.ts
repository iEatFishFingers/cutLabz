// Storage layer. In-memory for now; replace the body of these functions with
// Supabase queries once the project is set up. Callers don't change.
// Dates are "YYYY-MM-DD" and times are minutes from midnight, shop-local time.

export type Booking = {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  barberId: string;
  serviceId: string;
  addonIds: string[];
  name: string;
  email: string;
  phone: string;
  notes: string;
  totalGBP: number;
  createdAt: string;
};

const g = globalThis as unknown as { __cutlabzBookings?: Booking[] };
const bookings = (g.__cutlabzBookings ??= []);

export async function listBookingsForDate(date: string): Promise<Booking[]> {
  return bookings.filter((b) => b.date === date);
}

export async function insertBooking(
  b: Omit<Booking, "id" | "createdAt">,
): Promise<Booking | "conflict"> {
  // Re-check at write time. With Postgres this becomes an exclusion constraint
  // on (barber_id, time range) so two people can never take the same slot.
  const clash = bookings.some(
    (x) =>
      x.date === b.date &&
      x.barberId === b.barberId &&
      b.startMin < x.endMin &&
      b.endMin > x.startMin,
  );
  if (clash) return "conflict";
  const row: Booking = {
    ...b,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  bookings.push(row);
  return row;
}
