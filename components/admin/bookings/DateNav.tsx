"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, formatDate, isValidDateString } from "@/lib/booking-shared";
import type { View } from "@/lib/admin/bookings-shared";

const BTN =
  "inline-flex min-h-11 items-center justify-center px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition";
const BTN_ON = "inline-flex min-h-11 items-center justify-center px-4 text-xs tracking-[0.2em] uppercase bg-white text-black";

export default function DateNav({
  date,
  view,
  isToday,
}: {
  date: string;
  view: View;
  isToday: boolean;
}) {
  const router = useRouter();
  const step = view === "week" ? 7 : 1;
  const href = (d: string | null, v: View = view) =>
    `/admin?${d ? `date=${d}&` : ""}view=${v}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(addDays(date, -step))} className={BTN} aria-label="Previous">
          Prev
        </Link>
        <Link href={href(null)} className={isToday && view === "day" ? BTN_ON : BTN}>
          Today
        </Link>
        <Link href={href(addDays(date, step))} className={BTN} aria-label="Next">
          Next
        </Link>
        <input
          type="date"
          aria-label="Go to date"
          value={date}
          onChange={(e) => {
            if (isValidDateString(e.target.value)) router.push(href(e.target.value));
          }}
          className="min-h-11 bg-transparent border border-white/10 px-3 text-sm text-white outline-none focus:border-white/30 [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-[0.2em] uppercase text-white/50">
          {formatDate(date, { long: true })}
        </p>
        <div className="flex gap-2">
          <Link href={href(date, "day")} className={view === "day" ? BTN_ON : BTN}>
            Day
          </Link>
          <Link href={href(date, "week")} className={view === "week" ? BTN_ON : BTN}>
            Week
          </Link>
          <Link href={`/admin/bookings/new?date=${date}`} className={BTN}>
            New booking
          </Link>
        </div>
      </div>
    </div>
  );
}
