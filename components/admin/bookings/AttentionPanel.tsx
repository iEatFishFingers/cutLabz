"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  getAttentionAction,
  markContactedAction,
  setBookingStatusAction,
} from "@/app/admin/(panel)/bookings/actions";
import { formatTime } from "@/lib/availability";
import type { AdminBooking, BookingStatus } from "@/lib/admin/bookings-shared";
import { AlertIcon, CheckIcon, EyeOffIcon } from "../icons";
import { classifyThrown, FailureMessage, type ActionFailure } from "./actionErrors";
import { shortDateWithYear } from "./clash";

export type Attention = {
  clashes: AdminBooking[];
  unresolvedPast: AdminBooking[];
  toContact: AdminBooking[];
};

const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-4 text-xs tracking-[0.2em] uppercase transition hover:bg-white hover:text-black disabled:opacity-40";
const HEAD = "text-xs tracking-[0.2em] uppercase text-white/50";

export default function AttentionPanel({
  initial,
  barbers,
}: {
  initial: Attention;
  barbers: { id: string; name: string }[];
}) {
  const [data, setData] = useState<Attention>(initial);
  const [pending, start] = useTransition();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const total = data.unresolvedPast.length + data.toContact.length + data.clashes.length;
  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "";

  const run = (id: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setFailure(null);
    setBusyId(id);
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) setFailure({ kind: "server", message: res.error });
        // Refresh the lists either way (a stale row should disappear).
        const fresh = await getAttentionAction();
        if (fresh.ok) {
          setData({
            clashes: fresh.clashes,
            unresolvedPast: fresh.unresolvedPast,
            toContact: fresh.toContact,
          });
        } else if (res.ok) {
          setFailure({ kind: "server", message: fresh.error });
        }
      } catch (e) {
        setFailure(classifyThrown(e));
      } finally {
        setBusyId(null);
      }
    });
  };

  const close = (b: AdminBooking, status: Extract<BookingStatus, "completed" | "no_show">) =>
    run(b.id, () =>
      setBookingStatusAction(b.id, status, b.status === "unknown" ? b.statusRaw : b.status),
    );

  const when = (b: AdminBooking) => `${shortDateWithYear(b.date)} · ${formatTime(b.startMin)}`;

  if (total === 0) {
    return (
      <p role="status" className="border border-white/10 bg-[#0b0b0b] px-4 py-3 text-xs text-white/50">
        Nothing needs attention
      </p>
    );
  }

  return (
    <details open className="border border-amber-500/60 bg-amber-500/5">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2 text-sm text-amber-400">
        <AlertIcon className="size-4" />
        <span className="font-semibold uppercase tracking-[0.15em] text-xs">Needs attention</span>
        <span className="text-xs">
          ({data.unresolvedPast.length} to close out · {data.toContact.length} to phone ·{" "}
          {data.clashes.length} clashes)
        </span>
      </summary>
      <div className="space-y-5 px-4 pb-4">
        {failure && <FailureMessage failure={failure} />}

        {data.unresolvedPast.length > 0 && (
          <section aria-label="Past bookings to close out">
            <h3 className={HEAD}>Past bookings to close out ({data.unresolvedPast.length})</h3>
            <ul className="mt-2 divide-y divide-white/10 border border-white/10">
              {data.unresolvedPast.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs opacity-70">
                      {when(b)} · {barberName(b.barberId)}
                    </span>
                    <span className="block truncate font-semibold">
                      <bdi>{b.name}</bdi>
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => close(b, "completed")}
                      className={BTN}
                    >
                      <CheckIcon /> {pending && busyId === b.id ? "Saving..." : "Completed"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => close(b, "no_show")}
                      className={BTN}
                    >
                      <EyeOffIcon /> No-show
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.toContact.length > 0 && (
          <section aria-label="Customers to phone">
            <h3 className={HEAD}>Customers to phone ({data.toContact.length})</h3>
            <ul className="mt-2 divide-y divide-white/10 border border-white/10">
              {data.toContact.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs opacity-70">{when(b)}</span>
                    <span className="block truncate font-semibold">
                      <bdi>{b.name}</bdi>
                    </span>
                    {b.phone ? (
                      <a
                        href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex min-h-11 items-center underline underline-offset-4"
                      >
                        <bdi>{b.phone}</bdi>
                      </a>
                    ) : (
                      <span className="block text-xs text-white/50">No phone number</span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(b.id, () => markContactedAction(b.id))}
                    className={BTN}
                  >
                    {pending && busyId === b.id ? "Saving..." : "Mark as contacted"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.clashes.length > 0 && (
          <section aria-label="Clashes in the next 28 days">
            <h3 className={HEAD}>Clashes in the next 28 days ({data.clashes.length})</h3>
            <ul className="mt-2 divide-y divide-white/10 border border-white/10">
              {data.clashes.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin?date=${b.date}&view=day&booking=${b.id}`}
                    className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm hover:bg-white hover:text-black"
                  >
                    <span className="shrink-0 text-xs opacity-70">{when(b)}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      <bdi>{b.name}</bdi>
                    </span>
                    <span className="shrink-0 text-xs opacity-70">{barberName(b.barberId)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}
