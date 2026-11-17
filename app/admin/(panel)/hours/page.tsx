import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { rowsToSchedule } from "@/lib/admin/catalog-admin";
import HoursEditor, { type BarberHours } from "@/components/admin/settings/HoursEditor";
import { PageHeader, PanelSkeleton } from "@/components/admin/settings/ui";

export const metadata = { title: "Hours | Cut Labz Admin" };

async function HoursContent() {
  const { db } = await requireAdmin();
  const [barbers, avail] = await Promise.all([
    db.from("barbers").select("id,name,active").order("name"),
    db.from("availability").select("barber_id,weekday,open_min,close_min"),
  ]);
  if (barbers.error || avail.error) {
    return <p className="text-sm text-red-400">Could not load hours. Refresh to try again.</p>;
  }
  const list: BarberHours[] = (barbers.data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    active: Boolean(b.active),
    schedule: rowsToSchedule(
      (avail.data ?? []).filter((r) => r.barber_id === b.id),
    ),
  }));
  if (list.length === 0) {
    return <p className="text-sm text-white/50">No barbers yet. Add one under Barbers first.</p>;
  }
  return <HoursEditor barbers={list} />;
}

export default function HoursPage() {
  return (
    <div>
      <PageHeader
        title="Opening hours"
        intro="Set each barber's weekly hours. Customers can only book inside these windows. Times are shop-local."
      />
      <Suspense fallback={<PanelSkeleton />}>
        <HoursContent />
      </Suspense>
    </div>
  );
}
