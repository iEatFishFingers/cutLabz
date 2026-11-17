import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { ViewerProvider } from "@/components/booking/viewer-context";
import { getViewer } from "@/lib/customer/viewer";
import BookingLoader, { BookingSkeleton } from "./BookingLoader";

export const metadata: Metadata = {
  title: "Book | Cut Labz",
  description:
    "Book your next cut at Cut Labz, Manchester. Choose a service, pick your barber and lock in a time in under a minute.",
};

// Booking needs a signed-in customer. The viewer is dynamic (cookies), so it is
// read inside Suspense; the catalog stays cached and is passed as children so no
// user data ever enters the 'use cache' component. BookingFlow keeps its draft in
// sessionStorage, so returning from /login restores the visitor's choices.
async function BookAccess() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/book");
  return (
    <ViewerProvider
      viewer={{
        name: viewer.name,
        email: viewer.email,
        phone: viewer.phone,
        membership: viewer.membership
          ? { plan: viewer.membership.plan, endsOn: viewer.membership.endsOn }
          : null,
      }}
    >
      <BookingLoader />
    </ViewerProvider>
  );
}

export default function Book() {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen">
      <Nav homeHref="/" membershipHref="/#pricing" bookCurrent />
      <main className="pt-24 md:pt-28 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-24">
        <Suspense fallback={<BookingSkeleton />}>
          <BookAccess />
        </Suspense>
      </main>
    </div>
  );
}
