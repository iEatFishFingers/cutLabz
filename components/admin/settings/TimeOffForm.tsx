"use client";

import { useActionState, useState } from "react";
import { useFieldErrors } from "./use-field-errors";

/** Shift a YYYY-MM-DD date by whole years/days (UTC, no timezone drift). */
function shiftDate(date: string, by: { years?: number; days?: number }): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y + (by.years ?? 0), m - 1, d + (by.days ?? 0)));
  return t.toISOString().slice(0, 10);
}
import { addTimeOff } from "@/app/admin/(panel)/time-off/actions";
import { LIMITS, type ActionResult } from "@/lib/admin/catalog-admin";
import { BTN_PRIMARY, CARD, FieldError, INPUT, LABEL, ResultMessage } from "./ui";

export default function TimeOffForm({
  barbers,
  minDate,
}: {
  barbers: { id: string; name: string }[];
  minDate: string;
}) {
  const blank = { barberId: "", startDate: "", endDate: "", reason: "" };
  const [vals, setVals] = useState(blank);
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const r = await addTimeOff(prev, fd);
      if (r.ok) setVals(blank);
      return r;
    },
    null,
  );
  const { err, clear } = useFieldErrors(result);
  const set = (k: keyof typeof blank, v: string) => {
    setVals((p) => ({ ...p, [k]: v }));
    clear(k);
  };
  const maxStart = shiftDate(minDate, { years: 2 });
  const endMin = vals.startDate && vals.startDate > minDate ? vals.startDate : minDate;
  const endMax = shiftDate(vals.startDate || maxStart, { days: 365 });
  return (
    <form action={action} className={CARD}>
      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-white/60">Add time off</h2>
      <p className="mb-4 text-xs text-white/40">
        One block can last up to a year, and can start up to two years from now. For longer
        absences, add a second block.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="to-barber" className={LABEL}>
            Barber
          </label>
          <select id="to-barber" name="barberId" required className={INPUT} value={vals.barberId} onChange={(e) => set("barberId", e.target.value)}>
            <option value="" disabled>
              Choose a barber
            </option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError message={err("barberId")} />
        </div>
        <div>
          <label htmlFor="to-start" className={LABEL}>
            Start date
          </label>
          <input
            id="to-start"
            name="startDate"
            type="date"
            min={minDate}
            max={maxStart}
            required
            value={vals.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className={INPUT}
          />
          <FieldError message={err("startDate")} />
        </div>
        <div>
          <label htmlFor="to-end" className={LABEL}>
            End date
          </label>
          <input
            id="to-end"
            name="endDate"
            type="date"
            min={endMin}
            max={endMax}
            required
            value={vals.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            className={INPUT}
          />
          <FieldError message={err("endDate")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="to-reason" className={LABEL}>
            Reason <span className="text-white/30">(optional, private)</span>
          </label>
          <input
            id="to-reason"
            name="reason"
            type="text"
            maxLength={LIMITS.reason}
            value={vals.reason}
            onChange={(e) => set("reason", e.target.value)}
            className={INPUT}
          />
          <FieldError message={err("reason")} />
        </div>
      </div>
      <button type="submit" disabled={pending} className={`${BTN_PRIMARY} mt-6`}>
        {pending ? "Saving..." : "Add time off"}
      </button>
      <ResultMessage result={result} />
    </form>
  );
}
