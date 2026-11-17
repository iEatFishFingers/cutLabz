import { cacheLife, cacheTag } from "next/cache";
import BookingFlow from "@/components/booking/BookingFlow";
import { getClientCatalog } from "@/lib/catalog-db";

// Catalog (services, add-ons, barbers, hours) is shared, slow-changing data:
// cache it for a few minutes. Invalidate with revalidateTag("catalog").
export default async function BookingLoader() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const catalog = await getClientCatalog();
  return <BookingFlow catalog={catalog} />;
}

export function BookingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading booking
      </p>
      <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <div className="space-y-4">
          <div className="h-3 w-24 bg-white/5" />
          <div className="h-10 w-2/3 bg-white/5" />
          <div className="h-28 bg-[#111] border border-white/10 rounded-xl" />
          <div className="h-28 bg-[#111] border border-white/10 rounded-xl" />
        </div>
        <div className="hidden lg:block h-72 bg-[#111] border border-white/10 rounded-xl" />
      </div>
    </div>
  );
}
