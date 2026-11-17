"use client";

import { useEffect, useState } from "react";
import { getSlotsAction } from "@/app/book/actions";
import { dayOfWeek, formatTime, type Slot } from "@/lib/availability";
import {
  formatDate,
  isOpenDay,
  windowDates,
  type BookingDraft,
  type SlotsResult,
} from "@/lib/booking-shared";
import { FOCUS_RING, StepHeader, radioKeyDown } from "./ServiceStep";

type Props = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  today: string | null;
  notice: string | null;
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

export default function DateTimeStep({ draft, update, today, notice }: Props) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { date, serviceId, barberId, addonIds, startMin } = draft;
  const addonKey = addonIds.join(",");
  const requestKey =
    date && serviceId && barberId
      ? `${date}|${serviceId}|${barberId}|${addonKey}|${attempt}`
      : null;

  // Fetch slots whenever the inputs change. State is only set in the async
  // callback; responses for an outdated key are ignored (stale request guard).
  useEffect(() => {
    if (!requestKey || !date || !serviceId || !barberId) return;
    let active = true;
    getSlotsAction({
      date,
      serviceId,
      barberId,
      addonIds: addonKey ? addonKey.split(",") : [],
    })
      .then((result) => {
        if (active) setFetched({ key: requestKey, result });
      })
      .catch(() => {
        if (active)
          setFetched({
            key: requestKey,
            result: { ok: false, error: "Couldn't load times. Check your connection." },
          });
      });
    return () => {
      active = false;
    };
  }, [requestKey, date, serviceId, barberId, addonKey]);

  const current = fetched && fetched.key === requestKey ? fetched.result : null;
  const loading = requestKey !== null && current === null;
  const slots: Slot[] = current?.ok ? current.slots : [];

  // Drop a selected time that's no longer available.
  useEffect(() => {
    if (!current?.ok || startMin == null) return;
    if (!current.slots.some((s) => s.startMin === startMin)) update({ startMin: null });
  }, [current, startMin, update]);

  const header = (
    <StepHeader index={3} title="Pick a time." body="Open Tuesday to Saturday, 11:00 to 21:00." />
  );

  if (!today) {
    return (
      <section>
        {header}
        <p aria-live="polite" className="text-sm text-white/40">
          Loading dates…
        </p>
      </section>
    );
  }

  const dates = windowDates(today);
  const lead = (dayOfWeek(dates[0]) + 6) % 7; // Monday-first offset
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...dates];
  while (cells.length % 7 !== 0) cells.push(null);

  const slotsHaveSelection = slots.some((s) => s.startMin === startMin);

  return (
    <section>
      {header}

      {notice && (
        <p role="alert" className="mb-6 text-sm text-red-400">
          {notice}
        </p>
      )}

      {/* Date picker */}
      <div className="max-w-md">
        <p className="mb-4 text-xs tracking-[0.2em] text-white/40">
          {rangeLabel(dates[0], dates[dates.length - 1])}
        </p>
        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Choose a date">
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
            const open = isOpenDay(d);
            const isToday = d === today;
            const selected = d === date;
            const day = Number(d.slice(8, 10));
            const showMonth = day === 1 || d === dates[0];
            const label = `${formatDate(d, { long: true })}${isToday ? ", today" : ""}${
              open ? "" : ", closed"
            }`;
            return (
              <button
                key={d}
                type="button"
                disabled={!open}
                aria-disabled={!open}
                aria-pressed={selected}
                aria-label={label}
                onClick={() => update({ date: d })}
                className={`relative aspect-square min-h-10 min-w-10 flex flex-col items-center justify-center border text-sm transition ${FOCUS_RING} ${
                  selected
                    ? "bg-white text-black border-white"
                    : open
                      ? "border-white/10 hover:border-white/30"
                      : "border-transparent text-white/20 line-through cursor-not-allowed"
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
          <p className="text-sm text-white/40">Loading times…</p>
        ) : current && !current.ok ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-red-400">{current.error}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className={`px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
            >
              RETRY
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
