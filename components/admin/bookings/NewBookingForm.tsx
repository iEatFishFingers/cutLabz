"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createBookingAction } from "@/app/admin/(panel)/bookings/actions";
import type { ServerCatalog } from "@/lib/catalog";
import { formatTime } from "@/lib/availability";
import { addonPrice, formatDate, formatGBP, LIMITS, quote } from "@/lib/booking-shared";
import {
  barberWindows,
  isOnLeave,
  nextStep,
  startSteps,
  type NewBookingState,
} from "@/lib/admin/bookings-shared";

type Props = {
  catalog: ServerCatalog;
  now: { date: string; min: number };
  initial: { date: string; barberId: string; startMin: number | null };
};

const INPUT =
  "w-full min-h-11 bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition [color-scheme:dark]";
const LABEL = "mb-2 block text-xs tracking-[0.2em] uppercase text-white/50";
const CHECK = "flex min-h-11 items-center gap-3 text-sm";
const OVERRIDE_WINDOW = [{ open: 6 * 60, close: 24 * 60 }];

export default function NewBookingForm({ catalog, now, initial }: Props) {
  const [state, action, pending] = useActionState<NewBookingState, FormData>(createBookingAction, {
    ok: null,
  });
  const [barberId, setBarberId] = useState(initial.barberId);
  const [serviceId, setServiceId] = useState(catalog.services[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState(initial.date);
  const [startMin, setStartMin] = useState<number | null>(initial.startMin);
  const [override, setOverride] = useState(false);
  const [walkIn, setWalkIn] = useState(false);

  const barber = catalog.barbers.find((b) => b.id === barberId);
  const service = catalog.services.find((s) => s.id === serviceId);
  const q = quote(catalog, serviceId, addonIds);
  const onLeave = barber ? isOnLeave(catalog.timeOff, barber.id, date) : false;
  const windows = override ? OVERRIDE_WINDOW : barber && !onLeave ? barberWindows(barber, date) : [];
  const steps = q ? startSteps(windows, q.durationMin) : [];
  const firstFree = steps.find((s) => date !== now.date || s >= nextStep(now.min)) ?? steps[0];
  const start = startMin !== null && steps.includes(startMin) ? startMin : (firstFree ?? "");

  if (state.ok) {
    return (
      <div className="border border-white/10 bg-[#0b0b0b] p-6">
        <p className="text-xs tracking-[0.2em] uppercase text-green-400">Booking created</p>
        <p className="mt-3 text-lg">
          {state.barberName} · {formatDate(state.date, { long: true })} · {formatTime(state.startMin)}
        </p>
        <p className="mt-1 text-sm text-white/60">Reference {state.reference}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/admin?date=${state.date}&view=day`}
            className="inline-flex min-h-11 items-center px-4 text-xs tracking-[0.2em] uppercase bg-white text-black"
          >
            Back to calendar
          </Link>
          <Link
            href={`/admin/bookings/new?date=${state.date}`}
            className="inline-flex min-h-11 items-center px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition"
          >
            Add another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6 md:grid-cols-2">
      <div>
        <label htmlFor="nb-barber" className={LABEL}>Barber</label>
        <select
          id="nb-barber"
          name="barberId"
          required
          value={barberId}
          onChange={(e) => setBarberId(e.target.value)}
          className={INPUT}
        >
          <option value="" className="bg-black">Choose a barber</option>
          {catalog.barbers.map((b) => (
            <option key={b.id} value={b.id} className="bg-black">{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="nb-service" className={LABEL}>Service</label>
        <select
          id="nb-service"
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={INPUT}
        >
          {catalog.services.map((s) => (
            <option key={s.id} value={s.id} className="bg-black">
              {s.name} ({s.durationMin} min{s.priceGBP ? `, ${formatGBP(s.priceGBP)}` : ""})
            </option>
          ))}
        </select>
      </div>

      <fieldset className="md:col-span-2">
        <legend className={LABEL}>Add-ons</legend>
        <div className="grid sm:grid-cols-2">
          {catalog.addons.map((a) => (
            <label key={a.id} className={CHECK}>
              <input
                type="checkbox"
                name="addonIds"
                value={a.id}
                checked={addonIds.includes(a.id)}
                onChange={(e) =>
                  setAddonIds((cur) =>
                    e.target.checked ? [...cur, a.id] : cur.filter((x) => x !== a.id),
                  )
                }
                className="size-5 accent-white"
              />
              <span>
                {a.name} <span className="text-white/50">{formatGBP(addonPrice(service, a))}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={`${CHECK} md:col-span-2`}>
        <input
          type="checkbox"
          checked={walkIn}
          onChange={(e) => {
            setWalkIn(e.target.checked);
            if (e.target.checked) {
              setDate(now.date);
              setStartMin(nextStep(now.min));
            }
          }}
          className="size-5 accent-white"
        />
        Walk-in (starts now)
      </label>

      <div>
        <label htmlFor="nb-date" className={LABEL}>Date</label>
        <input
          id="nb-date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setWalkIn(false);
          }}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="nb-start" className={LABEL}>Start time</label>
        <select
          id="nb-start"
          name="startMin"
          required
          value={start}
          onChange={(e) => {
            setStartMin(Number(e.target.value));
            setWalkIn(false);
          }}
          className={INPUT}
        >
          {steps.length === 0 && (
            <option value="" className="bg-black">
              {onLeave && !override ? "Time off" : "Closed"}
            </option>
          )}
          {steps.map((s) => (
            <option key={s} value={s} className="bg-black">{formatTime(s)}</option>
          ))}
        </select>
      </div>

      <label className={`${CHECK} md:col-span-2`}>
        <input
          type="checkbox"
          name="overrideHours"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
          className="size-5 accent-white"
        />
        Override hours (ignore working hours and time off)
      </label>

      <div className="md:col-span-2">
        <label htmlFor="nb-name" className={LABEL}>Customer name</label>
        <input id="nb-name" name="name" type="text" required maxLength={LIMITS.name} autoComplete="off" className={INPUT} />
      </div>
      <div>
        <label htmlFor="nb-phone" className={LABEL}>Phone (optional)</label>
        <input id="nb-phone" name="phone" type="tel" maxLength={LIMITS.phone} autoComplete="off" className={INPUT} />
      </div>
      <div>
        <label htmlFor="nb-email" className={LABEL}>Email (optional)</label>
        <input id="nb-email" name="email" type="email" maxLength={LIMITS.email} autoComplete="off" className={INPUT} />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="nb-notes" className={LABEL}>Notes</label>
        <textarea id="nb-notes" name="notes" rows={3} maxLength={LIMITS.notes} className={INPUT} />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || !start || !barberId}
          className="min-h-11 px-6 text-xs tracking-[0.2em] uppercase bg-white text-black disabled:opacity-40"
        >
          {pending ? "Saving..." : "Create booking"}
        </button>
        {q && (
          <span className="text-sm text-white/60">
            {q.durationMin} min · {formatGBP(q.totalGBP)}
          </span>
        )}
        <Link
          href={`/admin?date=${date}`}
          className="inline-flex min-h-11 items-center px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition"
        >
          Cancel
        </Link>
      </div>
      {state.ok === false && (
        <p role="alert" className="md:col-span-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
