"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { PlusIcon } from "../icons";
import { classifyThrown, FailureMessage, type ActionFailure } from "./actionErrors";

type Props = {
  catalog: ServerCatalog;
  now: { date: string; min: number };
  initial: { date: string; barberId: string; startMin: number | null };
  /** Barber linked to the logged-in admin, used as the default. */
  defaultBarberId?: string | null;
};

type FormState = NewBookingState | { ok: false; error: string; failure: ActionFailure };

const INPUT =
  "w-full min-h-11 bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition [color-scheme:dark]";
const LABEL = "mb-2 block text-xs tracking-[0.2em] uppercase text-white/50";
const CHECK = "flex min-h-11 items-center gap-3 text-sm";
const OVERRIDE_WINDOW = [{ open: 6 * 60, close: 24 * 60 }];
const DRAFT_KEY = "cutlabz-admin-new-booking-draft";

type Draft = {
  barberId: string;
  serviceId: string;
  addonIds: string[];
  date: string;
  startMin: number | null;
  override: boolean;
  walkIn: boolean;
  name: string;
  phone: string;
  email: string;
  notes: string;
  requestKey: string;
};

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);

function readDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === "object" ? (d as Partial<Draft>) : null;
  } catch {
    return null;
  }
}
const writeDraft = (d: Draft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: the form still works */
  }
};
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

export default function NewBookingForm(props: Props) {
  // Remounting the inner form gives "Add another" a clean slate and a new requestKey.
  const [round, setRound] = useState(0);
  return <FormInner key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

function FormInner({
  catalog,
  now,
  initial,
  defaultBarberId,
  onAnother,
}: Props & { onAnother: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      try {
        return await createBookingAction(prev as NewBookingState, fd);
      } catch (e) {
        return { ok: false, error: "", failure: classifyThrown(e) };
      }
    },
    { ok: null },
  );
  const fallbackBarber =
    defaultBarberId && catalog.barbers.some((b) => b.id === defaultBarberId) ? defaultBarberId : "";
  const [barberId, setBarberId] = useState(initial.barberId || fallbackBarber);
  const [serviceId, setServiceId] = useState(catalog.services[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState(initial.date);
  const [startMin, setStartMin] = useState<number | null>(initial.startMin);
  const [override, setOverride] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  // Empty until mounted (keeps server and client markup identical), then restored/generated.
  const [requestKey, setRequestKey] = useState("");
  const [restored, setRestored] = useState(false);
  const moreRef = useRef<HTMLDetailsElement>(null);

  // Restore a draft from sessionStorage once after mount. URL params (a tapped slot) win.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage after mount (SSR-safe) */
  useEffect(() => {
    const d = readDraft();
    const fromUrl = initial.barberId !== "" || initial.startMin !== null;
    if (d) {
      const validBarber =
        typeof d.barberId === "string" && catalog.barbers.some((b) => b.id === d.barberId);
      if (!fromUrl) {
        if (validBarber) setBarberId(d.barberId as string);
        if (typeof d.date === "string") setDate(d.date);
        if (typeof d.startMin === "number") setStartMin(d.startMin);
      }
      if (typeof d.serviceId === "string" && catalog.services.some((s) => s.id === d.serviceId))
        setServiceId(d.serviceId);
      if (Array.isArray(d.addonIds))
        setAddonIds(d.addonIds.filter((id) => catalog.addons.some((a) => a.id === id)));
      if (typeof d.override === "boolean") setOverride(d.override);
      if (typeof d.walkIn === "boolean") setWalkIn(d.walkIn);
      if (typeof d.name === "string") setName(d.name.slice(0, LIMITS.name));
      if (typeof d.phone === "string") setPhone(d.phone.slice(0, LIMITS.phone));
      if (typeof d.email === "string") setEmail(d.email.slice(0, LIMITS.email));
      if (typeof d.notes === "string") setNotes(d.notes.slice(0, LIMITS.notes));
    }
    setRequestKey(d && typeof d.requestKey === "string" && d.requestKey ? d.requestKey : newKey());
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const barber = catalog.barbers.find((b) => b.id === barberId);
  const service = catalog.services.find((s) => s.id === serviceId);
  const q = quote(catalog, serviceId, addonIds);
  const onLeave = barber ? isOnLeave(catalog.timeOff, barber.id, date) : false;
  const windows = override ? OVERRIDE_WINDOW : barber && !onLeave ? barberWindows(barber, date) : [];
  const steps = q ? startSteps(windows, q.durationMin) : [];
  const firstFree = steps.find((s) => date !== now.date || s >= nextStep(now.min)) ?? steps[0];
  const start = startMin !== null && steps.includes(startMin) ? startMin : (firstFree ?? "");

  // Keep the draft current; cleared on success.
  useEffect(() => {
    if (!restored || state.ok) return;
    writeDraft({
      barberId,
      serviceId,
      addonIds,
      date,
      startMin: typeof start === "number" ? start : startMin,
      override,
      walkIn,
      name,
      phone,
      email,
      notes,
      requestKey,
    });
  }, [restored, state.ok, barberId, serviceId, addonIds, date, start, startMin, override, walkIn, name, phone, email, notes, requestKey]);

  useEffect(() => {
    if (state.ok) clearDraft();
  }, [state.ok]);

  // Open "More options" when the returned error is about a field inside it.
  const errorText = state.ok === false ? state.error : "";
  const errorInMore = /phone|email|notes|date|hours|time off|working/i.test(errorText);
  useEffect(() => {
    if (errorInMore && moreRef.current) moreRef.current.open = true;
  }, [errorInMore, state]);

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
          <button
            type="button"
            onClick={onAnother}
            className="inline-flex min-h-11 items-center px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  const blockReason = !barberId
    ? "Pick a barber to continue"
    : !start
      ? onLeave && !override
        ? "This barber has time off. Tick \"Ignore working hours and time off\" under More options to book anyway."
        : "No start time available. Tick \"Ignore working hours and time off\" under More options to book anyway."
      : "";

  const failure = state.ok === false && "failure" in state ? state.failure : null;

  return (
    <form action={action} className="grid gap-6 md:grid-cols-2">
      <input type="hidden" name="requestKey" value={requestKey} />

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

      <div>
        <label htmlFor="nb-start" className={LABEL}>
          Start time <span className="normal-case tracking-normal text-white/40">· {formatDate(date)}</span>
        </label>
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
              {!barberId && !override ? "Choose a barber first" : onLeave && !override ? "Time off" : "Closed"}
            </option>
          )}
          {steps.map((s) => (
            <option key={s} value={s} className="bg-black">{formatTime(s)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="nb-name" className={LABEL}>Customer name</label>
        <input
          id="nb-name"
          name="name"
          type="text"
          required
          maxLength={LIMITS.name}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
        />
      </div>

      <details ref={moreRef} className="md:col-span-2 border border-white/10">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-xs tracking-[0.2em] uppercase text-white/70 hover:text-white">
          <PlusIcon className="size-3.5" />
          More options
          <span className="normal-case tracking-normal text-white/40">date, hours, phone, email, notes</span>
        </summary>
        <div className="grid gap-6 border-t border-white/10 p-4 md:grid-cols-2">
          <div>
            <label htmlFor="nb-date" className={LABEL}>Date</label>
            <input
              id="nb-date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setWalkIn(false);
              }}
              className={INPUT}
            />
          </div>
          <label className={CHECK}>
            <input
              type="checkbox"
              name="overrideHours"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="size-5 accent-white"
            />
            Ignore working hours and time off
          </label>
          <div>
            <label htmlFor="nb-phone" className={LABEL}>Phone (optional)</label>
            <input
              id="nb-phone"
              name="phone"
              type="tel"
              maxLength={LIMITS.phone}
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="nb-email" className={LABEL}>Email (optional)</label>
            <input
              id="nb-email"
              name="email"
              type="email"
              maxLength={LIMITS.email}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="nb-notes" className={LABEL}>Notes</label>
            <textarea
              id="nb-notes"
              name="notes"
              rows={3}
              maxLength={LIMITS.notes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </details>

      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || !!blockReason || !requestKey}
          aria-describedby={blockReason ? "nb-block-reason" : undefined}
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
          onClick={() => clearDraft()}
          className="inline-flex min-h-11 items-center px-4 text-xs tracking-[0.2em] uppercase border border-white/20 hover:bg-white hover:text-black transition"
        >
          Cancel
        </Link>
        {blockReason && (
          <span id="nb-block-reason" className="text-sm text-amber-400">
            {blockReason}
          </span>
        )}
      </div>
      {failure ? (
        <div className="md:col-span-2">
          <FailureMessage failure={failure} />
        </div>
      ) : (
        state.ok === false && (
          <p role="alert" className="md:col-span-2 text-sm text-red-400">
            {state.error}
          </p>
        )
      )}
    </form>
  );
}
