"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createBookingAction } from "@/app/book/actions";
import {
  emptyDraft,
  shopNow,
  validateDetails,
  type BookingDraft,
  type ConfirmedBooking,
} from "@/lib/booking-shared";
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

const noopSubscribe = () => () => {};
const getToday = () => shopNow().date;
const getServerToday = () => null;

export default function BookingFlow() {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  const submittingRef = useRef(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);

  // Shop-local "today", only after hydration (never read the clock on the server).
  const today = useSyncExternalStore(noopSubscribe, getToday, getServerToday);

  // On step change (not first paint): scroll to the flow and move focus to the
  // step container so keyboard / screen-reader users land on the new heading.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const el = flowRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    // ConfirmedStep focuses its own heading.
    if (!confirmed) stepRef.current?.focus({ preventScroll: true });
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

  const focusFirstInvalid = () => {
    requestAnimationFrame(() => {
      stepRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
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
      });
      if (res.ok) {
        setConfirmed(res.booking);
      } else if (res.code === "slot_taken" || res.code === "unavailable") {
        setDraft((d) => ({ ...d, startMin: null }));
        setNotice(res.error);
        setStep(2);
      } else if (res.code === "invalid" && res.fieldErrors && Object.keys(res.fieldErrors).length) {
        setShowErrors(true);
        setStep(3);
        focusFirstInvalid();
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
      focusFirstInvalid();
      return;
    }
    if (stepValid(step, draft)) goTo(step + 1);
  };

  const bookAnother = () => {
    setDraft(emptyDraft);
    setStep(0);
    setMaxReached(0);
    setShowErrors(false);
    setNotice(null);
    setReviewError(null);
    setConfirmed(null);
  };

  const continueDisabled =
    submitting || (step < 3 && !stepValid(step, draft));
  const continueLabel =
    step === LAST ? (submitting ? "CONFIRMING…" : "CONFIRM BOOKING") : "CONTINUE";

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
    <div ref={flowRef} className="max-w-6xl mx-auto px-4 sm:px-6">
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
                  <DetailsStep draft={draft} update={update} showErrors={showErrors} />
                )}
                {step === 4 && <ReviewStep draft={draft} onEdit={jump} error={reviewError} />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
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
        </div>

        <div className="hidden lg:block sticky top-24">
          <Summary draft={draft} variant="panel" />
        </div>
      </div>

      <Summary draft={draft} variant="bar" />
    </div>
  );
}
