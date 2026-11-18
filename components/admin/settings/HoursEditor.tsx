"use client";

import { useActionState, useMemo, useState } from "react";
import { saveHours } from "@/app/admin/(panel)/hours/actions";
import {
  MAX_WINDOWS_PER_DAY,
  WEEKDAY_NAMES,
  WEEK_ORDER,
  minutesToHHMM,
  validateWindows,
  type ActionResult,
  type TimeWindow,
  type WeekSchedule,
} from "@/lib/admin/catalog-admin";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT, ResultMessage } from "./ui";

export type BarberHours = {
  id: string;
  name: string;
  active: boolean;
  schedule: WeekSchedule;
};

const DEFAULT_WINDOW: TimeWindow = { open: 660, close: 1260 };
const TIMES = Array.from({ length: 97 }, (_, i) => i * 15);
const clone = (s: WeekSchedule): WeekSchedule =>
  Object.fromEntries(
    Object.entries(s).map(([k, v]) => [k, v.map((w) => ({ ...w }))]),
  ) as WeekSchedule;

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const opts = TIMES.includes(value) ? TIMES : [...TIMES, value].sort((a, b) => a - b);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${INPUT} !w-auto min-w-[6.5rem] px-3`}
    >
      {opts.map((m) => (
        <option key={m} value={m}>
          {minutesToHHMM(m)}
        </option>
      ))}
    </select>
  );
}

export default function HoursEditor({ barbers }: { barbers: BarberHours[] }) {
  const [drafts, setDrafts] = useState<Record<string, WeekSchedule>>(() =>
    Object.fromEntries(barbers.map((b) => [b.id, clone(b.schedule)])),
  );
  const [saved, setSaved] = useState<Record<string, string>>(() =>
    Object.fromEntries(barbers.map((b) => [b.id, JSON.stringify(b.schedule)])),
  );
  const [selected, setSelected] = useState(barbers[0].id);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [justOpened, setJustOpened] = useState<string[]>([]);
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const r = await saveHours(prev, fd);
      setConfirmFor(null);
      if (r.ok) {
        const id = String(fd.get("barberId"));
        setSaved((s) => ({ ...s, [id]: String(fd.get("schedule")) }));
      }
      return r;
    },
    null,
  );

  const schedule = drafts[selected];
  const serialized = useMemo(() => JSON.stringify(schedule), [schedule]);
  const dirty = (id: string) => JSON.stringify(drafts[id]) !== saved[id];

  const setDay = (wd: number, windows: TimeWindow[]) =>
    setDrafts((d) => ({ ...d, [selected]: { ...d[selected], [wd]: windows } }));

  const dayErrors = WEEK_ORDER.map((wd) => validateWindows(schedule[wd] ?? []));
  const hasError = dayErrors.some(Boolean);
  const allClosed = WEEK_ORDER.every((wd) => (schedule[wd] ?? []).length === 0);
  const confirmKey = `${selected}:${serialized}`;
  const confirming = allClosed && confirmFor === confirmKey;
  const selectedName = barbers.find((b) => b.id === selected)?.name ?? "this barber";
  const others = barbers.filter((b) => b.id !== selected);

  const copyDay = (from: number) => {
    setDrafts((d) => {
      const src = d[selected][from] ?? [];
      const next = { ...d[selected] };
      for (const wd of WEEK_ORDER) if (wd !== from) next[wd] = src.map((w) => ({ ...w }));
      return { ...d, [selected]: next };
    });
    setCopyFrom(null);
  };

  const copyToBarber = (id: string) => {
    setDrafts((d) => ({ ...d, [id]: clone(d[selected]) }));
    setSelected(id);
  };

  return (
    <div>
      <div role="tablist" aria-label="Barber" className="mb-6 flex flex-wrap gap-2">
        {barbers.map((b) => (
          <button
            key={b.id}
            role="tab"
            type="button"
            aria-selected={b.id === selected}
            onClick={() => setSelected(b.id)}
            className={`min-h-11 px-4 border text-xs uppercase tracking-[0.2em] transition ${
              b.id === selected
                ? "bg-white text-black border-white"
                : "border-white/20 text-white hover:bg-white hover:text-black"
            }`}
          >
            {b.name}
            {b.active ? "" : " (inactive)"}
            {dirty(b.id) ? " (unsaved)" : ""}
          </button>
        ))}
      </div>

      <form action={action} className={CARD}>
        <input type="hidden" name="barberId" value={selected} />
        <input type="hidden" name="schedule" value={serialized} />

        <ul className="divide-y divide-white/10">
          {WEEK_ORDER.map((wd, i) => {
            const windows = schedule[wd] ?? [];
            const closed = windows.length === 0;
            return (
              <li key={wd} className="py-4 first:pt-0 last:pb-0">
                <label className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/60">
                  <span>{WEEKDAY_NAMES[wd]}</span>
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-white"
                      checked={!closed}
                      onChange={(e) => {
                        setDay(wd, e.target.checked ? [{ ...DEFAULT_WINDOW }] : []);
                        setJustOpened((j) => {
                          const k = `${selected}-${wd}`;
                          const rest = j.filter((x) => x !== k);
                          return e.target.checked ? [...rest, k] : rest;
                        });
                      }}
                    />
                    Open
                  </span>
                </label>

                {closed ? (
                  <p className="mt-1 text-sm text-white/30">Closed</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {windows.map((w, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <TimeSelect
                          label={`${WEEKDAY_NAMES[wd]} window ${idx + 1} opens`}
                          value={w.open}
                          onChange={(v) =>
                            setDay(
                              wd,
                              windows.map((x, j) => (j === idx ? { ...x, open: v } : x)),
                            )
                          }
                        />
                        <span className="text-white/40" aria-hidden="true">
                          to
                        </span>
                        <TimeSelect
                          label={`${WEEKDAY_NAMES[wd]} window ${idx + 1} closes`}
                          value={w.close}
                          onChange={(v) =>
                            setDay(
                              wd,
                              windows.map((x, j) => (j === idx ? { ...x, close: v } : x)),
                            )
                          }
                        />
                        <button
                          type="button"
                          className={BTN_SECONDARY}
                          aria-label={`Remove ${WEEKDAY_NAMES[wd]} window ${idx + 1}`}
                          onClick={() => setDay(wd, windows.filter((_, j) => j !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!closed &&
                justOpened.includes(`${selected}-${wd}`) &&
                windows.length === 1 &&
                windows[0].open === DEFAULT_WINDOW.open &&
                windows[0].close === DEFAULT_WINDOW.close ? (
                  <p className="mt-2 text-xs text-white/50">
                    Opens 11:00-21:00 by default, change below
                  </p>
                ) : null}

                {dayErrors[i] ? (
                  <p role="alert" className="mt-2 text-xs text-red-400">
                    {dayErrors[i]}
                  </p>
                ) : null}

                {!closed ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {windows.length < MAX_WINDOWS_PER_DAY ? (
                      <button
                        type="button"
                        className={BTN_SECONDARY}
                        onClick={() => {
                          const last = windows[windows.length - 1];
                          const open = Math.min(last.close, 1425);
                          setDay(wd, [...windows, { open, close: Math.min(open + 60, 1440) }]);
                        }}
                      >
                        Add window
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={() => setCopyFrom(copyFrom === wd ? null : wd)}
                      aria-expanded={copyFrom === wd}
                    >
                      Copy to other days
                    </button>
                  </div>
                ) : null}

                {copyFrom === wd ? (
                  <div className="mt-2 border border-white/10 bg-[#0a0a0a] p-3">
                    <p className="text-xs text-white/50">
                      Replace every other day of {barbers.find((b) => b.id === selected)?.name} with{" "}
                      {WEEKDAY_NAMES[wd]}&apos;s hours?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className={BTN_PRIMARY} onClick={() => copyDay(wd)}>
                        Copy
                      </button>
                      <button type="button" className={BTN_SECONDARY} onClick={() => setCopyFrom(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
          {confirming ? (
            <div className="w-full border border-red-400/30 bg-[#0a0a0a] p-3">
              <p className="text-sm text-white/70">
                Every day is closed, so nobody can book {selectedName} online. Save anyway?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className={BTN_PRIMARY}>
                  {pending ? "Saving..." : "Yes, save"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={BTN_SECONDARY}
                  onClick={() => setConfirmFor(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : allClosed ? (
            <button
              type="button"
              disabled={pending || hasError}
              className={BTN_PRIMARY}
              onClick={() => setConfirmFor(confirmKey)}
            >
              Save hours
            </button>
          ) : (
            <button type="submit" disabled={pending || hasError} className={BTN_PRIMARY}>
              {pending ? "Saving..." : "Save hours"}
            </button>
          )}
          {dirty(selected) ? (
            <span className="border border-amber-400/50 px-2 py-1 text-xs uppercase tracking-[0.2em] text-amber-300">
              Unsaved changes
            </span>
          ) : null}
          {others.map((b) => (
            <button
              key={b.id}
              type="button"
              className={BTN_SECONDARY}
              onClick={() => copyToBarber(b.id)}
            >
              Copy to {b.name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Copying to another barber fills their draft and switches to them; press Save there to
          apply. Barbers with unsaved changes are marked (unsaved).
        </p>
        <ResultMessage result={result} />
      </form>
    </div>
  );
}
