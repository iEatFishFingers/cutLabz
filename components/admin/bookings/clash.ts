import { isActiveStatus, type AdminBooking } from "@/lib/admin/bookings-shared";

type ClashBarber = {
  closed: { start: number; end: number }[];
  onLeave: boolean;
};

/** An active booking inside time off, or overlapping a closed stretch of its barber's day. */
export function bookingClashes(b: AdminBooking, barber: ClashBarber | undefined): boolean {
  if (!barber || !isActiveStatus(b.status)) return false;
  if (barber.onLeave) return true;
  return barber.closed.some((s) => b.startMin < s.end && b.endMin > s.start);
}

/** "Friday 1 January 2027" */
export function longDateWithYear(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Fri 1 Jan 2027" */
export function shortDateWithYear(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
