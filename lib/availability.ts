import {
  barbers,
  openHours,
  SLOT_STEP_MIN,
  MIN_NOTICE_MIN,
} from "./catalog";
import type { Booking } from "./store";

export type Slot = { startMin: number; barberIds: string[] };

export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Free start times for a service of `durationMin` on `date`. */
export function computeSlots(opts: {
  date: string;
  durationMin: number;
  barberId: string | "any";
  bookings: Booking[];
  /** Current shop-local date + minutes, used to hide past/too-soon times. */
  now: { date: string; min: number };
}): Slot[] {
  const hours = openHours[dayOfWeek(opts.date)];
  if (!hours) return [];

  const candidates =
    opts.barberId === "any"
      ? barbers.map((b) => b.id)
      : barbers.filter((b) => b.id === opts.barberId).map((b) => b.id);

  const slots: Slot[] = [];
  for (
    let start = hours.open;
    start + opts.durationMin <= hours.close;
    start += SLOT_STEP_MIN
  ) {
    if (opts.date < opts.now.date) continue;
    if (opts.date === opts.now.date && start < opts.now.min + MIN_NOTICE_MIN)
      continue;

    const end = start + opts.durationMin;
    const free = candidates.filter(
      (id) =>
        !opts.bookings.some(
          (b) => b.barberId === id && start < b.endMin && end > b.startMin,
        ),
    );
    if (free.length) slots.push({ startMin: start, barberIds: free });
  }
  return slots;
}

export function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
