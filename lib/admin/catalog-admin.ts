// Pure helpers + shared types for the admin settings pages (hours, time off,
// services, barbers). No server-only imports so these are unit-testable.

export type ActionResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const MAX_WINDOWS_PER_DAY = 4;

export const LIMITS = {
  serviceName: 60,
  description: 120,
  addonName: 60,
  barberName: 60,
  barberRole: 60,
  reason: 200,
  maxDurationMin: 600,
  maxPricePence: 9_999_999,
  maxExtraMin: 600,
} as const;

/** Display order Mon..Sun, as DB weekday numbers (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/* ---------- minutes <-> HH:MM ---------- */

export function minutesToHHMM(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.trunc(min)));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "HH:MM" (00:00..24:00) -> minutes, or null if invalid. */
export function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(s.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]);
  return total <= 1440 ? total : null;
}

/* ---------- opening windows ---------- */

export type TimeWindow = { open: number; close: number };
export type WeekSchedule = Record<number, TimeWindow[]>;

export function sortWindows(windows: TimeWindow[]): TimeWindow[] {
  return [...windows].sort((a, b) => a.open - b.open || a.close - b.close);
}

/** Returns an error message, or null when the windows are valid. Any input
 *  order; overlap is checked after sorting. Touching windows are allowed. */
export function validateWindows(windows: TimeWindow[]): string | null {
  if (windows.length > MAX_WINDOWS_PER_DAY) {
    return `At most ${MAX_WINDOWS_PER_DAY} opening windows per day.`;
  }
  for (const w of windows) {
    if (!Number.isInteger(w.open) || !Number.isInteger(w.close)) {
      return "Times must be whole minutes.";
    }
    if (w.open < 0 || w.close > 1440) return "Times must be within 00:00 and 24:00.";
    if (w.open >= w.close) return "Opening time must be before closing time.";
  }
  const s = sortWindows(windows);
  for (let i = 1; i < s.length; i++) {
    if (s[i].open < s[i - 1].close) return "Opening windows must not overlap.";
  }
  return null;
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.open < b.close && b.open < a.close;
}

/** True when [startMin, endMin) fits entirely inside one window. */
export function isWithinWindows(
  startMin: number,
  endMin: number,
  windows: TimeWindow[],
): boolean {
  return windows.some((w) => startMin >= w.open && endMin <= w.close);
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD date, timezone independent. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isDateString(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Parse + validate untrusted JSON for a barber's week. Returns a sorted
 *  schedule with all 7 weekdays present. */
export function parseSchedule(
  raw: unknown,
): { ok: true; schedule: WeekSchedule } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid schedule." };
  }
  const obj = raw as Record<string, unknown>;
  const schedule: WeekSchedule = {};
  for (let wd = 0; wd <= 6; wd++) {
    const list = obj[String(wd)] ?? [];
    if (!Array.isArray(list)) {
      return { ok: false, error: `${WEEKDAY_NAMES[wd]}: invalid windows.` };
    }
    if (list.length > MAX_WINDOWS_PER_DAY) {
      return {
        ok: false,
        error: `${WEEKDAY_NAMES[wd]}: At most ${MAX_WINDOWS_PER_DAY} opening windows per day.`,
      };
    }
    const windows: TimeWindow[] = [];
    for (const w of list) {
      const open = (w as { open?: unknown } | null)?.open;
      const close = (w as { close?: unknown } | null)?.close;
      if (typeof open !== "number" || typeof close !== "number") {
        return { ok: false, error: `${WEEKDAY_NAMES[wd]}: invalid times.` };
      }
      windows.push({ open, close });
    }
    const err = validateWindows(windows);
    if (err) return { ok: false, error: `${WEEKDAY_NAMES[wd]}: ${err}` };
    schedule[wd] = sortWindows(windows);
  }
  return { ok: true, schedule };
}

export function scheduleToRows(barberId: string, schedule: WeekSchedule) {
  const rows: { barber_id: string; weekday: number; open_min: number; close_min: number }[] = [];
  for (let wd = 0; wd <= 6; wd++) {
    for (const w of schedule[wd] ?? []) {
      rows.push({ barber_id: barberId, weekday: wd, open_min: w.open, close_min: w.close });
    }
  }
  return rows;
}

export function rowsToSchedule(
  rows: { weekday: number; open_min: number; close_min: number }[],
): WeekSchedule {
  const s: WeekSchedule = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rows) {
    if (r.weekday >= 0 && r.weekday <= 6) {
      s[r.weekday].push({ open: r.open_min, close: r.close_min });
    }
  }
  for (let wd = 0; wd <= 6; wd++) s[wd] = sortWindows(s[wd]);
  return s;
}

/* ---------- money ---------- */

/** Parse "12", "12.5", "12.50", "£12.50" -> integer pence, or null. Integer
 *  maths only (no float drift). Max 99,999.99. */
export function parsePounds(input: string): number | null {
  const m = /^\s*£?\s*(\d{1,5})(?:\.(\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(2, "0");
  return Number(m[1]) * 100 + Number(frac || "0");
}

/** Pence -> "12.50" (no currency symbol, for form inputs). */
export function formatPounds(pence: number): string {
  const p = Math.max(0, Math.trunc(pence));
  return `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
}

export function formatPriceLabel(pence: number): string {
  return `£${formatPounds(pence)}`;
}

/* ---------- ids ---------- */

/** Ids that must never be generated (e.g. "any" is the any-barber sentinel). */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "any",
  "item",
  "new",
  "none",
  "all",
  "default",
]);

export const isReservedSlug = (s: string): boolean => RESERVED_SLUGS.has(s);

/** Lowercase hyphenated slug (max 40). Returns "" when the name has no
 *  letters or numbers; callers must reject that. */
export function slugify(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s;
}

/** True when the name yields a usable slug (has letters/numbers). */
export const hasSlug = (name: string): boolean => slugify(name) !== "";

/** base, base-2, base-3 ... first not in `taken`; reserved slugs count as
 *  taken. An empty base becomes "item" (then "item-2", as "item" is reserved). */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  for (const r of RESERVED_SLUGS) set.add(r);
  if (!base) base = "item";
  if (!set.has(base)) return base;
  for (let i = 2; i < 10_000; i++) {
    if (!set.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* ---------- small validators ---------- */

/** Trim, replace control chars; returns null if not a string, too long, or
 *  empty (unless allowEmpty). */
export function cleanText(
  v: unknown,
  max: number,
  opts?: { allowEmpty?: boolean },
): string | null {
  if (typeof v !== "string") return null;
  const t = v
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/[‪-‮⁦-⁩‎‏]/g, "")
    .trim();
  if (t.length > max) return null;
  if (t.length === 0 && !opts?.allowEmpty) return null;
  return t;
}

/** Whole phrase by count; `{n}` in the template is replaced by the number. */
export function pluralPhrase(n: number, one: string, many: string): string {
  return (n === 1 ? one : many).replace("{n}", String(n));
}

/* ---------- time off sanity ---------- */

export const TIME_OFF_MAX_DAYS = 366;
export const TIME_OFF_MAX_START_YEARS = 2;
export const TIME_OFF_MAX_END_YEARS = 3;

const dayNumber = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};

/** Same calendar day `years` ahead (29 Feb falls back to 28 Feb). */
function plusYears(date: string, years: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y + years, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}

/** Returns a field error for a time-off range, or null. Dates must be valid
 *  YYYY-MM-DD with end >= start; `today` is the shop-local date. */
export function validateTimeOffRange(
  start: string,
  end: string,
  today: string,
): { field: "startDate" | "endDate"; error: string } | null {
  if (dayNumber(end) - dayNumber(start) + 1 > TIME_OFF_MAX_DAYS) {
    return { field: "endDate", error: `Time off can be at most ${TIME_OFF_MAX_DAYS} days long.` };
  }
  if (start > plusYears(today, TIME_OFF_MAX_START_YEARS)) {
    return {
      field: "startDate",
      error: `Time off can't start more than ${TIME_OFF_MAX_START_YEARS} years from now.`,
    };
  }
  if (end > plusYears(today, TIME_OFF_MAX_END_YEARS)) {
    return {
      field: "endDate",
      error: `Time off can't end more than ${TIME_OFF_MAX_END_YEARS} years from now.`,
    };
  }
  return null;
}

/** Strict integer from a form string (digits only, 1-6 chars). */
export function parseIntStrict(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "string" || !/^\d{1,6}$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return n >= min && n <= max ? n : null;
}
