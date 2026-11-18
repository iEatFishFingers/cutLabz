"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FOCUS, LABEL } from "./ui";

/** Collapsible "Past and cancelled" list. Opens when the URL hash is #past-bookings. */
export default function PastBookings({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#past-bookings") setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section id="past-bookings" aria-labelledby="past-heading" className="mt-10 scroll-mt-28">
      <h2 id="past-heading">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="past-bookings-list"
          onClick={() => setOpen((o) => !o)}
          className={`flex min-h-11 w-full cursor-pointer items-center gap-2 text-left ${LABEL} hover:text-white transition ${FOCUS}`}
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span>
          Past and cancelled ({count})
        </button>
      </h2>
      <ul id="past-bookings-list" hidden={!open} className="mt-3 space-y-4">
        {children}
      </ul>
    </section>
  );
}
