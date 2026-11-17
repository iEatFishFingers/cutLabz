import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { listAdminBookings, loadAdminDirectory } from "@/lib/admin/bookings";
import {
  barberWindows,
  closedSegments,
  isOnLeave,
  nextUp,
  parseDateParam,
  parseView,
  timelineBounds,
  weekDates,
} from "@/lib/admin/bookings-shared";
import { shopNow } from "@/lib/booking-shared";
import DateNav from "@/components/admin/bookings/DateNav";
import DayBoard from "@/components/admin/bookings/DayBoard";
import NextUp from "@/components/admin/bookings/NextUp";
import WeekView from "@/components/admin/bookings/WeekView";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  const now = shopNow();
  const date = parseDateParam(sp.date, now.date);
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
            key={date}
            date={date}
            bounds={bounds}
            bookings={bookings}
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
      <DateNav date={date} view={view} isToday={date === now.date} />
      {body}
    </div>
  );
}

export default function AdminCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/40">Loading calendar...</p>}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}
