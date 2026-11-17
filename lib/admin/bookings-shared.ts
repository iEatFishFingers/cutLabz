// Pure helpers + types for the admin calendar. Safe to import from client
// components (no I/O, no clock). Dates "YYYY-MM-DD", minutes from midnight.
import type { TimeOff, Window, CatalogBarber } from "@/lib/catalog";
import { dayOfWeek } from "@/lib/availability";
import { addDays, isValidDateString } from "@/lib/booking-shared";

export const STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
export type BookingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

export const isStatus = (v: unknown): v is BookingStatus =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

/** Only pending/confirmed bookings occupy the slot (matches the DB constraint). */
export const isActiveStatus = (s: BookingStatus | "unknown"): boolean =>
  s === "pending" || s === "confirmed";

/** Full booking as shown to admins (names already resolved on the server). */
export type AdminBooking = {
  id: string;
  reference: string;
  date: string;
  startMin: number;
  endMin: number;
  barberId: string;
  serviceName: string;
  addonNames: string[];
  name: string;
  email: string;
  phone: string;
  notes: string;
  totalGBP: number;
  /** "unknown" = a status value this UI doesn't recognise (see statusRaw). */
  status: BookingStatus | "unknown";
  statusRaw: string;
  paymentStatus: string;
};

export const statusLabel = (b: Pick<AdminBooking, "status" | "statusRaw">): string =>
  b.status === "unknown" ? b.statusRaw || "Unknown" : STATUS_LABEL[b.status];

/** Barber as shown on the admin calendar (active or not). */
export type AdminBarber = {
  id: string;
  name: string;
  active: boolean;
  hours: Record<number, Window[]>;
};

export const STEP = 15;
export const ROW_MIN = 30;

export type View = "day" | "week";

export function parseView(v: string | string[] | undefined): View {
  return v === "week" ? "week" : "day";
}

/** Returns a valid date from a search param, else the fallback. */
export function parseDateParam(v: string | string[] | undefined, fallback: string): string {
  return typeof v === "string" && isValidDateString(v) ? v : fallback;
}

/** Mon-Sun dates of the week containing `date`. */
export function weekDates(date: string): string[] {
  const offset = (dayOfWeek(date) + 6) % 7;
  const monday = addDays(date, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const barberWindows = (b: Pick<CatalogBarber, "hours">, date: string): Window[] =>
  b.hours[dayOfWeek(date)] ?? [];

export const isOnLeave = (timeOff: TimeOff[], barberId: string, date: string): boolean =>
  timeOff.some((t) => t.barberId === barberId && date >= t.startDate && date <= t.endDate);

/** Timeline range (multiples of 30 min) covering all windows and bookings; null if nothing. */
export function timelineBounds(
  windows: Window[],
  bookings: { startMin: number; endMin: number }[],
): { start: number; end: number } | null {
  const starts = [...windows.map((w) => w.open), ...bookings.map((b) => b.startMin)];
  const ends = [...windows.map((w) => w.close), ...bookings.map((b) => b.endMin)];
  if (!starts.length) return null;
  const start = Math.floor(Math.min(...starts) / ROW_MIN) * ROW_MIN;
  const end = Math.min(1440, Math.ceil(Math.max(...ends) / ROW_MIN) * ROW_MIN);
  return end > start ? { start, end } : null;
}

/** Complement of the windows within [start,end]: the closed stretches. */
export function closedSegments(
  windows: Window[],
  bounds: { start: number; end: number },
): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let cursor = bounds.start;
  for (const w of [...windows].sort((a, b) => a.open - b.open)) {
    if (w.open > cursor) out.push({ start: cursor, end: Math.min(w.open, bounds.end) });
    cursor = Math.max(cursor, w.close);
  }
  if (cursor < bounds.end) out.push({ start: cursor, end: bounds.end });
  return out.filter((s) => s.end > s.start);
}

/** Lane index + lane count per item so overlapping blocks sit side by side. */
export function assignLanes(
  items: { startMin: number; endMin: number }[],
): { lane: number; lanes: number }[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a].startMin - items[b].startMin);
  const res = items.map(() => ({ lane: 0, lanes: 1 }));
  let cluster: number[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => {
    for (const i of cluster) res[i].lanes = Math.max(1, laneEnds.length);
    cluster = [];
    laneEnds = [];
  };
  for (const i of order) {
    const it = items[i];
    if (cluster.length && it.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((e) => e <= it.startMin);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = it.endMin;
    res[i].lane = lane;
    cluster.push(i);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return res;
}

/** Round up to the next 15-min step. */
export const nextStep = (min: number, step = STEP): number => Math.ceil(min / step) * step;

/** 15-min start times where a booking of `durationMin` fits inside a window. */
export function startSteps(windows: Window[], durationMin: number, step = STEP): number[] {
  const set = new Set<number>();
  for (const w of windows)
    for (let s = w.open; s + durationMin <= w.close; s += step) set.add(s);
  return [...set].sort((a, b) => a - b);
}

export const fitsInWindows = (windows: Window[], start: number, end: number): boolean =>
  windows.some((w) => start >= w.open && end <= w.close);

/** Next confirmed booking per barber from `nowMin` on (bookings must be one day). */
export function nextUp(
  bookings: AdminBooking[],
  barberIds: string[],
  nowMin: number,
): Record<string, AdminBooking | undefined> {
  const out: Record<string, AdminBooking | undefined> = {};
  for (const id of barberIds) {
    out[id] = bookings
      .filter((b) => b.barberId === id && b.status === "confirmed" && b.startMin >= nowMin)
      .sort((a, b) => a.startMin - b.startMin)[0];
  }
  return out;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((p) => p[0]!.toUpperCase()).slice(0, 2).join("") || "?";
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminActionResult = { ok: true } | { ok: false; error: string };

export type NewBookingState =
  | { ok: null }
  | { ok: false; error: string }
  | { ok: true; reference: string; date: string; startMin: number; barberName: string };
