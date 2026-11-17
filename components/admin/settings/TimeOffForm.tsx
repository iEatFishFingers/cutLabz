"use client";

import { useActionState } from "react";
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
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    addTimeOff,
    null,
  );
  return (
    <form action={action} className={CARD}>
      <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-white/60">Add time off</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="to-barber" className={LABEL}>
            Barber
          </label>
          <select id="to-barber" name="barberId" required className={INPUT} defaultValue="">
            <option value="" disabled>
              Choose a barber
            </option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError result={result} name="barberId" />
        </div>
        <div>
          <label htmlFor="to-start" className={LABEL}>
            Start date
          </label>
          <input id="to-start" name="startDate" type="date" min={minDate} required className={INPUT} />
          <FieldError result={result} name="startDate" />
        </div>
        <div>
          <label htmlFor="to-end" className={LABEL}>
            End date
          </label>
          <input id="to-end" name="endDate" type="date" min={minDate} required className={INPUT} />
          <FieldError result={result} name="endDate" />
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
            className={INPUT}
          />
          <FieldError result={result} name="reason" />
        </div>
      </div>
      <button type="submit" disabled={pending} className={`${BTN_PRIMARY} mt-6`}>
        {pending ? "Saving..." : "Add time off"}
      </button>
      <ResultMessage result={result} />
    </form>
  );
}
