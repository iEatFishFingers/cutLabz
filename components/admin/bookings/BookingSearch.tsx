"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchBookingsAction } from "@/app/admin/(panel)/bookings/actions";
import { formatTime } from "@/lib/availability";
import { statusLabel, type AdminBooking } from "@/lib/admin/bookings-shared";
import { AlertIcon, SearchIcon, StatusIcon } from "../icons";
import { shortDateWithYear } from "./clash";

type Result =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; bookings: AdminBooking[]; truncated: boolean };

export default function BookingSearch({ barbers }: { barbers: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result>({ phase: "idle" });
  const seq = useRef(0);

  const q = query.trim();
  const tooShort = q.length < 2;

  useEffect(() => {
    if (tooShort) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setResult({ phase: "loading" });
      try {
        const res = await searchBookingsAction(q);
        if (mine !== seq.current) return;
        setResult(
          res.ok
            ? { phase: "done", bookings: res.bookings, truncated: res.truncated }
            :{ phase: "error", message: res.error },
        );
      } catch {
        if (mine !== seq.current) return;
        setResult({
          phase: "error",
          message:
            typeof navigator !== "undefined" && navigator.onLine === false
              ? "No connection. Try again."
              : "Search failed. Your session may have expired.",
        });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, tooShort]);

  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "";
  // Short queries never show stale results.
  const shown: Result = tooShort ? { phase: "idle" } : result;

  return (
    <section aria-label="Search bookings" className="border border-white/10 bg-[#0b0b0b] p-3">
      <label htmlFor="booking-search" className="sr-only">
        Search bookings
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/50" />
        <input
          id="booking-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone or reference"
          autoComplete="off"
          maxLength={80}
          className="w-full min-h-12 bg-transparent border border-white/20 pl-12 pr-4 text-base text-white placeholder:text-white/40 focus:border-white/50 outline-none [color-scheme:dark]"
        />
      </div>
      {q.length > 0 && tooShort && <p className="mt-2 text-xs text-white/50">Type at least 2 characters.</p>}
      <div aria-live="polite">
        {shown.phase === "loading" && <p className="mt-3 text-sm text-white/50">Searching...</p>}
        {shown.phase === "error" && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {shown.message}
          </p>
        )}
        {shown.phase === "done" && shown.bookings.length === 0 && (
          <p className="mt-3 text-sm text-white/60">No bookings match.</p>
        )}
        {shown.phase === "done" && shown.bookings.length > 0 && (
          <ul className="mt-3 divide-y divide-white/10 border border-white/10">
            {shown.bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin?date=${b.date}&view=day&booking=${b.id}`}
                  className="block min-h-11 px-3 py-2 text-sm hover:bg-white hover:text-black"
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="shrink-0 text-xs tracking-[0.1em] opacity-70">
                      {shortDateWithYear(b.date)} · {formatTime(b.startMin)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      <bdi>{b.name}</bdi>
                    </span>
                    <span className="shrink-0 text-xs opacity-70">{barberName(b.barberId)}</span>
                    {b.clash === true && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 border border-red-500 px-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-500">
                        <AlertIcon className="size-2.5" />
                        Clash
                      </span>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 border border-current/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.15em]">
                      <StatusIcon status={b.status} />
                      {statusLabel(b)}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs opacity-70">
                    {b.phone ? <bdi>{b.phone}</bdi> : "No phone"} · Ref {b.reference}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {shown.phase === "done" && shown.truncated && (
          <p className="mt-2 text-xs text-white/60">Showing the first 25 matches. Narrow your search.</p>
        )}
      </div>
    </section>
  );
}
