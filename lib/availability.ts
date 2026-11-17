import { SLOT_STEP_MIN, MIN_NOTICE_MIN, type ServerCatalog } from "./catalog";
import type { Booking } from "./store";

export type Slot = { startMin: number; barberIds: string[] };

export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Free start times for a service of `durationMin` on `date`. */
const dayNum = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};

export function computeSlots(opts: {
  date: string;
  durationMin: number;
  barberId: string | "any";
  bookings: Booking[];
  /** Current shop-local date + minutes, used to hide past/too-soon times. */
  now: { date: string; min: number };
  catalog: ServerCatalog;
}): Slot[] {
  const { catalog } = opts;
  if (opts.date < opts.now.date) return [];
  const dow = dayOfWeek(opts.date);
  const dayDiff = dayNum(opts.date) - dayNum(opts.now.date); // >= 0 here

  const onLeave = (id: string) =>
    catalog.timeOff.some(
      (t) => t.barberId === id && opts.date >= t.startDate && opts.date <= t.endDate,
    );
  const candidates = catalog.barbers
    .filter((b) => opts.barberId === "any" || b.id === opts.barberId)
    .filter((b) => !onLeave(b.id));

  const starts = new Set<number>();
  for (const b of candidates)
    for (const w of b.hours[dow] ?? [])
      for (let s = w.open; s + opts.durationMin <= w.close; s += SLOT_STEP_MIN) starts.add(s);

  const slots: Slot[] = [];
  for (const start of [...starts].sort((x, y) => x - y)) {
    if (dayDiff * 1440 + start < opts.now.min + MIN_NOTICE_MIN) continue;

    const end = start + opts.durationMin;
    const free = candidates
      .filter((b) => (b.hours[dow] ?? []).some((w) => start >= w.open && end <= w.close))
      .map((b) => b.id)
      .filter(
        (id) =>
          !opts.bookings.some((bk) => bk.barberId === id && start < bk.endMin && end > bk.startMin),
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
