"use client";

import { motion } from "framer-motion";
import { barbers } from "@/lib/catalog";
import type { BookingDraft } from "@/lib/booking-shared";
import {
  CARD_BASE,
  CARD_IDLE,
  CARD_SELECTED,
  StepHeader,
  radioKeyDown,
} from "./ServiceStep";

type Props = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

export default function BarberStep({ draft, update }: Props) {
  const options = [
    {
      id: "any",
      name: "Any available",
      sub: "Fastest way in. We'll assign whoever's free.",
      mark: "—",
    },
    ...barbers.map((b) => ({ id: b.id, name: b.name, sub: b.role, mark: monogram(b.name) })),
  ];
  const hasSelection = options.some((o) => o.id === draft.barberId);

  return (
    <section>
      <StepHeader index={2} title="Pick your barber." body="Choose someone, or take the first free chair." />

      <div
        role="radiogroup"
        aria-label="Barber"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {options.map((o, i) => {
          const checked = draft.barberId === o.id;
          const tabbable = checked || (!hasSelection && i === 0);
          return (
            <motion.button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => update({ barberId: o.id })}
              onKeyDown={radioKeyDown}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.04 * i }}
              className={`${CARD_BASE} flex items-center gap-5 ${
                checked ? CARD_SELECTED : CARD_IDLE
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-12 h-12 shrink-0 flex items-center justify-center border text-xs tracking-[0.2em] ${
                  checked ? "border-black/20" : "border-white/10"
                }`}
              >
                {o.mark}
              </span>
              <span className="min-w-0">
                <span className="block text-base md:text-lg font-[500] tracking-[-0.01em]">
                  {o.name}
                </span>
                <span
                  className={`mt-1 block text-sm ${checked ? "text-black/60" : "text-white/50"}`}
                >
                  {o.sub}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
