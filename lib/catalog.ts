// Dev seed/fallback catalog. Prices come from cutlabz.co.uk; names and durations
// are confirmed by the owner (all services 30 min, add-ons add no time).
// Hours per barber are still unconfirmed.
// Live data comes from Supabase (see catalog-db.ts); this is the dev seed/fallback.

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceGBP: number; // 0 for membership appointments (billed monthly)
  kind: "membership" | "one-off";
};

export type Addon = { id: string; name: string; priceGBP: number; extraMin: number };

export type Barber = { id: string; name: string; role: string };

export type Window = { open: number; close: number }; // minutes from midnight, shop-local
export type Hours = Record<number, Window[]>; // 0=Sun..6=Sat; [] or missing = closed
export type CatalogBarber = Barber & { hours: Hours };
/** Safe to send to browsers. */
export type ClientCatalog = { services: Service[]; addons: Addon[]; barbers: CatalogBarber[] };
/** Inclusive "YYYY-MM-DD" range. No reason field (private). */
export type TimeOff = { barberId: string; startDate: string; endDate: string };
/** Never sent to browsers. */
export type ServerCatalog = ClientCatalog & { timeOff: TimeOff[] };

const SEED_HOURS: Hours = {
  0: [],
  1: [],
  2: [{ open: 11 * 60, close: 21 * 60 }],
  3: [{ open: 11 * 60, close: 21 * 60 }],
  4: [{ open: 11 * 60, close: 21 * 60 }],
  5: [{ open: 11 * 60, close: 21 * 60 }],
  6: [{ open: 11 * 60, close: 21 * 60 }],
};

export const seedCatalog: ServerCatalog = {
  services: [
    { id: "core", name: "Core Membership Cut", description: "Unlimited haircuts • 30 min", durationMin: 30, priceGBP: 0, kind: "membership" },
    { id: "plus", name: "Plus Membership Cut", description: "Haircut + beard trim • 30 min", durationMin: 30, priceGBP: 0, kind: "membership" },
    { id: "premium", name: "Premium Membership Cut", description: "Haircut + beard + free add-ons • 30 min", durationMin: 30, priceGBP: 0, kind: "membership" },
    { id: "haircut", name: "Haircut", description: "One-off appointment • 30 min", durationMin: 30, priceGBP: 20, kind: "one-off" },
    { id: "haircut-beard", name: "Haircut + Beard", description: "One-off appointment • 30 min", durationMin: 30, priceGBP: 25, kind: "one-off" },
  ],
  addons: [
    { id: "hot-towel", name: "Hot Towel Treatment", priceGBP: 5, extraMin: 0 },
    { id: "wash-dry", name: "Hair Wash & Dry", priceGBP: 5, extraMin: 0 },
    { id: "mask-steam", name: "Face Mask / Steam", priceGBP: 5, extraMin: 0 },
    { id: "filler", name: "Hairline Filler Spray", priceGBP: 5, extraMin: 0 },
  ],
  barbers: [
    { id: "barber-1", name: "Wayne Graham", role: "Barber", hours: SEED_HOURS },
    { id: "barber-2", name: "Ayaan Ali", role: "Barber", hours: SEED_HOURS },
  ],
  timeOff: [],
};

// Seed/fallback conveniences (prefer the live catalog).
export const services: Service[] = seedCatalog.services;
export const addons: Addon[] = seedCatalog.addons;
export const barbers: Barber[] = seedCatalog.barbers.map(({ id, name, role }) => ({ id, name, role }));

export const SLOT_STEP_MIN = 15;
export const BOOKING_WINDOW_DAYS = 28;
export const MIN_NOTICE_MIN = 60;
