"use client";

import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { addons, services, type Service } from "@/lib/catalog";
import {
  addonPrice,
  formatGBP,
  getService,
  type BookingDraft,
} from "@/lib/booking-shared";

type Props = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2";

export const CARD_BASE =
  "w-full rounded-xl p-6 border text-left transition " + FOCUS_RING;
export const CARD_IDLE = "bg-white/5 border-white/10 hover:bg-white/10";
export const CARD_SELECTED = "bg-white text-black border-white shadow-lg";

/** Shared step header: small label + heading + one line of body text. */
export function StepHeader({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <header className="mb-8 md:mb-10">
      <p className="text-xs tracking-[0.25em] text-white/40">
        STEP {String(index).padStart(2, "0")}
      </p>
      <h2 className="mt-3 text-3xl md:text-4xl font-[500] tracking-[-0.02em] leading-[1.1]">
        {title}
      </h2>
      <p className="mt-3 text-sm text-white/50">{body}</p>
    </header>
  );
}

/**
 * Arrow-key handling for a role="radiogroup": moves focus to the next/previous
 * enabled radio in the closest group and selects it (by clicking it).
 */
export function radioKeyDown(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = Array.from(
    group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
  );
  const i = radios.indexOf(e.currentTarget);
  if (i < 0 || radios.length === 0) return;
  e.preventDefault();
  let next = i;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % radios.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
    next = (i - 1 + radios.length) % radios.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = radios.length - 1;
  radios[next].focus();
  radios[next].click();
}

export default function ServiceStep({ draft, update }: Props) {
  const selected = getService(draft.serviceId);
  const membership = services.filter((s) => s.kind === "membership");
  const oneOff = services.filter((s) => s.kind === "one-off");
  const hasSelection = services.some((s) => s.id === draft.serviceId);

  const toggleAddon = (id: string) => {
    const set = new Set(draft.addonIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update({ addonIds: addons.filter((a) => set.has(a.id)).map((a) => a.id) });
  };

  const renderCard = (s: Service, order: number) => {
    const checked = draft.serviceId === s.id;
    const tabbable = checked || (!hasSelection && s.id === services[0].id);
    const delay = 0.04 * order;
    return (
      <motion.button
        key={s.id}
        type="button"
        role="radio"
        aria-checked={checked}
        tabIndex={tabbable ? 0 : -1}
        onClick={() => update({ serviceId: s.id })}
        onKeyDown={radioKeyDown}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay }}
        className={`${CARD_BASE} ${checked ? CARD_SELECTED : CARD_IDLE}`}
      >
        <span className="flex items-start justify-between gap-4">
          <span className="text-base md:text-lg font-[500] tracking-[-0.01em]">
            {s.name}
          </span>
          <span className="text-sm shrink-0">
            {s.kind === "membership" ? "Included" : formatGBP(s.priceGBP)}
          </span>
        </span>
        <span
          className={`mt-2 block text-sm ${checked ? "text-black/60" : "text-white/50"}`}
        >
          {s.description}
        </span>
        {s.kind === "membership" && (
          <span
            className={`mt-3 block text-xs ${checked ? "text-black/60" : "text-white/40"}`}
          >
            For active members
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <section>
      <StepHeader index={1} title="Choose your cut." body="Pick a membership cut or a one-off." />

      <div role="radiogroup" aria-label="Service" className="space-y-8">
        <div>
          <p className="mb-3 text-xs tracking-[0.2em] text-white/40">MEMBERSHIP</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {membership.map((s, i) => renderCard(s, i))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs tracking-[0.2em] text-white/40">ONE-OFF</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {oneOff.map((s, i) => renderCard(s, membership.length + i))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-10">
          <p className="mb-1 text-xs tracking-[0.2em] text-white/40">ADD-ONS</p>
          <p className="mb-4 text-sm text-white/50">
            {selected.id === "premium"
              ? "Included with Premium. Add as many as you like."
              : "Optional extras. Tap to add."}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addons.map((a) => {
              const on = draft.addonIds.includes(a.id);
              const price = addonPrice(selected, a);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAddon(a.id)}
                  className={`flex items-center gap-4 w-full rounded-xl px-5 py-4 border text-left transition ${FOCUS_RING} ${
                    on
                      ? "bg-white text-black border-white"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 shrink-0 flex items-center justify-center border text-xs ${
                      on ? "border-black/20" : "border-white/20"
                    }`}
                  >
                    {on ? "✓" : "+"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm">{a.name}</span>
                    <span className={`block text-xs ${on ? "text-black/60" : "text-white/40"}`}>
                      +{a.extraMin} min
                    </span>
                  </span>
                  <span className="text-sm shrink-0">
                    {price === 0 ? "Included" : formatGBP(price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
