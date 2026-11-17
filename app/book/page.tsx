import type { Metadata } from "next";
import Nav from "@/components/Nav";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book | Cut Labz",
  description:
    "Book your next cut at Cut Labz, Manchester. Choose a service, pick your barber and lock in a time in under a minute.",
};

// Static shell: BookingFlow is a client component that only reads the clock
// after hydration (useSyncExternalStore with a null server snapshot), so no
// Suspense boundary is needed under Cache Components.
export default function Book() {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen">
      <Nav homeHref="/" membershipHref="/#pricing" bookCurrent />
      <main className="pt-24 md:pt-28 pb-32 lg:pb-24">
        <BookingFlow />
      </main>
    </div>
  );
}
