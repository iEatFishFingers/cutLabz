// Server-side booking logic. Called by app/book/actions.ts with the request-time
// `now`. Kept free of 'use server' so it can be unit tested directly.
// Every input is treated as untrusted JSON: never trust client duration/price.
import { addons, barbers, services } from "./catalog";
import { computeSlots } from "./availability";
import { insertBooking, listBookingsForDate } from "./store";
import {
  getBarberName,
  isInWindow,
  isOpenDay,
  isValidDateString,
  quote,
  validateDetails,
  type ConfirmedBooking,
  type CreateBookingResult,
  type SlotsResult,
} from "./booking-shared";

type Now = { date: string; min: number };

const MAX_ADDONS = 10;
const MAX_ID_LEN = 64;

type Common = {
  serviceId: string;
  addonIds: string[];
  barberId: string;
  date: string;
  durationMin: number;
  totalGBP: number;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isShortString = (v: unknown, max = MAX_ID_LEN): v is string =>
  typeof v === "string" && v.length <= max;

/** Validates the fields shared by getSlots and createBooking. */
function parseCommon(input: unknown): { ok: true; value: Common } | { ok: false; error: string } {
  if (!isObject(input)) return { ok: false, error: "Invalid request." };
  const { serviceId, addonIds, barberId, date } = input;

  if (!isShortString(serviceId) || !services.some((s) => s.id === serviceId))
    return { ok: false, error: "Choose a valid service." };

  const rawAddons = addonIds ?? [];
  if (
    !Array.isArray(rawAddons) ||
    rawAddons.length > MAX_ADDONS ||
    !rawAddons.every((a) => isShortString(a))
  )
    return { ok: false, error: "Invalid add-ons." };
  if (!rawAddons.every((a) => addons.some((x) => x.id === a)))
    return { ok: false, error: "Unknown add-on." };
  // De-dupe, catalog order.
  const cleanAddons = addons.filter((a) => rawAddons.includes(a.id)).map((a) => a.id);

  if (
    !isShortString(barberId) ||
    (barberId !== "any" && !barbers.some((b) => b.id === barberId))
  )
    return { ok: false, error: "Choose a valid barber." };

  if (!isShortString(date, 10) || !isValidDateString(date))
    return { ok: false, error: "Choose a valid date." };

  const q = quote(serviceId, cleanAddons);
  if (!q) return { ok: false, error: "Choose a valid service." };

  return {
    ok: true,
    value: { serviceId, addonIds: cleanAddons, barberId, date, ...q },
  };
}

const isBookableDate = (date: string, now: Now) =>
  isInWindow(date, now.date) && isOpenDay(date);

export async function getSlots(input: unknown, now: Now): Promise<SlotsResult> {
  const parsed = parseCommon(input);
  if (!parsed.ok) return parsed;
  const { date, durationMin, barberId } = parsed.value;
  if (!isBookableDate(date, now)) return { ok: true, slots: [] };

  const bookings = await listBookingsForDate(date);
  return { ok: true, slots: computeSlots({ date, durationMin, barberId, bookings, now }) };
}

const normaliseSpaces = (s: string) => s.trim().replace(/\s+/g, " ");

export async function createBooking(input: unknown, now: Now): Promise<CreateBookingResult> {
  const parsed = parseCommon(input);
  if (!parsed.ok) return { ok: false, code: "invalid", error: parsed.error };
  const { serviceId, addonIds, barberId, date, durationMin, totalGBP } = parsed.value;
  const raw = input as Record<string, unknown>;

  // Details: must all be strings; bound length before regex work.
  const fields = ["name", "email", "phone", "notes"] as const;
  const details = { name: "", email: "", phone: "", notes: "" };
  for (const f of fields) {
    const v = raw[f] ?? (f === "notes" ? "" : undefined);
    if (typeof v !== "string" || v.length > 2000)
      return { ok: false, code: "invalid", error: "Check your details." };
    details[f] = v;
  }
  const fieldErrors = validateDetails(details);
  if (Object.keys(fieldErrors).length)
    return { ok: false, code: "invalid", error: "Check your details.", fieldErrors };

  const startMin = raw.startMin;
  if (typeof startMin !== "number" || !Number.isInteger(startMin))
    return { ok: false, code: "invalid", error: "Choose a valid time." };

  if (!isInWindow(date, now.date))
    return { ok: false, code: "unavailable", error: "That date can't be booked." };
  if (!isOpenDay(date))
    return { ok: false, code: "unavailable", error: "We're closed that day." };

  // Is it a valid start at all (step, hours, notice), ignoring other bookings?
  const possible = computeSlots({ date, durationMin, barberId, bookings: [], now });
  if (!possible.some((s) => s.startMin === startMin))
    return { ok: false, code: "unavailable", error: "That time isn't available. Pick another." };

  const bookings = await listBookingsForDate(date);
  const slot = computeSlots({ date, durationMin, barberId, bookings, now }).find(
    (s) => s.startMin === startMin,
  );
  const taken = { ok: false, code: "slot_taken", error: "That time was just taken. Pick another." } as const;
  if (!slot) return taken;

  // For "any": least busy barber that day first, ties in catalog order.
  const countFor = (id: string) => bookings.filter((b) => b.barberId === id).length;
  const order = barbers.map((b) => b.id);
  const candidates =
    barberId === "any"
      ? [...slot.barberIds].sort(
          (a, b) => countFor(a) - countFor(b) || order.indexOf(a) - order.indexOf(b),
        )
      : [barberId];

  const endMin = startMin + durationMin;
  for (const candidate of candidates) {
    const row = await insertBooking({
      date,
      startMin,
      endMin,
      barberId: candidate,
      serviceId,
      addonIds,
      name: normaliseSpaces(details.name),
      email: details.email.trim().toLowerCase(),
      phone: normaliseSpaces(details.phone),
      notes: details.notes.trim(),
      totalGBP,
    });
    if (row === "conflict") continue;
    const booking: ConfirmedBooking = {
      reference: `CL-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      date: row.date,
      startMin: row.startMin,
      endMin: row.endMin,
      barberId: row.barberId,
      barberName: getBarberName(row.barberId) ?? row.barberId,
      serviceId: row.serviceId,
      addonIds: row.addonIds,
      durationMin,
      totalGBP: row.totalGBP,
    };
    return { ok: true, booking };
  }
  return taken;
}
