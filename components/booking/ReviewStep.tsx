"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/availability";
import {
  formatDate,
  formatGBP,
  getBarberName,
  shopNow,
  type BookingDraft,
} from "@/lib/booking-shared";
import { SHOP_CONTACT } from "@/lib/shop-contact";
import { FOCUS_RING, StepHeader } from "./ServiceStep";
import { useCatalog } from "./catalog-context";
import { INCLUDED_WITH_PREMIUM, useDraftQuote } from "./useDraftQuote";

export function ContactLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-white/70 ${className}`}>
      <a
        href={SHOP_CONTACT.phoneHref}
        className="inline-flex items-center min-h-11 underline underline-offset-4 hover:text-white transition"
      >
        {SHOP_CONTACT.phone}
      </a>
      <span aria-hidden="true"> · </span>
      <a
        href={SHOP_CONTACT.emailHref}
        className="inline-flex items-center min-h-11 underline underline-offset-4 hover:text-white transition"
      >
        {SHOP_CONTACT.email}
      </a>
    </p>
  );
}

type Props = {
  draft: BookingDraft;
  onEdit: (step: number) => void;
  error: string | null;
  /** Shown as a button next to the error when the menu is stale. */
  onReload?: () => void;
  /** Link shown next to the error (sign in, membership, appointments). */
  link?: { href: string; label: string } | null;
  /** True only for network/unknown failures, where the booking may have gone through. */
  uncertain?: boolean;
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

/** Minutes from now (shop-local) until the chosen slot starts. */
function minutesUntil(date: string, startMin: number, now: { date: string; min: number }) {
  const day = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return (day(date) - day(now.date)) * 1440 + startMin - now.min;
}

export default function ReviewStep({
  draft,
  onEdit,
  error,
  onReload,
  link,
  uncertain = true,
}: Props) {
  const catalog = useCatalog();
  const { service, chosen, freeAddons, q, addonCost } = useDraftQuote(draft);
  const barberName = getBarberName(catalog, draft.barberId);
  const alertRef = useRef<HTMLDivElement>(null);
  // Read once when the review step opens (client only: this step is never first paint).
  const [now] = useState(() => shopNow());
  const within24h =
    draft.date != null &&
    draft.startMin != null &&
    minutesUntil(draft.date, draft.startMin, now) < 24 * 60;

  // Bring a failure into view and focus it (the confirm button is far below it).
  useEffect(() => {
    if (!error) return;
    const el = alertRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "auto" });
    el.focus({ preventScroll: true });
  }, [error]);

  return (
    <section>
      <StepHeader index={5} title="Review and confirm." body="Check everything looks right." />

      {error && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div ref={alertRef} role="alert" tabIndex={-1} className="outline-none min-w-0">
            <p className="text-sm text-red-400">{error}</p>
            {!onReload && uncertain && (
              <p className="mt-2 text-sm text-white/60">
                Not sure it went through? Check{" "}
                <Link
                  href="/account"
                  prefetch={false}
                  className="underline underline-offset-4 hover:text-white transition"
                >
                  Appointments
                </Link>{" "}
                before trying again.
              </p>
            )}
          </div>
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className={`px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
            >
              RELOAD
            </button>
          )}
          {link && (
            <Link
              href={link.href}
              prefetch={false}
              className={`inline-flex items-center min-h-11 px-6 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
            >
              {link.label}
            </Link>
          )}
        </div>
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
            return (
              <p key={a.id} className="flex justify-between gap-4 text-white/50">
                <span>+ {a.name}</span>
                <span className="shrink-0 text-right">
                  {freeAddons ? INCLUDED_WITH_PREMIUM : formatGBP(addonCost(a))}
                </span>
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
            <div className="text-right">
              <p className="text-3xl font-[500] tracking-[-0.02em]">{formatGBP(q.totalGBP)}</p>
              {service?.kind === "membership" && q.totalGBP === 0 && (
                <p className="mt-1 text-xs text-white/40">Covered by your membership</p>
              )}
            </div>
          </div>
        )}
      </div>

      {within24h && (
        <div role="note" className="mt-6 rounded-xl border border-white/30 bg-white/5 p-5 text-sm text-white/80">
          <p>
            This appointment starts within 24 hours, so you won&apos;t be able to cancel or change
            it online. To change it later, phone or email the shop.
          </p>
          <ContactLinks className="mt-3" />
        </div>
      )}

      <div className="mt-6 border border-dashed border-white/20 rounded-xl p-6">
        <p className="text-xs tracking-[0.2em] text-white/40">DEPOSIT</p>
        <p className="mt-2 text-sm text-white/60">
          Nothing is charged online today. You can cancel or move this appointment online until 24
          hours before it starts.
        </p>
        <ContactLinks className="mt-2" />
        {/* TODO(payments): Stripe deposit (PaymentElement) mounts here. */}
      </div>

      <p className="mt-6 text-xs text-white/40">
        By confirming you agree to our{" "}
        <Link href="/terms" prefetch={false} className="underline underline-offset-4 hover:text-white transition">
          Terms &amp; Conditions
        </Link>
        .
      </p>
    </section>
  );
}
