"use client";

import { useState } from "react";
import {
  LIMITS,
  validateDetails,
  type BookingDraft,
  type DetailsField,
} from "@/lib/booking-shared";
import { StepHeader } from "./ServiceStep";

type Props = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  showErrors: boolean;
};

const INPUT =
  "w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition";
const INPUT_INVALID = "border-white/30";
const LABEL = "mb-2 block text-xs tracking-[0.2em] text-white/40";

export default function DetailsStep({ draft, update, showErrors }: Props) {
  const [touched, setTouched] = useState<Partial<Record<DetailsField, boolean>>>({});
  const errors = validateDetails(draft);

  const errorFor = (f: DetailsField) =>
    showErrors || touched[f] ? errors[f] : undefined;
  const blur = (f: DetailsField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const fieldProps = (f: DetailsField) => {
    const err = errorFor(f);
    return {
      id: `details-${f}`,
      name: f,
      value: draft[f],
      onBlur: blur(f),
      maxLength: LIMITS[f],
      "aria-invalid": err ? true : undefined,
      "aria-describedby": err ? `details-${f}-error` : undefined,
      className: `${INPUT} ${err ? INPUT_INVALID : ""}`,
    };
  };

  const errorText = (f: DetailsField) => {
    const err = errorFor(f);
    return err ? (
      <p id={`details-${f}-error`} className="mt-2 text-xs text-red-400">
        {err}
      </p>
    ) : null;
  };

  return (
    <section>
      <StepHeader index={4} title="Your details." body="So we know who's in the chair." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="details-name" className={LABEL}>
            NAME
          </label>
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            onChange={(e) => update({ name: e.target.value })}
          />
          {errorText("name")}
        </div>

        <div>
          <label htmlFor="details-email" className={LABEL}>
            EMAIL
          </label>
          <input
            {...fieldProps("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(e) => update({ email: e.target.value })}
          />
          {errorText("email")}
        </div>

        <div>
          <label htmlFor="details-phone" className={LABEL}>
            PHONE
          </label>
          <input
            {...fieldProps("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07700 900123"
            onChange={(e) => update({ phone: e.target.value })}
          />
          {errorText("phone")}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="details-notes" className={LABEL}>
              NOTES <span className="text-white/30">(OPTIONAL)</span>
            </label>
            <span className="text-xs text-white/30" aria-hidden="true">
              {draft.notes.length}/{LIMITS.notes}
            </span>
          </div>
          <textarea
            {...fieldProps("notes")}
            rows={4}
            placeholder="Anything we should know?"
            onChange={(e) => update({ notes: e.target.value })}
            className={`${fieldProps("notes").className} resize-none`}
          />
          {errorText("notes")}
        </div>
      </div>

      <p className="mt-6 text-xs text-white/40">
        We&apos;ll only use this to confirm your booking.
      </p>
    </section>
  );
}
