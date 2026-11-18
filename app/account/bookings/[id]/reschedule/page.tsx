import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactLinks from "@/components/account/ContactLinks";
import RescheduleForm from "@/components/account/bookings/RescheduleForm";
import { BTN_SECONDARY, LABEL, LINK } from "@/components/account/bookings/ui";
import { shopNow } from "@/lib/booking-shared";
import { getClientCatalog } from "@/lib/catalog-db";
import { listMyBookings } from "@/lib/customer/bookings";
import { requireCustomer } from "@/lib/customer/viewer";

export const metadata: Metadata = {
  title: "Reschedule | Cut Labz",
  robots: { index: false, follow: false },
};

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) notFound();
  const viewer = await requireCustomer(`/account/bookings/${id}/reschedule`);
  const now = shopNow();
  const { upcoming } = await listMyBookings(viewer, now);
  const booking = upcoming.find((b) => b.id === id);
  if (!booking) notFound();

  if (!booking.canSelfServe) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Reschedule</h1>
        <div className="mt-6 bg-[#111] border border-white/10 rounded-xl p-6 md:p-8">
          <p className={LABEL}>Within 24 hours</p>
          <p className="mt-3 text-sm text-white/70">
            This appointment starts in less than 24 hours, so it can&apos;t be changed online.
            To move it, phone or email the shop: <ContactLinks />.{" "}
            <Link href="/terms" className={LINK}>
              See terms
            </Link>
          </p>
          <Link href="/account" className={`mt-5 ${BTN_SECONDARY}`}>
            Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  const catalog = await getClientCatalog();
  return (
    <RescheduleForm
      booking={booking}
      catalog={catalog}
      viewer={{
        name: viewer.name,
        email: viewer.email,
        phone: viewer.phone,
        membership: viewer.membership
          ? { plan: viewer.membership.plan, endsOn: viewer.membership.endsOn }
          : null,
      }}
    />
  );
}
