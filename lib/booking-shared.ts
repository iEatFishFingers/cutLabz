// Shared booking contract: types + pure helpers used by both the client flow
// and the server actions. No I/O here, no `new Date()` at module level.
import {
  BOOKING_WINDOW_DAYS,
  type Addon,
  type ClientCatalog,
  type Service,
} from "./catalog";
import { dayOfWeek, type Slot } from "./availability";

export const SHOP_TZ = "Europe/London";

/** Client-side draft of a booking while the user moves through the steps. */
export type BookingDraft = {
  serviceId: string | null;
  addonIds: string[];
  barberId: string | null; // a barber id, "any", or null (not chosen yet)
  date: string | null; // "YYYY-MM-DD"
  startMin: number | null; // minutes from midnight, shop-local
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export const emptyDraft: BookingDraft = {
  serviceId: null,
  addonIds: [],
  barberId: null,
  date: null,
  startMin: null,
  name: "",
  email: "",
  phone: "",
  notes: "",
};

export type DetailsField = "name" | "email" | "phone" | "notes";
export type FieldErrors = Partial<Record<DetailsField, string>>;

export type GetSlotsInput = {
  date: string;
  serviceId: string;
  addonIds: string[];
  barberId: string; // barber id or "any"
};

export type SlotsResult =
  | { ok: true; slots: Slot[] }
  | { ok: false; error: string };

export type CreateBookingInput = {
  serviceId: string;
  addonIds: string[];
  barberId: string; // barber id or "any"
  date: string;
  startMin: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  /** Optional idempotency key (8-64 chars of A-Za-z0-9-). A retry with the same key returns the same booking. */
  requestKey?: string;
};

export const REQUEST_KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

export type ConfirmedBooking = {
  reference: string; // e.g. "CL-3F9A2C"
  date: string;
  startMin: number;
  endMin: number;
  barberId: string;
  barberName: string;
  serviceId: string;
  addonIds: string[];
  durationMin: number;
  totalGBP: number;
};

export type CreateBookingResult =
  | { ok: true; booking: ConfirmedBooking }
  | { ok: false; code: "error"; error: string }
  | {
      ok: false;
      /** slot_taken: someone booked it first, pick another time.
       *  invalid: input failed validation (see fieldErrors / error).
       *  unavailable: date/time not bookable (closed, outside window, past).
       *  auth: not signed in. membership: member-only service / plan ended or doesn't cover the date.
       *  limit: too many upcoming bookings (or an upcoming member cut already). */
      code: "slot_taken" | "invalid" | "unavailable" | "auth" | "membership" | "limit";
      error: string;
      fieldErrors?: FieldErrors;
    };

export const getService = (catalog: ClientCatalog, id: string | null): Service | undefined =>
  catalog.services.find((s) => s.id === id);

export const getBarberName = (catalog: ClientCatalog, id: string | null): string | undefined =>
  id === "any" ? "Any available" : catalog.barbers.find((b) => b.id === id)?.name;

/** Valid, de-duplicated add-ons in catalog order. Unknown ids are dropped. */
export function resolveAddons(catalog: ClientCatalog, addonIds: string[]): Addon[] {
  return catalog.addons.filter((a) => addonIds.includes(a.id));
}

/** Premium membership includes add-ons for free. */
export function addonPrice(service: Service | undefined, addon: Addon): number {
  return service?.id === "premium" ? 0 : addon.priceGBP;
}

/** Authoritative duration + price. Server always recomputes with this. */
export function quote(
  catalog: ClientCatalog,
  serviceId: string | null,
  addonIds: string[],
): { durationMin: number; totalGBP: number } | null {
  const service = getService(catalog, serviceId);
  if (!service) return null;
  const chosen = resolveAddons(catalog, addonIds);
  return {
    durationMin: service.durationMin + chosen.reduce((n, a) => n + a.extraMin, 0),
    totalGBP: service.priceGBP + chosen.reduce((n, a) => n + addonPrice(service, a), 0),
  };
}

export function formatGBP(n: number): string {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

/** Current shop-local date + minutes from midnight. Call only at request time
 *  on the server, or after hydration on the client (never during prerender). */
export function shopNow(at: Date = new Date()): { date: string; min: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    min: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isValidDateString = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** The bookable window: today + the next BOOKING_WINDOW_DAYS - 1 days. */
export function windowDates(today: string): string[] {
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

export function isInWindow(date: string, today: string): boolean {
  return date >= today && date <= addDays(today, BOOKING_WINDOW_DAYS - 1);
}

export const isOpenDay = (catalog: ClientCatalog, date: string): boolean =>
  catalog.barbers.some((b) => (b.hours[dayOfWeek(date)] ?? []).length > 0);

/** "Tue 18 Nov" style label, computed without the runtime clock. */
export function formatDate(date: string, opts?: { long?: boolean }): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: opts?.long ? "long" : "short",
    day: "numeric",
    month: opts?.long ? "long" : "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export const LIMITS = { name: 80, email: 254, phone: 20, notes: 500 } as const;

/** Bidirectional-control characters that can visually reorder text around a name. */
const BIDI_RE = /[‪-‮⁦-⁩‎‏]/g;
export const stripBidi = (s: string): string => s.replace(BIDI_RE, "");

/** Name/phone/notes only: the server uses the signed-in account email instead. */
export function validateContact(d: Pick<BookingDraft, "name" | "phone" | "notes">): FieldErrors {
  const e: FieldErrors = {};
  const name = stripBidi(d.name).trim();
  const phoneDigits = d.phone.replace(/[\s()+-]/g, "");
  if (name.length < 2) e.name = "Enter your name.";
  else if (name.length > LIMITS.name) e.name = `Max ${LIMITS.name} characters.`;
  if (phoneDigits.length === 0) e.phone = "Phone number is required.";
  else if (!/^\d{7,15}$/.test(phoneDigits) || d.phone.trim().length > LIMITS.phone)
    e.phone = "Enter a valid phone number.";
  if (d.notes.length > LIMITS.notes) e.notes = `Max ${LIMITS.notes} characters.`;
  return e;
}

/** Shared details validation (client shows inline). */
export function validateDetails(d: Pick<BookingDraft, DetailsField>): FieldErrors {
  const e: FieldErrors = validateContact(d);
  const email = d.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > LIMITS.email)
    e.email = "Enter a valid email.";
  return e;
}
