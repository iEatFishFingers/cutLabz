import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { listAdminBookings, loadAdminDirectory } from "@/lib/admin/bookings";
import {
  barberWindows,
  closedSegments,
  isOnLeave,
  nextUp,
  parseDateParamChecked,
  parseView,
  timelineBounds,
  weekDates,
} from "@/lib/admin/bookings-shared";
import { shopNow } from "@/lib/booking-shared";
import DateNav from "@/components/admin/bookings/DateNav";
import DayBoard from "@/components/admin/bookings/DayBoard";
import NextUp from "@/components/admin/bookings/NextUp";
import WeekView from "@/components/admin/bookings/WeekView";
import BookingSearch from "@/components/admin/bookings/BookingSearch";

function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading calendar" className="space-y-6 animate-pulse">
      <div className="h-12 border border-white/10 bg-white/[0.04]" />
      <div className="flex gap-2">
        <div className="h-11 w-20 bg-white/[0.06]" />
        <div className="h-11 w-20 bg-white/[0.06]" />
        <div className="h-11 w-20 bg-white/[0.06]" />
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-28 border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
      <span className="sr-only">Loading calendar...</span>
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const now = shopNow();
  const { date, fellBack } = parseDateParamChecked(sp.date, now.date);
  const highlightId = typeof sp.booking === "string" ? sp.booking : null;
  const view = parseView(sp.view);
  const dir = await loadAdminDirectory(session.db);

  const week = weekDates(date);
  const bookings = await listAdminBookings(
    session.db,
    view === "week" ? week[0] : date,
    view === "week" ? week[6] : date,
    dir,
  );
  // Active barbers, plus any inactive barber who still has a booking in range.
  const shown = dir.barbers.filter((b) => b.active || bookings.some((x) => x.barberId === b.id));
  const barberList = shown.map((b) => ({ id: b.id, name: b.active ? b.name : `${b.name} (Inactive)` }));

  let body: React.ReactNode;
  if (view === "week") {
    body = <WeekView dates={week} today={now.date} barbers={barberList} bookings={bookings} />;
  } else {
    const windows = shown.flatMap((b) =>
      isOnLeave(dir.timeOff, b.id, date) ? [] : barberWindows(b, date),
    );
    const bounds = timelineBounds(windows, bookings);
    body = (
      <>
        {date === now.date && (
          <div className="mb-6">
            <NextUp
              barbers={barberList}
              next={nextUp(
                bookings,
                barberList.map((b) => b.id),
                now.min,
              )}
            />
          </div>
        )}
        {bounds && shown.length ? (
          <DayBoard
            key={`${date}:${highlightId ?? ""}`}
            date={date}
            bounds={bounds}
            bookings={bookings}
            defaultBarberId={session.barberId}
            initialSelectedId={highlightId}
            barbers={shown.map((b) => {
              const onLeave = isOnLeave(dir.timeOff, b.id, date);
              return {
                id: b.id,
                name: b.name,
                inactive: !b.active,
                onLeave,
                closed: onLeave ? [] : closedSegments(barberWindows(b, date), bounds),
              };
            })}
          />
        ) : (
          <p className="border border-white/10 bg-[#0b0b0b] p-6 text-sm text-white/60">
            Closed. No barber is working this day.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <BookingSearch barbers={dir.barbers.map((b) => ({ id: b.id, name: b.name }))} />
      {fellBack && (
        <p role="status" className="text-xs text-amber-400">
          Date not recognised, showing today.
        </p>
      )}
      <DateNav date={date} view={view} isToday={date === now.date} />
      {body}
    </div>
  );
}

export default function AdminCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}
