"use client";

import { useActionState, useState } from "react";
import { deleteTimeOff } from "@/app/admin/(panel)/time-off/actions";
import Link from "next/link";
import type { ActionResult } from "@/lib/admin/catalog-admin";
import { BTN_PRIMARY, BTN_SECONDARY, CARD, ResultMessage } from "./ui";

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

function Row({
  row,
  confirming,
  setConfirming,
}: {
  row: TimeOffRow;
  confirming: boolean;
  setConfirming: (open: boolean) => void;
}) {
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
              <Link href={`/admin?date=${row.start}`} className="inline-flex min-h-11 items-center underline">
                View calendar
              </Link>
            </p>
          ) : null}
        </div>
        {confirming ? null : (
          <button type="button" className={BTN_SECONDARY} onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {confirming ? (
        <form action={action} className="mt-3 border border-white/10 bg-[#0a0a0a] p-3">
          <input type="hidden" name="id" value={row.id} />
          <p className="text-sm text-white/70">
            Remove this time off? Customers will be able to book those days again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? "Removing..." : "Yes, remove"}
            </button>
            <button
              type="button"
              disabled={pending}
              className={BTN_SECONDARY}
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </div>
        </form>
      ) : null}
      {result && !result.ok ? <ResultMessage result={result} /> : null}
    </li>
  );
}

export default function TimeOffList({ rows }: { rows: TimeOffRow[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
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
              <Row
                key={r.id}
                row={r}
                confirming={openId === r.id}
                setConfirming={(o) => setOpenId(o ? r.id : null)}
              />
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
              <Row
                key={r.id}
                row={r}
                confirming={openId === r.id}
                setConfirming={(o) => setOpenId(o ? r.id : null)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
