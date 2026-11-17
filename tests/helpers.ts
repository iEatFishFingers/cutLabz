import type { Booking } from "../lib/store";
import type { BookingViewer } from "../lib/booking-server";
import type { Membership } from "../lib/membership";

/** Empties the global in-memory stores (bookings + memberships). */
export function resetStore() {
  const g = globalThis as unknown as {
    __cutlabzBookings?: Booking[];
    __cutlabzMemberships?: unknown[];
  };
  if (g.__cutlabzBookings) g.__cutlabzBookings.length = 0;
  if (g.__cutlabzMemberships) g.__cutlabzMemberships.length = 0;
}

/** A signed-in viewer, optionally with a membership. */
export function viewer(p: Partial<BookingViewer> = {}): BookingViewer {
  return { userId: "user-1", email: "sam@example.com", membership: null, ...p };
}

export function member(plan = "core", p: Partial<Membership> = {}): Membership {
  return { id: "mem-1", plan, startsOn: "2026-11-10", endsOn: "2026-12-09", ...p };
}

let n = 0;
export function booking(p: Partial<Booking> & Pick<Booking, "date" | "startMin" | "endMin" | "barberId">): Booking {
  n += 1;
  return {
    id: `test-${n}`,
    serviceId: "core",
    addonIds: [],
    name: "Test",
    email: "t@example.com",
    phone: "07700900000",
    notes: "",
    totalGBP: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

export const hm = (h: number, m = 0) => h * 60 + m;
