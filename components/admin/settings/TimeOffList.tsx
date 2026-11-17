"use client";

import { useActionState } from "react";
import { deleteTimeOff } from "@/app/admin/(panel)/time-off/actions";
import Link from "next/link";
import type { ActionResult } from "@/lib/admin/catalog-admin";
import { BTN_SECONDARY, CARD, ResultMessage } from "./ui";

export type TimeOffRow = {
  id: number;
  barberId: string;
  barberName: string;
  start: string;
  end: string;
  reason: string;
  upcoming: boolean;
  /** Active bookings inside the range; null if it could not be computed. */
  overlapping: number | null;
};

function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function Row({ row }: { row: TimeOffRow }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    deleteTimeOff,
    null,
  );
  const range =
    row.start === row.end
      ? formatDate(row.start)
      : `${formatDate(row.start)} to ${formatDate(row.end)}`;
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-white">{row.barberName}</p>
          <p className="text-sm text-white/60">{range}</p>
          {row.reason ? (
            <p className="mt-1 break-words text-xs text-white/40">{row.reason}</p>
          ) : null}
          {row.upcoming && row.overlapping ? (
            <p className="mt-1 text-xs text-red-400">
              {row.overlapping} {row.overlapping === 1 ? "booking overlaps" : "bookings overlap"}{" "}
              this time off and need handling.{" "}
              <Link href={`/admin?date=${row.start}`} className="underline">
                View calendar
              </Link>
            </p>
          ) : null}
        </div>
        <form action={action}>
          <input type="hidden" name="id" value={row.id} />
          <button type="submit" disabled={pending} className={BTN_SECONDARY}>
            {pending ? "Removing..." : "Delete"}
          </button>
        </form>
      </div>
      {result && !result.ok ? <ResultMessage result={result} /> : null}
    </li>
  );
}

export default function TimeOffList({ rows }: { rows: TimeOffRow[] }) {
  const upcoming = rows.filter((r) => r.upcoming);
  const past = rows.filter((r) => !r.upcoming).reverse();
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/60">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-white/40">No upcoming time off.</p>
        ) : (
          <ul className={`${CARD} divide-y divide-white/10`}>
            {upcoming.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/60">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-white/40">No past time off.</p>
        ) : (
          <ul className={`${CARD} divide-y divide-white/10`}>
            {past.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
