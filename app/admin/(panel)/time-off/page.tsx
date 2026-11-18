import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { shopNow } from "@/lib/booking-shared";
import TimeOffForm from "@/components/admin/settings/TimeOffForm";
import TimeOffList, { type TimeOffRow } from "@/components/admin/settings/TimeOffList";
import { listFutureActiveBookings } from "@/components/admin/settings/future-bookings";
import { PageHeader, PanelSkeleton } from "@/components/admin/settings/ui";

export const metadata = { title: "Time off | Cut Labz Admin" };

async function TimeOffContent() {
  const { db } = await requireAdmin();
  const today = shopNow().date;
  const [barbers, timeOff, future] = await Promise.all([
    db.from("barbers").select("id,name,active").order("name"),
    db
      .from("time_off")
      .select("id,barber_id,start_date,end_date,reason")
      .order("start_date", { ascending: true }),
    listFutureActiveBookings(db).catch(() => null),
  ]);
  if (barbers.error || timeOff.error) {
    return <p className="text-sm text-red-400">Could not load time off. Refresh to try again.</p>;
  }
  const names = new Map((barbers.data ?? []).map((b) => [b.id as string, b.name as string]));
  const rows: TimeOffRow[] = (timeOff.data ?? []).map((t) => ({
    id: Number(t.id),
    barberId: t.barber_id as string,
    barberName: names.get(t.barber_id as string) ?? t.barber_id,
    start: t.start_date as string,
    end: t.end_date as string,
    reason: (t.reason as string | null) ?? "",
    upcoming: (t.end_date as string) >= today,
    overlapping: future
      ? future.filter(
          (b) =>
            b.barber_id === t.barber_id &&
            b.booking_date >= (t.start_date as string) &&
            b.booking_date <= (t.end_date as string),
        ).length
      : null,
  }));
  return (
    <div className="space-y-10">
      <TimeOffForm
        barbers={(barbers.data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }))}
        minDate={today}
      />
      <TimeOffList rows={rows} />
      <p className="text-xs text-white/40">
        Time off blocks new online bookings only. Existing bookings are not cancelled; review them
        in{" "}
        <Link href="/admin" className="inline-flex min-h-11 items-center underline hover:text-white">
          the bookings calendar
        </Link>
        .
      </p>
    </div>
  );
}

export default function TimeOffPage() {
  return (
    <div>
      <PageHeader
        title="Time off"
        intro="Block out holidays and absences per barber. The reason is private and only shown here."
      />
      <Suspense fallback={<PanelSkeleton />}>
        <TimeOffContent />
      </Suspense>
    </div>
  );
}
