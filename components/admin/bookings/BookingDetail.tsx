"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setBookingStatusAction } from "@/app/admin/(panel)/bookings/actions";
import { formatTime } from "@/lib/availability";
import { formatDate, formatGBP } from "@/lib/booking-shared";
import { statusLabel, type AdminBooking, type BookingStatus } from "@/lib/admin/bookings-shared";

const BTN_PRIMARY =
  "min-h-11 px-4 text-xs tracking-[0.2em] uppercase bg-white text-black disabled:opacity-40";
const BTN_SECONDARY =
  "min-h-11 px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-40";
const LABEL = "text-xs tracking-[0.2em] uppercase text-white/50";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2 border-t border-white/10 text-sm">
      <dt className={LABEL}>{label}</dt>
      <dd className="min-w-0 break-words text-white/80">{children}</dd>
    </div>
  );
}

export default function BookingDetail({
  booking,
  barberName,
  onClose,
}: {
  booking: AdminBooking;
  barberName: string;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const b = booking;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const change = (status: BookingStatus) => {
    setError(null);
    start(async () => {
      const res = await setBookingStatusAction(b.id, status);
      if (!res.ok) setError(res.error);
      else setConfirmCancel(false);
    });
  };

  const statusColour = b.status === "completed" ? "text-green-400" : "text-white/80";

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={LABEL}>
            {formatDate(b.date)} · {formatTime(b.startMin)}–{formatTime(b.endMin)}
          </p>
          <h2
            id="booking-detail-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-xl font-semibold break-words outline-none"
          >{b.name}</h2>
          <p className={`mt-1 text-xs tracking-[0.2em] uppercase ${statusColour}`}>
            {statusLabel(b)}
          </p>
        </div>
        <button type="button" onClick={onClose} className={BTN_SECONDARY} aria-label="Close details">
          Close
        </button>
      </div>

      <dl className="mt-5">
        <Row label="Barber">{barberName}</Row>
        <Row label="Service">{b.serviceName}</Row>
        <Row label="Add-ons">{b.addonNames.length ? b.addonNames.join(", ") : "None"}</Row>
        <Row label="Phone">
          {b.phone ? (
            <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
              {b.phone}
            </a>
          ) : (
            "-"
          )}
        </Row>
        <Row label="Email">
          {b.email ? (
            <a href={`mailto:${b.email}`} className="underline underline-offset-4">
              {b.email}
            </a>
          ) : (
            "-"
          )}
        </Row>
        <Row label="Notes">{b.notes || "-"}</Row>
        <Row label="Total">{formatGBP(b.totalGBP)}</Row>
        <Row label="Payment">{b.paymentStatus || "-"}</Row>
        <Row label="Reference">{b.reference}</Row>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        {b.status === "pending" && (
          <button type="button" disabled={pending} onClick={() => change("confirmed")} className={BTN_PRIMARY}>
            Confirm
          </button>
        )}
        {b.status !== "completed" && b.status !== "cancelled" && (
          <button type="button" disabled={pending} onClick={() => change("completed")} className={BTN_PRIMARY}>
            Mark completed
          </button>
        )}
        {b.status !== "no_show" && b.status !== "cancelled" && (
          <button type="button" disabled={pending} onClick={() => change("no_show")} className={BTN_SECONDARY}>
            Mark no-show
          </button>
        )}
        {(b.status === "cancelled" || b.status === "completed" || b.status === "no_show") && (
          <button type="button" disabled={pending} onClick={() => change("confirmed")} className={BTN_SECONDARY}>
            Reopen
          </button>
        )}
        {b.status !== "cancelled" &&
          (confirmCancel ? (
            <div className="flex w-full flex-wrap items-center gap-3">
              <span className="text-sm">Cancel this booking?</span>
              <button type="button" disabled={pending} onClick={() => change("cancelled")} className={BTN_PRIMARY}>
                Yes, cancel
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirmCancel(false)} className={BTN_SECONDARY}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" disabled={pending} onClick={() => setConfirmCancel(true)} className={BTN_SECONDARY}>
              Cancel
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
