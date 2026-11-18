"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  getRescheduleSlotsAction,
  rescheduleBookingAction,
} from "@/app/account/bookings/actions";
import BarberStep from "@/components/booking/BarberStep";
import DateTimeStep from "@/components/booking/DateTimeStep";
import { CatalogProvider } from "@/components/booking/catalog-context";
import { useShopToday } from "@/components/booking/useShopToday";
import { ViewerProvider, type BookingViewer } from "@/components/booking/viewer-context";
import { formatTime } from "@/lib/availability";
import type { ClientCatalog } from "@/lib/catalog";
import {
  emptyDraft,
  formatDate,
  type BookingDraft,
  type GetSlotsInput,
  type SlotsResult,
} from "@/lib/booking-shared";
import type { MyBooking } from "@/lib/customer/bookings";
import { BTN_PRIMARY, BTN_SECONDARY, LABEL, LINK } from "./ui";

type Props = { booking: MyBooking; catalog: ClientCatalog; viewer: BookingViewer };

export default function RescheduleForm({ booking, catalog, viewer }: Props) {
  return (
    <CatalogProvider catalog={catalog}>
      <ViewerProvider viewer={viewer}>
        <MotionConfig reducedMotion="user">
          <Form booking={booking} catalog={catalog} />
        </MotionConfig>
      </ViewerProvider>
    </CatalogProvider>
  );
}

function Form({ booking, catalog }: { booking: MyBooking; catalog: ClientCatalog }) {
  const router = useRouter();
  const today = useShopToday();
  const [pending, start] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; membership?: boolean; stale?: boolean } | null>(null);
  const [draft, setDraft] = useState<BookingDraft>(() => ({
    ...emptyDraft,
    serviceId: booking.serviceId,
    addonIds: booking.addonIds,
    barberId: catalog.barbers.some((b) => b.id === booking.barberId) ? booking.barberId : "any",
  }));

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      const changed =
        ("barberId" in patch && patch.barberId !== prev.barberId) ||
        ("date" in patch && patch.date !== prev.date);
      if (changed && !("startMin" in patch)) next.startMin = null;
      return next;
    });
    if (("startMin" in patch && patch.startMin != null) || "date" in patch) setNotice(null);
    setError(null);
  }, []);

  const fetchSlots = useCallback(
    (i: GetSlotsInput): Promise<SlotsResult> =>
      getRescheduleSlotsAction({ bookingId: booking.id, date: i.date, barberId: i.barberId }),
    [booking.id],
  );

  const duration = booking.endMin - booking.startMin;
  const ready = draft.date != null && draft.startMin != null && draft.barberId != null;
  const barberLabel =
    draft.barberId === "any"
      ? "Any available"
      : (catalog.barbers.find((b) => b.id === draft.barberId)?.name ?? "");

  const confirm = () => {
    if (!ready || draft.date == null || draft.startMin == null || draft.barberId == null) return;
    const { date, startMin, barberId } = draft;
    setError(null);
    start(async () => {
      try {
        const res = await rescheduleBookingAction({
          bookingId: booking.id,
          date,
          startMin,
          barberId,
          expected: {
            date: booking.date,
            startMin: booking.startMin,
            barberId: booking.barberId,
          },
        });
        if (res.ok) {
          router.push("/account?rescheduled=1");
        } else if (res.code === "slot_taken") {
          setDraft((d) => ({ ...d, startMin: null }));
          setNotice(res.error);
          setRefreshKey((n) => n + 1);
        } else if (res.code === "auth") {
          router.push(`/login?next=${encodeURIComponent(`/account/bookings/${booking.id}/reschedule`)}`);
        } else if (
          res.code === "too_late" ||
          res.code === "not_found" ||
          res.code === "not_active"
        ) {
          router.replace(`/account?notice=${res.code}`);
        } else {
          setError({
            text: res.error,
            membership: res.code === "membership",
            stale: res.code === "stale",
          });
        }
      } catch {
        setError({ text: "Something went wrong. Check your connection and try again." });
      }
    });
  };

  return (
    <div>
      <p className={LABEL}>Reschedule</p>
      <h1 className="mt-2 text-2xl md:text-3xl font-[500] tracking-[-0.02em]">Pick a new time.</h1>
      <p className="mt-2 text-sm text-white/50">
        {booking.serviceName}
        {booking.addonNames.length > 0 && ` + ${booking.addonNames.join(" + ")}`} ·{" "}
        {booking.reference}
      </p>

      <section aria-labelledby="rs-barber" className="mt-10">
        <h2 id="rs-barber" className={`mb-4 ${LABEL}`}>
          Barber
        </h2>
        <BarberStep draft={draft} update={update} hideHeader />
      </section>

      <section aria-labelledby="rs-time" className="mt-10">
        <h2 id="rs-time" className={`mb-4 ${LABEL}`}>
          Date and time
        </h2>
        <DateTimeStep
          draft={draft}
          update={update}
          today={today}
          notice={notice}
          fetchSlots={fetchSlots}
          hideHeader
          refreshKey={refreshKey}
        />
      </section>

      <section
        aria-label="Change summary"
        className="mt-10 bg-[#111] border border-white/10 rounded-xl p-5 md:p-6"
      >
        <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className={LABEL}>Now</dt>
          <dd className="text-white/60">
            {formatDate(booking.date, { long: true })}, {formatTime(booking.startMin)} –{" "}
            {formatTime(booking.endMin)} · {booking.barberName}
          </dd>
          <dt className={LABEL}>New</dt>
          <dd className="text-white">
            {ready && draft.date != null && draft.startMin != null ? (
              <>
                {formatDate(draft.date, { long: true })}, {formatTime(draft.startMin)} –{" "}
                {formatTime(draft.startMin + duration)} · {barberLabel}
              </>
            ) : (
              <span className="text-white/40">Choose a date and time above.</span>
            )}
          </dd>
        </dl>
      </section>

      <div aria-live="assertive" className="mt-6 empty:hidden">
        {error && (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-red-400">{error.text}</p>
            {error.stale && (
              <button type="button" onClick={() => router.refresh()} className={BTN_SECONDARY}>
                Reload
              </button>
            )}
            {error.membership && (
              <Link href="/account/membership" className={`text-sm text-white/60 ${LINK}`}>
                View membership
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        <Link href="/account" className={BTN_SECONDARY}>
          Keep current time
        </Link>
        <button
          type="button"
          onClick={confirm}
          disabled={!ready || pending}
          aria-busy={pending || undefined}
          className={BTN_PRIMARY}
        >
          {pending ? "Moving…" : "Confirm new time"}
        </button>
      </div>
    </div>
  );
}
