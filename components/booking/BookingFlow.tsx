"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createBookingAction } from "@/app/book/actions";
import type { ClientCatalog } from "@/lib/catalog";
import {
  LIMITS,
  emptyDraft,
  isInWindow,
  isValidDateString,
  validateDetails,
  type BookingDraft,
  type ConfirmedBooking,
} from "@/lib/booking-shared";
import { CatalogProvider } from "./catalog-context";
import { canUseService, useViewer, type BookingViewer } from "./viewer-context";
import { useShopToday } from "./useShopToday";
import ProgressSteps, { STEP_LABELS } from "./ProgressSteps";
import Summary from "./Summary";
import ServiceStep from "./ServiceStep";
import BarberStep from "./BarberStep";
import DateTimeStep from "./DateTimeStep";
import DetailsStep from "./DetailsStep";
import ReviewStep from "./ReviewStep";
import ConfirmedStep from "./ConfirmedStep";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
const LAST = 4;

const primaryBtn =
  "px-6 py-3 text-xs tracking-[0.2em] bg-white text-black border border-white hover:bg-transparent hover:text-white transition disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2";
const secondaryBtn =
  "px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2";

// Fields whose change invalidates the chosen time (duration or availability changes).
const SLOT_KEYS = ["serviceId", "addonIds", "barberId", "date"] as const;

function stepValid(step: number, d: BookingDraft): boolean {
  switch (step) {
    case 0:
      return d.serviceId != null;
    case 1:
      return d.barberId != null;
    case 2:
      return d.date != null && d.startMin != null;
    case 3:
      return Object.keys(validateDetails(d)).length === 0;
    default:
      return true;
  }
}

/** Index of the first step that is not complete (LAST if all are). */
function firstInvalid(d: BookingDraft): number {
  for (let i = 0; i < LAST; i++) if (!stepValid(i, d)) return i;
  return LAST;
}

// ---- sessionStorage persistence (every access guarded; stored data untrusted) ----

const STALE_MESSAGES = ["Choose a valid service.", "Choose a valid barber.", "Unknown add-on."];

const STORAGE_KEY = "cutlabz:booking:v1";

type Stored = { draft: BookingDraft; step: number; maxReached: number };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function readStored(catalog: ClientCatalog): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    const d = (rec.draft && typeof rec.draft === "object" ? rec.draft : {}) as Record<
      string,
      unknown
    >;
    const serviceId =
      typeof d.serviceId === "string" && catalog.services.some((s) => s.id === d.serviceId)
        ? d.serviceId
        : null;
    const addonIds =
      serviceId && Array.isArray(d.addonIds)
        ? catalog.addons.filter((a) => (d.addonIds as unknown[]).includes(a.id)).map((a) => a.id)
        : [];
    const barberId =
      typeof d.barberId === "string" &&
      (d.barberId === "any" || catalog.barbers.some((b) => b.id === d.barberId))
        ? d.barberId
        : null;
    const date = typeof d.date === "string" && isValidDateString(d.date) ? d.date : null;
    const startMin =
      date &&
      typeof d.startMin === "number" &&
      Number.isInteger(d.startMin) &&
      d.startMin >= 0 &&
      d.startMin < 1440
        ? d.startMin
        : null;
    const int = (v: unknown) =>
      typeof v === "number" && Number.isInteger(v) ? Math.min(LAST, Math.max(0, v)) : 0;
    return {
      draft: {
        serviceId,
        addonIds,
        barberId,
        date,
        startMin,
        name: str(d.name, LIMITS.name),
        email: str(d.email, LIMITS.email),
        phone: str(d.phone, LIMITS.phone),
        notes: str(d.notes, LIMITS.notes),
      },
      step: int(rec.step),
      maxReached: int(rec.maxReached),
    };
  } catch {
    return null;
  }
}

// Idempotency key for the confirm attempt session. Kept in sessionStorage so a
// retry after a failure (or a reload mid-submit) reuses it; cleared on success
// and whenever the booking details or slot change.
const KEY_STORAGE = "cutlabz:booking:requestKey";

let memoryKey: string | null = null; // fallback when sessionStorage is unavailable

function getRequestKey(): string {
  let key: string | null = null;
  try {
    const existing = window.sessionStorage.getItem(KEY_STORAGE);
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) key = existing;
  } catch {
    // use the in-memory key
  }
  key = key ?? memoryKey ?? crypto.randomUUID();
  memoryKey = key;
  try {
    window.sessionStorage.setItem(KEY_STORAGE, key);
  } catch {
    // ignore
  }
  return key;
}

function clearRequestKey() {
  memoryKey = null;
  try {
    window.sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // ignore
  }
}

function writeStored(value: Stored | null) {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the flow still works, just unsaved.
  }
}

/** Draft with the account's details applied: email is always the account's. */
function withViewer(d: BookingDraft, v: BookingViewer): BookingDraft {
  return {
    ...d,
    name: d.name.trim() ? d.name : v.name,
    phone: d.phone.trim() ? d.phone : v.phone,
    email: v.email,
  };
}

export default function BookingFlow({ catalog }: { catalog: ClientCatalog }) {
  return (
    <CatalogProvider catalog={catalog}>
      <MotionConfig reducedMotion="user">
        <Flow catalog={catalog} />
      </MotionConfig>
    </CatalogProvider>
  );
}

function Flow({ catalog }: { catalog: ClientCatalog }) {
  const viewer = useViewer();
  const [rawDraft, setDraft] = useState<BookingDraft>(() => withViewer(emptyDraft, viewer));
  const [rawStep, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState<{ href: string; label: string } | null>(null);
  const [staleMenu, setStaleMenu] = useState(false);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  const [slow, setSlow] = useState(false);
  const submittingRef = useRef(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);
  const skipStepEffect = useRef(false);
  const skipStepFocus = useRef(false);
  const pendingFocus = useRef(false);

  // Shop-local "today": null on the server / first paint, then kept fresh (rolls
  // over at shop-local midnight, re-checked when the tab becomes visible).
  const today = useShopToday();

  // A chosen date that has left the bookable window (e.g. past midnight) is
  // dropped. Derived, not stored, so it never lags a render.
  const draft = useMemo<BookingDraft>(() => {
    let d = withViewer(rawDraft, viewer);
    // A saved choice the viewer cannot use (signed in as someone else, plan ended,
    // or not a member) is reset instead of failing at the server.
    const svc = catalog.services.find((s) => s.id === d.serviceId);
    if (d.serviceId && (!svc || !canUseService(viewer, svc))) {
      d = { ...d, serviceId: null, addonIds: [], startMin: null };
    }
    const memberCut = svc?.kind === "membership";
    if (
      d.date &&
      ((today && !isInWindow(d.date, today)) ||
        (memberCut && viewer.membership && d.date > viewer.membership.endsOn))
    ) {
      d = { ...d, date: null, startMin: null };
    }
    return d;
  }, [rawDraft, today, viewer, catalog]);

  // Never show a step whose prerequisites are no longer met.
  const step = Math.min(rawStep, firstInvalid(draft));

  // Restore saved progress after mount (never during render: no hydration mismatch).
  useEffect(() => {
    const saved = readStored(catalog);
    if (saved) {
      const target = Math.min(saved.step, firstInvalid(saved.draft));
      if (target > 0) skipStepEffect.current = true;
      // Intentional: sessionStorage is client-only, so it can only be read post-mount.
      /* eslint-disable react-hooks/set-state-in-effect */
      setDraft(withViewer(saved.draft, viewer));
      setStep(target);
      setMaxReached(Math.max(saved.maxReached, target));
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog, viewer]);

  // Browser Back/Forward moves between steps. Each step change pushes one history
  // entry (same URL, so no Next.js navigation) tagged with `cutlabzStep`; the
  // existing history.state is spread so Next's own keys survive. popstate only
  // sets the step; the effect then sees state.cutlabzStep === step and does not
  // push again, so there is no loop. The first entry after load is replaced, not
  // pushed, so a reload / sessionStorage restore keeps working as before.
  const histInit = useRef(false);
  const confirmedRef = useRef(false);
  useEffect(() => {
    confirmedRef.current = confirmed != null;
  }, [confirmed]);
  useEffect(() => {
    if (!hydrated) return;
    const cur = (window.history.state ?? {}) as Record<string, unknown>;
    if (!histInit.current) {
      histInit.current = true;
      window.history.replaceState({ ...cur, cutlabzStep: step }, "");
    } else if (cur.cutlabzStep !== step) {
      window.history.pushState({ ...cur, cutlabzStep: step }, "");
    }
  }, [hydrated, step]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { cutlabzStep?: unknown } | null)?.cutlabzStep;
      if (confirmedRef.current || typeof s !== "number" || submittingRef.current) return;
      setStep(Math.min(LAST, Math.max(0, s)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Persist progress; cleared once a booking is confirmed.
  useEffect(() => {
    if (!hydrated) return;
    if (confirmed) writeStored(null);
    else writeStored({ draft: rawDraft, step: rawStep, maxReached });
  }, [hydrated, confirmed, rawDraft, rawStep, maxReached]);

  const consumeFocus = useCallback(() => {
    const was = pendingFocus.current;
    pendingFocus.current = false;
    return was;
  }, []);

  const requestFocusInvalid = (stepChanges: boolean) => {
    pendingFocus.current = true;
    if (stepChanges) skipStepFocus.current = true;
    setFocusSignal((n) => n + 1);
  };

  // On step change (not first paint): scroll to the flow and move focus to the
  // step container so keyboard / screen-reader users land on the new heading.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (skipStepEffect.current) {
      skipStepEffect.current = false;
      return;
    }
    const el = flowRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
    const skipFocus = skipStepFocus.current;
    skipStepFocus.current = false;
    // ConfirmedStep focuses its own heading; a pending invalid-field focus wins.
    if (!confirmed && !skipFocus) stepRef.current?.focus({ preventScroll: true });
  }, [step, confirmed]);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      const slotChanged = SLOT_KEYS.some(
        (k) => k in patch && JSON.stringify(prev[k]) !== JSON.stringify(next[k]),
      );
      if (slotChanged && !("startMin" in patch)) next.startMin = null;
      return next;
    });
    if (("startMin" in patch && patch.startMin != null) || "date" in patch) setNotice(null);
    setReviewError(null);
    setReviewLink(null);
    setStaleMenu(false);
    clearRequestKey(); // details/slot changed: a new attempt session
  }, []);

  const reachable = Math.min(maxReached, firstInvalid(draft));

  const goTo = useCallback((target: number) => {
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
  }, []);

  const jump = (target: number) => {
    if (submittingRef.current) return;
    if (target <= reachable) goTo(target);
  };

  const back = () => {
    if (step > 0 && !submittingRef.current) goTo(step - 1);
  };

  const submit = async () => {
    if (submittingRef.current) return;
    const { serviceId, barberId, date, startMin } = draft;
    if (serviceId == null || barberId == null || date == null || startMin == null) {
      goTo(firstInvalid(draft));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setReviewError(null);
    setReviewLink(null);
    setStaleMenu(false);
    try {
      const res = await createBookingAction({
        serviceId,
        addonIds: draft.addonIds,
        barberId,
        date,
        startMin,
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        notes: draft.notes,
        requestKey: getRequestKey(),
      });
      const code: string = res.ok ? "ok" : res.code;
      if (res.ok) {
        clearRequestKey();
        setConfirmed(res.booking);
      } else if (code === "auth") {
        setReviewError(res.error);
        setReviewLink({ href: "/login?next=/book", label: "SIGN IN" });
      } else if (code === "membership") {
        setReviewError(res.error);
        setReviewLink({ href: "/account/membership", label: "VIEW MEMBERSHIP" });
      } else if (code === "limit") {
        setReviewError(res.error);
        setReviewLink({ href: "/account", label: "MANAGE APPOINTMENTS" });
      } else if (res.code === "slot_taken") {
        clearRequestKey();
        setDraft((d) => ({ ...d, startMin: null }));
        setNotice(res.error);
        setStep(2);
      } else if (res.code === "error") {
        setReviewError(res.error);
      } else if (res.code === "unavailable") {
        // Stay on review and show the server's message there.
        setReviewError(res.error);
      } else if (
        res.code === "invalid" &&
        res.fieldErrors &&
        Object.keys(res.fieldErrors).length > 0 &&
        Object.keys(validateDetails(draft)).length > 0
      ) {
        setShowErrors(true);
        setStep(3);
        requestFocusInvalid(true);
      } else if (
        res.code === "invalid" &&
        !res.fieldErrors &&
        STALE_MESSAGES.includes(res.error)
      ) {
        // The menu changed under us: our catalog copy is out of date.
        setStaleMenu(true);
      } else {
        setReviewError(res.error);
      }
    } catch {
      setReviewError("Something went wrong. Check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === LAST) {
      void submit();
      return;
    }
    if (step === 3 && !stepValid(3, draft)) {
      setShowErrors(true);
      requestFocusInvalid(false);
      return;
    }
    if (stepValid(step, draft)) goTo(step + 1);
  };

  const reloadMenu = () => {
    const cleared: BookingDraft = {
      ...draft,
      serviceId: null,
      addonIds: [],
      barberId: null,
      startMin: null,
    };
    clearRequestKey();
    writeStored({ draft: cleared, step: 0, maxReached: 0 });
    setDraft(cleared);
    setStep(0);
    setMaxReached(0);
    setStaleMenu(false);
    router.refresh();
  };

  const bookAnother = () => {
    setDraft(withViewer(emptyDraft, viewer));
    setStep(0);
    setMaxReached(0);
    setShowErrors(false);
    setNotice(null);
    setReviewError(null);
    setReviewLink(null);
    setConfirmed(null);
    clearRequestKey();
    writeStored(null);
  };

  // Show a "taking a while" hint if confirming lasts more than 2 s.
  useEffect(() => {
    if (!submitting) return;
    const t = setTimeout(() => setSlow(true), 2000);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [submitting]);

  const continueDisabled = submitting || (step < 3 && !stepValid(step, draft));
  const continueLabel =
    step === LAST ? (submitting ? "BOOKING…" : "CONFIRM BOOKING") : "CONTINUE";

  if (confirmed) {
    return (
      <div ref={flowRef} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-label="Booking confirmed"
          className="outline-none max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <ConfirmedStep booking={confirmed} onBookAnother={bookAnother} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={flowRef}
      className={`max-w-6xl mx-auto px-4 sm:px-6 ${step === LAST ? "" : "pb-24 lg:pb-0"}`}
    >
      <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <div className="min-w-0">
          <ProgressSteps step={step} maxReached={reachable} onJump={jump} />

          <div
            ref={stepRef}
            tabIndex={-1}
            role="region"
            aria-label={`Step ${step + 1} of ${STEP_LABELS.length}: ${STEP_LABELS[step].toLowerCase()}`}
            className="outline-none"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6, ease }}
              >
                {step === 0 && <ServiceStep draft={draft} update={update} />}
                {step === 1 && <BarberStep draft={draft} update={update} />}
                {step === 2 && (
                  <DateTimeStep draft={draft} update={update} today={today} notice={notice} />
                )}
                {step === 3 && (
                  <DetailsStep
                    draft={draft}
                    update={update}
                    showErrors={showErrors}
                    focusSignal={focusSignal}
                    consumeFocus={consumeFocus}
                  />
                )}
                {step === 4 && <ReviewStep
                    draft={draft}
                    onEdit={jump}
                    error={staleMenu ? "Our menu just changed. Reload to see the latest." : reviewError}
                    onReload={staleMenu ? reloadMenu : undefined}
                    link={staleMenu ? null : reviewLink}
                  />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            {step > 0 ? (
              <button type="button" onClick={back} disabled={submitting} className={secondaryBtn}>
                ← BACK
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={next}
              disabled={continueDisabled}
              aria-busy={submitting || undefined}
              className={primaryBtn}
            >
              {continueLabel}
              {step < LAST && " →"}
            </button>
          </div>
          {submitting && slow && (
            <p role="status" className="mt-4 text-sm text-white/60 text-right">
              This can take a few seconds. Please don&apos;t close or resubmit.
            </p>
          )}
        </div>

        <div className="hidden lg:block sticky top-24">
          <Summary draft={draft} variant="panel" />
        </div>
      </div>

      {/* The review step already shows everything, so the compact bar is hidden there. */}
      {step !== LAST && <Summary draft={draft} variant="bar" />}
    </div>
  );
}
