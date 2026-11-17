import type { Metadata } from "next";
import Link from "next/link";
import { BOOK_URL } from "@/lib/links";
import Year from "@/components/Year";

export const metadata: Metadata = {
  title: "Terms & Conditions | Cut Labz",
};

const navBtn =
  "text-xs px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition";

export default function Terms() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <header className="w-full border-b border-white/10 px-6 md:px-20 py-4 flex items-center justify-between">
        <Link href="/" className="text-[14px] tracking-[0.38em] text-white/70">
          CUT LABZ
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/#pricing" className={navBtn}>
            Membership
          </Link>
          <Link href={BOOK_URL} className={navBtn}>
            Book
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-16 md:px-20">
        <div className="max-w-4xl mx-auto space-y-10">
          <h1 className="text-4xl md:text-5xl font-semibold">
            Terms &amp; Conditions
          </h1>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
            <p className="text-white/70">
              These Terms &amp; Conditions (“Terms”) govern your use of Cut Labz
              services. By accessing our website or purchasing a membership, you
              agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Services</h2>
            <p className="text-white/70">
              Cut Labz provides barbering services through membership-based
              plans. Services may be updated or modified at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Memberships</h2>
            <ul className="list-disc pl-5 text-white/70 space-y-2">
              <li>Memberships are billed monthly in advance.</li>
              <li>Core: Haircuts only.</li>
              <li>Plus: Haircuts and beard grooming.</li>
              <li>Premium: Extended appointments with add-ons.</li>
              <li>Memberships are for personal use only.</li>
              <li>All memberships are non-refundable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Bookings</h2>
            <p className="text-white/70">
              All appointments must be booked in advance and are subject to
              availability. Bookings must be made within an active membership
              period.
            </p>
            <p className="text-white/70 mt-2">
              Booking outside of an active membership cycle may incur a £5
              administrative charge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              5. Cancellations &amp; No-Shows
            </h2>
            <ul className="list-disc pl-5 text-white/70 space-y-2">
              <li>Minimum 24 hours notice required to cancel or reschedule.</li>
              <li>Late cancellations incur a £5 fee.</li>
              <li>No-shows incur a £5 fee.</li>
              <li>Repeated no-shows may result in restricted access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Payments</h2>
            <p className="text-white/70">
              Memberships are billed monthly. Failed payments may result in
              suspension of services and cancellation of bookings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              7. Membership Cancellation
            </h2>
            <p className="text-white/70">
              Memberships can be cancelled at any time and remain active until
              the end of the billing cycle. No partial refunds are provided.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Arrival Policy</h2>
            <p className="text-white/70">
              Clients must arrive on time. Late arrivals may result in reduced
              service time or rescheduling.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Conduct</h2>
            <p className="text-white/70">
              We reserve the right to refuse service or terminate memberships
              for inappropriate behaviour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Liability</h2>
            <p className="text-white/70">
              Cut Labz is not liable for indirect losses, delays, or
              dissatisfaction based on personal preference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Changes</h2>
            <p className="text-white/70">
              We may update these Terms at any time. Continued use of our
              services means acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">12. Governing Law</h2>
            <p className="text-white/70">
              These Terms are governed by the laws of the United Kingdom.
            </p>
          </section>

          <div className="pt-10 text-sm text-white/40">
            Last updated: 5/1/2026
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 md:px-20 py-8 text-sm text-white/60">
        <div className="text-center md:text-center text-white/60 space-y-4 text-xs tracking-[0.2em]">
          <Link href="/">
            © <Year /> CUT LABZ. ALL RIGHTS RESERVED.
          </Link>
        </div>
      </footer>
    </div>
  );
}
