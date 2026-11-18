"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getSlotsAction } from "@/app/book/actions";
import { dayOfWeek, formatTime, type Slot } from "@/lib/availability";
import {
  formatDate,
  isOpenDay,
  windowDates,
  type BookingDraft,
  type GetSlotsInput,
  type SlotsResult,
} from "@/lib/booking-shared";
import { FOCUS_RING, StepHeader, radioKeyDown } from "./ServiceStep";
import { useCatalog } from "./catalog-context";
import { useViewer } from "./viewer-context";

type Props = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  today: string | null;
  notice: string | null;
  /** Reschedule reuses this picker: custom slot source, no step header. */
  fetchSlots?: (input: GetSlotsInput) => Promise<SlotsResult>;
  hideHeader?: boolean;
  /** Bump to force a refetch of the times. */
  refreshKey?: number;
};

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const monthName = (date: string, style: "long" | "short") => {
  const [y, m] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: style }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
};

function rangeLabel(first: string, last: string): string {
  const fy = first.slice(0, 4);
  const ly = last.slice(0, 4);
  const fm = monthName(first, "long").toUpperCase();
  const lm = monthName(last, "long").toUpperCase();
  if (first.slice(0, 7) === last.slice(0, 7)) return `${fm} ${fy}`;
  if (fy === ly) return `${fm} — ${lm} ${ly}`;
  return `${fm} ${fy} — ${lm} ${ly}`;
}

const SLOT_GROUPS: { label: string; test: (min: number) => boolean }[] = [
  { label: "MORNING", test: (m) => m < 12 * 60 },
  { label: "AFTERNOON", test: (m) => m >= 12 * 60 && m < 17 * 60 },
  { label: "EVENING", test: (m) => m >= 17 * 60 },
];

type Fetched = { key: string; result: SlotsResult };

export default function DateTimeStep({
  draft,
  update,
  today,
  notice,
  fetchSlots = getSlotsAction,
  hideHeader,
  refreshKey = 0,
}: Props) {
  const catalog = useCatalog();
  const viewer = useViewer();
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { date, serviceId, barberId, addonIds, startMin } = draft;
  const addonKey = addonIds.join(",");
  const requestKey =
    date && serviceId && barberId
      ? `${date}|${serviceId}|${barberId}|${addonKey}|${attempt}|${refreshKey}`
      : null;

  // Fetch slots whenever the inputs change. State is only set in the async
  // callback; responses for an outdated key are ignored (stale request guard).
  useEffect(() => {
    if (!requestKey || !date || !serviceId || !barberId) return;
    let active = true;
    // Server actions take no AbortSignal, so the controller only marks the request
    // as abandoned: after 10 s (or on cleanup) its late response is ignored.
    const ctrl = new AbortController();
    const fail = (error: string) => {
      if (!ctrl.signal.aborted) setFetched({ key: requestKey, result: { ok: false, error } });
    };
    const timer = setTimeout(() => {
      fail("Loading times is taking too long. Check your connection and try again.");
      ctrl.abort();
    }, 10_000);
    fetchSlots({
      date,
      serviceId,
      barberId,
      addonIds: addonKey ? addonKey.split(",") : [],
    })
      .then((result) => {
        if (active && !ctrl.signal.aborted) setFetched({ key: requestKey, result });
      })
      .catch(() => {
        if (active) fail("Couldn't load times. Check your connection.");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [requestKey, date, serviceId, barberId, addonKey, fetchSlots]);

  const current = fetched && fetched.key === requestKey ? fetched.result : null;
  const loading = requestKey !== null && current === null;
  const slots: Slot[] = current?.ok ? current.slots : [];

  // Drop a selected time that's no longer available.
  useEffect(() => {
    if (!current?.ok || startMin == null) return;
    if (!current.slots.some((s) => s.startMin === startMin)) update({ startMin: null });
  }, [current, startMin, update]);

  const header = hideHeader ? null : (
    <StepHeader index={3} title="Pick a time." body="Closed days are greyed out and crossed through." />
  );

  if (!today) {
    return (
      <section>
        {header}
        <p aria-live="polite" className="text-sm text-white/50">
          Loading dates…
        </p>
        <div aria-hidden="true" className="mt-4 max-w-md grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} className="aspect-square border border-white/10 bg-white/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const dates = windowDates(today);
  const lead = (dayOfWeek(dates[0]) + 6) % 7; // Monday-first offset
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...dates];
  while (cells.length % 7 !== 0) cells.push(null);

  // A membership cut cannot be booked after the plan's last day.
  const memberCut = catalog.services.find((s) => s.id === serviceId)?.kind === "membership";
  const maxDate = memberCut && viewer.membership ? viewer.membership.endsOn : null;
  const isBookable = (d: string) => isOpenDay(catalog, d) && (maxDate == null || d <= maxDate);
  const isOpen = (d: string | null): d is string => d != null && isBookable(d);
  // Roving tabindex: one tab stop in the grid (selected day, else first open day).
  const roving =
    activeDate && isOpen(activeDate) && dates.includes(activeDate)
      ? activeDate
      : isOpen(date) && dates.includes(date)
        ? date
        : (dates.find((d) => isOpen(d)) ?? null);

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!from) return;
    const i = cells.indexOf(from);
    if (i < 0) return;
    let target: string | null = null;
    const walk = (step: number) => {
      for (let j = i + step; j >= 0 && j < cells.length; j += step) {
        if (isOpen(cells[j])) return cells[j];
      }
      return null;
    };
    switch (e.key) {
      case "ArrowRight":
        target = walk(1);
        break;
      case "ArrowLeft":
        target = walk(-1);
        break;
      case "ArrowDown":
        target = walk(7);
        break;
      case "ArrowUp":
        target = walk(-7);
        break;
      case "Home": {
        const row = Math.floor(i / 7) * 7;
        target = cells.slice(row, row + 7).find((c) => isOpen(c)) ?? null;
        break;
      }
      case "End": {
        const row = Math.floor(i / 7) * 7;
        target = [...cells.slice(row, row + 7)].reverse().find((c) => isOpen(c)) ?? null;
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    if (!target) return;
    setActiveDate(target);
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${target}"]`)?.focus();
  };

  const slotsHaveSelection = slots.some((s) => s.startMin === startMin);

  return (
    <section>
      {header}

      {notice && (
        <p role="alert" className="mb-6 text-sm text-red-400">
          {notice}
        </p>
      )}

      {maxDate && (
        <p className="mb-6 text-sm text-white/60">
          Your membership runs until {formatDate(maxDate, { long: true })}.
        </p>
      )}

      {/* Date picker */}
      <div className="max-w-md">
        <p className="mb-4 text-xs tracking-[0.2em] text-white/40">
          {rangeLabel(dates[0], dates[dates.length - 1])}
        </p>
        <div
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          className="grid grid-cols-7 gap-1 sm:gap-2"
          role="group"
          aria-label="Choose a date. Use arrow keys to move between days."
        >
          {WEEKDAYS.map((d) => (
            <span
              key={d}
              aria-hidden="true"
              className="pb-1 text-center text-[10px] tracking-[0.2em] text-white/40"
            >
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} aria-hidden="true" />;
            const open = isBookable(d);
            const pastPlan = maxDate != null && d > maxDate;
            const isToday = d === today;
            const selected = d === date;
            const day = Number(d.slice(8, 10));
            const showMonth = day === 1 || d === dates[0];
            const label = `${formatDate(d, { long: true })}${isToday ? ", today" : ""}${
              open ? "" : pastPlan ? ", after your membership ends" : ", closed"
            }`;
            return (
              <button
                key={d}
                type="button"
                data-date={d}
                disabled={!open}
                tabIndex={d === roving ? 0 : -1}
                onFocus={() => setActiveDate(d)}
                aria-pressed={selected}
                aria-label={label}
                onClick={() => update({ date: d })}
                className={`relative aspect-square min-h-11 min-w-0 flex flex-col items-center justify-center border text-sm transition ${FOCUS_RING} ${
                  selected
                    ? "bg-white text-black border-white"
                    : open
                      ? "border-white/10 hover:border-white/30"
                      : "border-transparent text-white/30 line-through decoration-white/50 cursor-not-allowed"
                }`}
              >
                {showMonth && (
                  <span
                    className={`text-[9px] leading-none tracking-[0.15em] ${
                      selected ? "text-black/60" : "text-white/40"
                    }`}
                  >
                    {monthName(d, "short").toUpperCase()}
                  </span>
                )}
                <span className="leading-tight">{day}</span>
                {isToday && (
                  <span
                    className={`text-[8px] leading-none tracking-[0.15em] ${
                      selected ? "text-black/60" : "text-white/50"
                    }`}
                  >
                    TODAY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Times */}
      <div className="mt-10">
        <p className="sr-only" aria-live="polite">
          {!date
            ? ""
            : loading
              ? "Loading times"
              : current && !current.ok
                ? current.error
                : slots.length === 0
                  ? "No times left on this day."
                  : `${slots.length} times available`}
        </p>
        {!date ? (
          <p className="text-sm text-white/40">Choose a date to see times.</p>
        ) : loading ? (
          <div aria-hidden="true">
            <p className="mb-3 text-sm text-white/50">Loading times…</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-11 border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        ) : current && !current.ok ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-red-400">{current.error}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className={`px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
            >
              TRY AGAIN
            </button>
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-white/50">No times left on this day. Try another.</p>
        ) : (
          <div
            role="radiogroup"
            aria-label={`Available times on ${formatDate(date, { long: true })}`}
            className="space-y-6"
          >
            {SLOT_GROUPS.map((g) => {
              const group = slots.filter((s) => g.test(s.startMin));
              if (group.length === 0) return null;
              return (
                <div key={g.label}>
                  <p className="mb-3 text-xs tracking-[0.2em] text-white/40">{g.label}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {group.map((s) => {
                      const checked = s.startMin === startMin;
                      const tabbable =
                        checked || (!slotsHaveSelection && s.startMin === slots[0].startMin);
                      return (
                        <button
                          key={s.startMin}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          tabIndex={tabbable ? 0 : -1}
                          onClick={() => update({ startMin: s.startMin })}
                          onKeyDown={radioKeyDown}
                          aria-label={`${formatTime(s.startMin)}, ${formatDate(date, { long: true })}`}
                          className={`py-3 text-sm border transition ${FOCUS_RING} ${
                            checked
                              ? "bg-white text-black border-white"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {formatTime(s.startMin)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
