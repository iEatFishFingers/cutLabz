"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBookingStatusAction } from "@/app/admin/(panel)/bookings/actions";
import { formatTime } from "@/lib/availability";
import { formatDate, formatGBP } from "@/lib/booking-shared";
import { statusLabel, type AdminBooking, type BookingStatus } from "@/lib/admin/bookings-shared";
import { AlertIcon, CheckIcon, EyeOffIcon, StatusIcon, XIcon } from "../icons";
import { classifyThrown, FailureMessage, type ActionFailure } from "./actionErrors";

const BASE = "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-xs tracking-[0.2em] uppercase transition disabled:opacity-40";
const BTN_PRIMARY = `${BASE} bg-white text-black`;
const BTN_SECONDARY = `${BASE} border border-white/20 hover:bg-white hover:text-black`;
const BTN_NEUTRAL = `${BASE} border border-white/20 text-white/80 hover:bg-white/10`;
const BTN_DANGER = `${BASE} border border-red-500/60 text-red-400 hover:bg-red-600 hover:text-white`;
const BTN_DANGER_SOLID = `${BASE} bg-red-600 text-white hover:bg-red-500`;
const BTN_WARN = `${BASE} border border-amber-500/60 text-amber-400 hover:bg-amber-500 hover:text-black`;
const BTN_WARN_SOLID = `${BASE} bg-amber-500 text-black hover:bg-amber-400`;
const LABEL = "text-xs tracking-[0.2em] uppercase text-white/50";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-1.5 border-t border-white/10 text-sm">
      <dt className={LABEL}>{label}</dt>
      <dd className="min-w-0 break-words text-white/80">{children}</dd>
    </div>
  );
}

type Confirm = null | "cancelled" | "no_show";

export default function BookingDetail({
  booking,
  barberName,
  clash = false,
  onClose,
}: {
  booking: AdminBooking;
  barberName: string;
  clash?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const b = booking;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const expected = b.status === "unknown" ? b.statusRaw : b.status;

  const change = (status: BookingStatus) => {
    setFailure(null);
    start(async () => {
      try {
        const res = await setBookingStatusAction(b.id, status, expected);
        if (!res.ok) {
          setFailure({ kind: "server", message: res.error });
          if (/changed/i.test(res.error)) router.refresh();
        } else {
          setConfirm(null);
        }
      } catch (e) {
        setFailure(classifyThrown(e));
      }
    });
  };

  const statusColour =
    b.status === "completed"
      ? "text-green-400"
      : b.status === "no_show"
        ? "text-amber-400"
        : b.status === "cancelled"
          ? "text-red-400"
          : "text-white/80";

  const changedAt = b.statusChangedAt ? new Date(b.statusChangedAt) : null;
  const changedOn =
    changedAt && !Number.isNaN(changedAt.getTime())
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/London",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(changedAt)
      : null;

  return (
    <div className="flex flex-col">
      <div className="p-5 pb-3 md:p-6 md:pb-3">
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
            >
              <bdi>{b.name}</bdi>
            </h2>
            <p className={`mt-1 flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase ${statusColour}`}>
              <StatusIcon status={b.status} className="size-4" />
              {statusLabel(b)}
            </p>
            {clash && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
                <AlertIcon className="mt-0.5 size-4" />
                <span>
                  <strong className="font-semibold uppercase tracking-[0.15em]">Clash</strong> with time
                  off or working hours.
                </span>
              </p>
            )}
            {b.status === "unknown" && (
              <p className="mt-2 text-xs text-amber-400">Unrecognised status. Refresh before changing it.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className={BTN_SECONDARY} aria-label="Close details">
            Close
          </button>
        </div>

        <dl className="mt-4">
          <Row label="Barber">{barberName}</Row>
          <Row label="Service">
            {b.serviceName}
            {b.addonNames.length ? ` + ${b.addonNames.join(", ")}` : ""}
          </Row>
          {b.phone && (
            <Row label="Phone">
              <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
                <bdi>{b.phone}</bdi>
              </a>
            </Row>
          )}
          {b.email && (
            <Row label="Email">
              <a href={`mailto:${b.email}`} className="underline underline-offset-4">
                <bdi>{b.email}</bdi>
              </a>
            </Row>
          )}
          {b.notes && (
            <Row label="Notes">
              <bdi>{b.notes}</bdi>
            </Row>
          )}
          <Row label="Total">
            {formatGBP(b.totalGBP)}
            {b.paymentStatus ? ` · ${b.paymentStatus}` : ""}
          </Row>
          <Row label="Reference">{b.reference}</Row>
        </dl>
        {b.statusChangedBy && changedOn && (
          <p className="mt-2 text-xs text-white/50">
            Last changed by <bdi>{b.statusChangedBy}</bdi> on {changedOn}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-white/10 bg-[#0b0b0b] p-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {failure && (
          <div className="mb-3">
            <FailureMessage failure={failure} />
          </div>
        )}
        {confirm ? (
          <div className="space-y-3">
            <p className="text-sm">
              {confirm === "cancelled" ? (
                <>
                  Cancel this booking? <strong>The customer will NOT be notified.</strong> Contact them
                  yourself.
                </>
              ) : (
                <>Mark this booking as a no-show?</>
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => change(confirm)}
                className={confirm === "cancelled" ? BTN_DANGER_SOLID : BTN_WARN_SOLID}
              >
                {confirm === "cancelled" ? (
                  <>
                    <XIcon /> Yes, cancel
                  </>
                ) : (
                  <>
                    <EyeOffIcon /> Yes, no-show
                  </>
                )}
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirm(null)} className={BTN_NEUTRAL}>
                Keep
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {b.status === "pending" && (
              <button type="button" disabled={pending} onClick={() => change("confirmed")} className={BTN_PRIMARY}>
                Confirm
              </button>
            )}
            {b.status !== "completed" && b.status !== "cancelled" && (
              <button type="button" disabled={pending} onClick={() => change("completed")} className={BTN_PRIMARY}>
                <CheckIcon /> Mark completed
              </button>
            )}
            {b.status !== "no_show" && b.status !== "cancelled" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setFailure(null);
                  setConfirm("no_show");
                }}
                className={BTN_WARN}
              >
                <EyeOffIcon /> No-show
              </button>
            )}
            {(b.status === "cancelled" || b.status === "completed" || b.status === "no_show") && (
              <button type="button" disabled={pending} onClick={() => change("confirmed")} className={BTN_SECONDARY}>
                Reopen
              </button>
            )}
            {b.status !== "cancelled" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setFailure(null);
                  setConfirm("cancelled");
                }}
                className={BTN_DANGER}
              >
                <XIcon /> Cancel booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
