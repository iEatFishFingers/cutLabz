import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { parseDateParam } from "@/lib/admin/bookings-shared";
import { shopNow } from "@/lib/booking-shared";
import { loadCatalog } from "@/lib/catalog-db";
import NewBookingForm from "@/components/admin/bookings/NewBookingForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function NewBooking({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await requireAdmin();
  const now = shopNow();
  const catalog = await loadCatalog();
  const barberParam = typeof sp.barber === "string" ? sp.barber : "";
  const startParam = typeof sp.start === "string" && /^\d{1,4}$/.test(sp.start) ? Number(sp.start) : null;
  return (
    <NewBookingForm
      catalog={catalog}
      now={now}
      initial={{
        date: parseDateParam(sp.date, now.date),
        barberId: catalog.barbers.some((b) => b.id === barberParam) ? barberParam : "",
        startMin: startParam,
      }}
    />
  );
}

export default function NewBookingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xs tracking-[0.2em] uppercase text-white/40">New booking</h1>
      <Suspense fallback={<p className="text-sm text-white/40">Loading...</p>}>
        <NewBooking searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
