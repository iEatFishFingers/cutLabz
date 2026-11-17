// Placeholder catalog. Prices come from cutlabz.co.uk; durations for one-off
// services, add-ons and the barbers are ASSUMPTIONS to be confirmed.
// Later this moves into Supabase tables (services, barbers, availability).

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

export const services: Service[] = [
  { id: "core", name: "Core Membership Cut", description: "Unlimited haircuts • 25 min", durationMin: 25, priceGBP: 0, kind: "membership" },
  { id: "plus", name: "Plus Membership Cut", description: "Haircut + beard trim • 35 min", durationMin: 35, priceGBP: 0, kind: "membership" },
  { id: "premium", name: "Premium Membership Cut", description: "Haircut + beard + free add-ons • 60 min", durationMin: 60, priceGBP: 0, kind: "membership" },
  { id: "haircut", name: "Haircut", description: "One-off appointment • 30 min", durationMin: 30, priceGBP: 20, kind: "one-off" },
  { id: "haircut-beard", name: "Haircut + Beard", description: "One-off appointment • 40 min", durationMin: 40, priceGBP: 25, kind: "one-off" },
];

export const addons: Addon[] = [
  { id: "hot-towel", name: "Hot Towel Treatment", priceGBP: 5, extraMin: 10 },
  { id: "wash-dry", name: "Hair Wash & Dry", priceGBP: 5, extraMin: 10 },
  { id: "mask-steam", name: "Face Mask / Steam", priceGBP: 5, extraMin: 10 },
  { id: "filler", name: "Hairline Filler Spray", priceGBP: 5, extraMin: 5 },
];

export const barbers: Barber[] = [
  { id: "barber-1", name: "Barber One", role: "Senior barber" },
  { id: "barber-2", name: "Barber Two", role: "Barber" },
];

// 0 = Sunday … 6 = Saturday. Tue–Sat 11:00–21:00, Sun/Mon closed.
export const openHours: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: null,
  2: { open: 11 * 60, close: 21 * 60 },
  3: { open: 11 * 60, close: 21 * 60 },
  4: { open: 11 * 60, close: 21 * 60 },
  5: { open: 11 * 60, close: 21 * 60 },
  6: { open: 11 * 60, close: 21 * 60 },
};

export const SLOT_STEP_MIN = 15;
export const BOOKING_WINDOW_DAYS = 28;
export const MIN_NOTICE_MIN = 60;
