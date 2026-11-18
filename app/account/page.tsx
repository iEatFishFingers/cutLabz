import type { Metadata } from "next";
import Link from "next/link";
import BookingCard from "@/components/account/bookings/BookingCard";
import FlashNote from "@/components/account/bookings/FlashNote";
import ContactLinks from "@/components/account/ContactLinks";
import PastBookings from "@/components/account/bookings/PastBookings";
import { BTN_PRIMARY, LABEL, LINK } from "@/components/account/bookings/ui";
import { addDays, shopNow } from "@/lib/booking-shared";
import { listMyBookings } from "@/lib/customer/bookings";
import { requireCustomer } from "@/lib/customer/viewer";
import { BOOK_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Appointments | Cut Labz",
  robots: { index: false, follow: false },
};

const FLASH = new Set(["cancelled", "rescheduled", "too_late", "not_found", "not_active"]);

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const viewer = await requireCustomer("/account");
  const now = shopNow();
  const { upcoming, past } = await listMyBookings(viewer, now);
  const cutoff = addDays(now.date, -14);
  const shopCancelled = past.filter(
    (b) =>
      b.status === "cancelled" &&
      b.cancelledBy === "shop" &&
      b.cancelledAt != null &&
      shopNow(new Date(b.cancelledAt)).date >= cutoff,
  ).length;

  const flashKey =
    sp.cancelled === "1"
      ? "cancelled"
      : sp.rescheduled === "1"
        ? "rescheduled"
        : typeof sp.notice === "string" && FLASH.has(sp.notice)
          ? sp.notice
          : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <Link href={BOOK_URL} className={BTN_PRIMARY}>
          Book a cut
        </Link>
      </div>

      {shopCancelled > 0 && (
        <div
          role="status"
          className="mt-6 border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm text-white/80"
        >
          <p>
            The shop cancelled {shopCancelled} of your appointments recently.{" "}
            <a href="#past-bookings" className={LINK}>
              See Past and cancelled
            </a>
          </p>
          <p className="mt-1 text-white/60">
            Questions? Phone or email the shop: <ContactLinks />
          </p>
        </div>
      )}

      <div className="mt-6">
        <FlashNote kind={flashKey} />
      </div>

      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className={`mb-3 ${LABEL}`}>
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 md:p-8">
            <p className="text-base font-[500]">No upcoming appointments.</p>
            <p className="mt-2 text-sm text-white/50">Pick a service, a barber and a time.</p>
            <Link href={BOOK_URL} className={`mt-5 ${BTN_PRIMARY}`}>
              Book a cut
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} variant="upcoming" />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <PastBookings count={past.length}>
          {past.map((b) => (
            <BookingCard key={b.id} booking={b} variant="past" />
          ))}
        </PastBookings>
      )}
    </div>
  );
}
