import type { Booking } from "../lib/store";

/** Empties the global in-memory store used by lib/store.ts. */
export function resetStore() {
  const g = globalThis as unknown as { __cutlabzBookings?: Booking[] };
  if (g.__cutlabzBookings) g.__cutlabzBookings.length = 0;
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
