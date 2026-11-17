"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/availability";
import {
  addonPrice,
  formatDate,
  formatGBP,
  getBarberName,
  getService,
  quote,
  resolveAddons,
  type BookingDraft,
} from "@/lib/booking-shared";
import { FOCUS_RING, StepHeader } from "./ServiceStep";

type Props = {
  draft: BookingDraft;
  onEdit: (step: number) => void;
  error: string | null;
};

function Section({
  label,
  step,
  onEdit,
  children,
}: {
  label: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="py-5 first:pt-0 border-b border-white/10">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs tracking-[0.2em] text-white/40">{label}</p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${label.toLowerCase()}`}
          className={`text-xs tracking-[0.2em] text-white/40 underline underline-offset-4 hover:text-white transition ${FOCUS_RING}`}
        >
          EDIT
        </button>
      </div>
      <div className="mt-2 text-sm text-white/80 space-y-1">{children}</div>
    </div>
  );
}

export default function ReviewStep({ draft, onEdit, error }: Props) {
  const service = getService(draft.serviceId);
  const chosen = resolveAddons(draft.addonIds);
  const q = quote(draft.serviceId, draft.addonIds);
  const barberName = getBarberName(draft.barberId);

  return (
    <section>
      <StepHeader index={5} title="Review and confirm." body="Check everything looks right." />

      {error && (
        <p role="alert" className="mb-6 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="bg-[#111] border border-white/10 rounded-xl p-6 md:p-8">
        <Section label="SERVICE" step={0} onEdit={onEdit}>
          <p className="flex justify-between gap-4">
            <span>{service?.name ?? "Not chosen"}</span>
            {service && (
              <span className="text-white/50 shrink-0">
                {service.kind === "membership" ? "Included" : formatGBP(service.priceGBP)}
              </span>
            )}
          </p>
          {chosen.map((a) => {
            const price = addonPrice(service, a);
            return (
              <p key={a.id} className="flex justify-between gap-4 text-white/50">
                <span>+ {a.name}</span>
                <span className="shrink-0">{price === 0 ? "Included" : formatGBP(price)}</span>
              </p>
            );
          })}
        </Section>

        <Section label="BARBER" step={1} onEdit={onEdit}>
          <p>{barberName ?? "Not chosen"}</p>
        </Section>

        <Section label="DATE & TIME" step={2} onEdit={onEdit}>
          <p>{draft.date ? formatDate(draft.date, { long: true }) : "Not chosen"}</p>
          {draft.startMin != null && (
            <p className="text-white/50">
              {formatTime(draft.startMin)}
              {q ? ` – ${formatTime(draft.startMin + q.durationMin)}` : ""}
            </p>
          )}
        </Section>

        <Section label="YOUR DETAILS" step={3} onEdit={onEdit}>
          <p>{draft.name}</p>
          <p className="text-white/50 break-all">{draft.email}</p>
          <p className="text-white/50">{draft.phone}</p>
          {draft.notes.trim() && (
            <p className="text-white/50 whitespace-pre-line break-words">{draft.notes}</p>
          )}
        </Section>

        {q && (
          <div className="pt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-white/40">TOTAL</p>
              <p className="mt-1 text-sm text-white/50">{q.durationMin} min</p>
            </div>
            <p className="text-3xl font-[500] tracking-[-0.02em]">{formatGBP(q.totalGBP)}</p>
          </div>
        )}
      </div>

      <div className="mt-6 border border-dashed border-white/20 rounded-xl p-6">
        <p className="text-xs tracking-[0.2em] text-white/40">DEPOSIT</p>
        <p className="mt-2 text-sm text-white/60">
          Card deposit coming soon. Nothing is charged today.
        </p>
        {/* TODO(payments): Stripe deposit (PaymentElement) mounts here. */}
      </div>

      <p className="mt-6 text-xs text-white/40">
        By confirming you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-white transition">
          Terms &amp; Conditions
        </Link>
        .
      </p>
    </section>
  );
}
