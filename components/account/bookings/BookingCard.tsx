import Link from "next/link";
import ContactLinks from "@/components/account/ContactLinks";
import { formatTime } from "@/lib/availability";
import { formatDate, formatGBP, shopNow } from "@/lib/booking-shared";
import type { MyBooking } from "@/lib/customer/bookings";
import CancelButton from "./CancelButton";
import { BTN_SECONDARY, LABEL, LINK, bookingStatusLabel } from "./ui";

export default function BookingCard({
  booking: b,
  variant,
}: {
  booking: MyBooking;
  variant: "upcoming" | "past";
}) {
  const services = [b.serviceName, ...b.addonNames].join(" + ");
  const when = `${formatDate(b.date, { long: true })}, ${formatTime(b.startMin)} – ${formatTime(b.endMin)}`;
  const shopCancelled = b.status === "cancelled" && b.cancelledBy === "shop";
  const cancelledOn = b.cancelledAt ? shopNow(new Date(b.cancelledAt)).date : null;
  return (
    <li className="bg-[#111] border border-white/10 rounded-xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p className="text-base md:text-lg font-[500] tracking-[-0.01em]">
          {formatDate(b.date, { long: true })}
        </p>
        <p className={shopCancelled ? "text-xs tracking-[0.2em] uppercase text-amber-300" : LABEL}>
          {bookingStatusLabel(b)}
          {shopCancelled && cancelledOn ? ` · ${formatDate(cancelledOn)}` : ""}
        </p>
      </div>
      <p className="mt-1 text-sm text-white/70">
        {formatTime(b.startMin)} – {formatTime(b.endMin)} · {b.barberName}
      </p>
      <p className="mt-3 text-sm text-white/80 break-words">{services}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs tracking-[0.2em] uppercase text-white/50">
        <span>{b.isMemberCut ? "Free · Member cut" : formatGBP(b.totalGBP)}</span>
        <span className="break-all">{b.reference}</span>
      </div>

      {shopCancelled && (
        <p className="mt-4 text-sm text-white/60">
          Questions? Phone or email the shop: <ContactLinks />
        </p>
      )}

      {variant === "upcoming" &&
        (b.canSelfServe ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/account/bookings/${encodeURIComponent(b.id)}/reschedule`}
              className={BTN_SECONDARY}
            >
              Reschedule
            </Link>
            <CancelButton bookingId={b.id} summary={`${services}, ${when}`} />
          </div>
        ) : (
          <p className="mt-5 text-sm text-white/50">
            Within 24 hours? To change this, phone or email the shop: <ContactLinks />.{" "}
            <Link href="/terms" className={LINK}>
              See terms
            </Link>
          </p>
        ))}
    </li>
  );
}
