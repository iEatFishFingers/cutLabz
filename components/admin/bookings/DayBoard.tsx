"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/availability";
import {
  statusLabel,
  STEP,
  PX,
  MIN_TILE_PX,
  assignLanes,
  type AdminBooking,
} from "@/lib/admin/bookings-shared";
import { AlertIcon, StatusIcon } from "../icons";
import BookingDetail from "./BookingDetail";
import { bookingClashes } from "./clash";

export type BoardBarber = {
  id: string;
  name: string;
  inactive?: boolean;
  /** Closed stretches inside the visible range. */
  closed: { start: number; end: number }[];
  onLeave: boolean;
};

function Column({
  barber,
  date,
  bounds,
  bookings,
  selectedId,
  onSelect,
  visible,
}: {
  barber: BoardBarber;
  date: string;
  bounds: { start: number; end: number };
  bookings: AdminBooking[];
  selectedId: string | null;
  onSelect: (id: string, el: HTMLElement) => void;
  visible: boolean;
}) {
  const router = useRouter();
  const lanes = assignLanes(bookings);
  const height = (bounds.end - bounds.start) * PX;

  const onEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = bounds.start + Math.floor(y / PX / STEP) * STEP;
    router.push(`/admin/bookings/new?date=${date}&barber=${barber.id}&start=${min}`);
  };

  return (
    <div className={`${visible ? "block" : "hidden"} md:block min-w-0 flex-1`}>
      <p className="hidden md:block mb-2 text-xs tracking-[0.2em] uppercase text-white/50">
        {barber.name}
        {barber.inactive ? " (Inactive)" : ""}
      </p>
      <div
        onClick={onEmptyClick}
        className="relative border border-white/10 bg-[#0a0a0a] cursor-pointer"
        style={{ height }}
      >
        {barber.closed.map((s) => (
          <div
            key={s.start}
            className="absolute inset-x-0 bg-white/[0.06] pointer-events-none"
            style={{ top: (s.start - bounds.start) * PX, height: (s.end - s.start) * PX }}
          >
            {(s.end - s.start) * PX >= 24 && (
              <span className="block px-2 pt-1 text-[10px] tracking-[0.2em] uppercase text-white/50">
                Closed
              </span>
            )}
          </div>
        ))}
        {barber.onLeave && (
          <div className="absolute inset-0 bg-[#111]/80 pointer-events-none">
            <span className="block px-2 pt-1 text-[10px] tracking-[0.2em] uppercase text-white/50">
              Time off
            </span>
          </div>
        )}
        {bookings.map((b, i) => {
          const cancelled = b.status === "cancelled";
          const clash = bookingClashes(b, barber);
          const { lane, lanes: n } = lanes[i];
          const sel = b.id === selectedId;
          const h = Math.max((b.endMin - b.startMin) * PX - 2, MIN_TILE_PX);
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => onSelect(b.id, e.currentTarget)}
              aria-pressed={sel}
              className={`absolute overflow-hidden border px-2 py-1 text-left text-xs leading-tight transition ${
                sel
                  ? "z-20 bg-white text-black border-white"
                  : clash
                    ? "z-10 bg-[#141414] border-amber-500 hover:border-white"
                    : "z-10 bg-[#141414] border-white/30 hover:border-white"
              } ${cancelled ? "opacity-50" : ""} ${clash && !sel ? "border-dashed" : ""}`}
              style={{
                top: (b.startMin - bounds.start) * PX + 1,
                height: h,
                left: `calc(${(lane / n) * 100}% + 1px)`,
                width: `calc(${100 / n}% - 2px)`,
              }}
            >
              <span className="flex items-center gap-1 tracking-[0.05em]">
                <StatusIcon status={b.status} onLight={sel} />
                <span className="truncate">
                  {formatTime(b.startMin)}–{formatTime(b.endMin)}
                </span>
                {clash && (
                  <span
                    className={`ml-auto inline-flex shrink-0 items-center gap-0.5 border px-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                      sel ? "border-amber-700 text-amber-800" : "border-amber-500 text-amber-400"
                    }`}
                  >
                    <AlertIcon className="size-2.5" />
                    Clash
                  </span>
                )}
              </span>
              <span className={`block truncate font-semibold ${cancelled ? "line-through" : ""}`}>
                <bdi>{b.name}</bdi>
              </span>
              <span className="block truncate">
                {b.serviceName}
                {b.addonNames.length ? ` +${b.addonNames.length}` : ""}
              </span>
              {b.status !== "confirmed" && h >= 78 && (
                <span className="block truncate uppercase tracking-[0.15em] text-[10px]">
                  {statusLabel(b)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DayBoard({
  date,
  barbers,
  bookings,
  bounds,
  defaultBarberId,
  initialSelectedId,
}: {
  date: string;
  barbers: BoardBarber[];
  bookings: AdminBooking[];
  bounds: { start: number; end: number };
  /** Barber tab to open on (the logged-in admin's own barber), if any. */
  defaultBarberId?: string | null;
  /** Booking to open straight away (from search). */
  initialSelectedId?: string | null;
}) {
  const initialBooking = bookings.find((b) => b.id === initialSelectedId) ?? null;
  const [barberId, setBarberId] = useState(
    initialBooking?.barberId ??
      (barbers.some((b) => b.id === defaultBarberId) ? (defaultBarberId as string) : (barbers[0]?.id ?? "")),
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialBooking?.id ?? null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => {
    setSelectedId(null);
    openerRef.current?.focus();
  };
  const onDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = [
      ...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
    ];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const selected = bookings.find((b) => b.id === selectedId) ?? null;
  const barberById = new Map(barbers.map((b) => [b.id, b]));
  const clashing = bookings.filter((b) => bookingClashes(b, barberById.get(b.barberId)));
  const rows: number[] = [];
  for (let m = bounds.start; m < bounds.end; m += 30) rows.push(m);

  const openFromBanner = (b: AdminBooking, el: HTMLElement) => {
    openerRef.current = el;
    setBarberId(b.barberId);
    setSelectedId(b.id);
  };

  return (
    <div>
      {clashing.length > 0 && (
        <div role="status" className="mb-4 border border-amber-500/60 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm text-amber-400">
            <AlertIcon className="size-4" />
            {clashing.length} {clashing.length === 1 ? "booking clashes" : "bookings clash"} with time off
            or hours
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {clashing.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={(e) => openFromBanner(b, e.currentTarget)}
                  className="inline-flex min-h-11 items-center gap-2 border border-amber-500/60 px-3 text-xs hover:bg-amber-500 hover:text-black"
                >
                  {formatTime(b.startMin)} · <bdi>{b.name}</bdi> · {barberById.get(b.barberId)?.name ?? ""}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="md:hidden mb-4 flex flex-wrap gap-2" role="group" aria-label="Barber">
        {barbers.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={b.id === barberId}
            onClick={() => setBarberId(b.id)}
            className={`min-h-11 px-4 text-xs tracking-[0.2em] uppercase border transition ${
              b.id === barberId
                ? "bg-white text-black border-white"
                : "border-white/20 hover:bg-white hover:text-black"
            }`}
          >
            {b.name}
            {b.inactive ? " (Inactive)" : ""}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="w-11 shrink-0 md:pt-[1.625rem]">
          <div className="relative" style={{ height: (bounds.end - bounds.start) * PX }}>
            {rows.map((m, i) => (
              <span
                key={m}
                className={`absolute right-0 text-[10px] text-white/50 ${i === 0 ? "" : "-translate-y-1/2"}`}
                style={{ top: (m - bounds.start) * PX }}
              >
                {formatTime(m)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 gap-3">
          {barbers.map((b) => (
            <Column
              key={b.id}
              barber={b}
              date={date}
              bounds={bounds}
              bookings={bookings.filter((x) => x.barberId === b.id)}
              selectedId={selectedId}
              onSelect={(id, el) => {
                openerRef.current = el;
                setSelectedId(id);
              }}
              visible={b.id === barberId}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-white/50">Tap an empty slot to add a booking.</p>

      {selected && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
            onKeyDown={onDialogKeyDown}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto border-t border-white/10 bg-[#0b0b0b] md:inset-x-auto md:right-0 md:top-0 md:max-h-none md:w-[420px] md:border-l md:border-t-0"
          >
            <BookingDetail
              key={selected.id}
              booking={selected}
              barberName={barbers.find((b) => b.id === selected.barberId)?.name ?? ""}
              clash={bookingClashes(selected, barberById.get(selected.barberId))}
              onClose={close}
            />
          </div>
        </>
      )}
    </div>
  );
}
