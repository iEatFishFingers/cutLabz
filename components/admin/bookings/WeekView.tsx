import Link from "next/link";
import { formatTime } from "@/lib/availability";
import { formatDate } from "@/lib/booking-shared";
import { initials, isActiveStatus, type AdminBooking } from "@/lib/admin/bookings-shared";

export default function WeekView({
  dates,
  today,
  barbers,
  bookings,
}: {
  dates: string[];
  today: string;
  barbers: { id: string; name: string }[];
  bookings: AdminBooking[];
}) {
  const initialsOf = (id: string) => initials(barbers.find((b) => b.id === id)?.name ?? "");
  return (
    <ul className="grid gap-3 md:grid-cols-7">
      {dates.map((d) => {
        const day = bookings.filter((b) => b.date === d && isActiveStatus(b.status));
        return (
          <li
            key={d}
            className={`min-w-0 border bg-[#0b0b0b] ${d === today ? "border-white/40" : "border-white/10"}`}
          >
            <Link
              href={`/admin?date=${d}&view=day`}
              className="block min-h-11 border-b border-white/10 p-3 hover:bg-white hover:text-black transition"
            >
              <span className="block text-xs tracking-[0.2em] uppercase">{formatDate(d)}</span>
              <span className="mt-1 block text-[11px] text-white/50">
                {barbers.map((b) => `${initials(b.name)} ${day.filter((x) => x.barberId === b.id).length}`).join(" · ")}
              </span>
            </Link>
            <ul className="space-y-1 p-3 text-xs">
              {day.length === 0 && <li className="text-white/50">No bookings</li>}
              {day.map((b) => (
                <li key={b.id} className="flex gap-2">
                  <span className="shrink-0 text-white/50">{formatTime(b.startMin)}</span>
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="shrink-0 text-white/50">{initialsOf(b.barberId)}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
