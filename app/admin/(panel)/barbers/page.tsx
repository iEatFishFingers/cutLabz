import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import BarberForm, { type BarberValues } from "@/components/admin/settings/BarberForm";
import { listFutureActiveBookings } from "@/components/admin/settings/future-bookings";
import { PageHeader, PanelSkeleton } from "@/components/admin/settings/ui";

export const metadata = { title: "Barbers | Cut Labz Admin" };

async function BarbersContent() {
  const { db } = await requireAdmin();
  const [barbers, avail, future] = await Promise.all([
    db.from("barbers").select("id,name,role,active").order("name"),
    db.from("availability").select("barber_id"),
    listFutureActiveBookings(db).catch(() => null),
  ]);
  if (barbers.error) {
    return <p className="text-sm text-red-400">Could not load barbers. Refresh to try again.</p>;
  }
  const withHours = new Set((avail.data ?? []).map((r) => r.barber_id as string));
  const list: BarberValues[] = (barbers.data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    role: (b.role as string) ?? "",
    active: Boolean(b.active),
    hasHours: withHours.has(b.id as string),
    futureBookings: future ? future.filter((f) => f.barber_id === b.id).length : null,
  }));
  return (
    <div className="space-y-3">
      {list.map((b) => (
        <BarberForm key={b.id} initial={b} />
      ))}
      <BarberForm initial={null} />
    </div>
  );
}

export default function BarbersPage() {
  return (
    <div>
      <PageHeader
        title="Barbers"
        intro="Barbers cannot be deleted because past bookings refer to them. Untick Active to stop taking new bookings."
      />
      <Suspense fallback={<PanelSkeleton />}>
        <BarbersContent />
      </Suspense>
    </div>
  );
}
