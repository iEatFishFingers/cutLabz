"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/availability";
import {
  formatDate,
  formatGBP,
  type ConfirmedBooking,
} from "@/lib/booking-shared";
import { FOCUS_RING } from "./ServiceStep";
import { ContactLinks } from "./ReviewStep";
import { findService, pickAddons, useCatalog } from "./catalog-context";

type Props = {
  booking: ConfirmedBooking;
  onBookAnother: () => void;
};

export default function ConfirmedStep({ booking, onBookAnother }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const catalog = useCatalog();
  const service = findService(catalog, booking.serviceId);
  const extras = pickAddons(catalog, booking.addonIds);

  const rows: [string, string][] = [
    [
      "SERVICE",
      [service?.name ?? "Appointment", ...extras.map((a) => a.name)].join(" + "),
    ],
    ["BARBER", booking.barberName],
    ["DATE", formatDate(booking.date, { long: true })],
    ["TIME", `${formatTime(booking.startMin)} – ${formatTime(booking.endMin)}`],
    [
      "TOTAL",
      booking.totalGBP === 0 && service?.kind === "membership"
        ? "£0 · Covered by your membership"
        : formatGBP(booking.totalGBP),
    ],
  ];

  return (
    <section className="max-w-xl mx-auto text-center">
      <p className="text-xs tracking-[0.25em] text-green-400">✓ CONFIRMED</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-4xl md:text-6xl font-[500] tracking-[-0.02em] leading-[1.05] outline-none"
      >
        You&apos;re booked.
      </h2>
      <p className="mt-4 text-sm text-white/50">
        See you in the chair. Keep your reference handy.
      </p>

      <div className="mt-10 bg-[#111] border border-white/10 rounded-xl p-8">
        <p className="text-xs tracking-[0.2em] text-white/40">REFERENCE</p>
        <p className="mt-3 text-2xl md:text-3xl font-[500] tracking-[0.2em] break-all">
          {booking.reference}
        </p>
      </div>

      <dl className="mt-6 text-left bg-white/5 border border-white/10 rounded-xl p-6 divide-y divide-white/10">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-3 first:pt-0 last:pb-0">
            <dt className="text-xs tracking-[0.2em] text-white/40 pt-0.5">{k}</dt>
            <dd className="text-sm text-white/80 text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 text-sm text-white/60">
        <p>Nothing is charged online today.</p>
        <p className="mt-1">
          You can cancel or move this appointment online until 24 hours before it starts. After
          that, phone or email the shop.
        </p>
        <ContactLinks className="mt-1" />
      </div>

      <p className="mt-6 text-sm text-white/50">
        Location: Phenix Salon Suites, 1 Deansgate, Manchester M3 1AZ
      </p>

      <div className="mt-10 flex flex-wrap gap-4 justify-center">
        <button
          type="button"
          onClick={onBookAnother}
          className={`px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
        >
          BOOK ANOTHER
        </button>
        <Link
          href="/account"
          prefetch={false}
          className={`px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition ${FOCUS_RING}`}
        >
          MANAGE APPOINTMENTS
        </Link>
        <Link
          href="/"
          prefetch={false}
          className={`px-6 py-3 text-xs tracking-[0.2em] bg-white text-black border border-white hover:bg-transparent hover:text-white transition ${FOCUS_RING}`}
        >
          BACK HOME
        </Link>
      </div>
    </section>
  );
}
