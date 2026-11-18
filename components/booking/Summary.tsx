"use client";

import { useId, useState } from "react";
import { formatTime } from "@/lib/availability";
import {
  formatDate,
  formatGBP,
  getBarberName,
  type BookingDraft,
} from "@/lib/booking-shared";
import { INCLUDED_WITH_PREMIUM, useDraftQuote } from "./useDraftQuote";

type Props = {
  draft: BookingDraft;
  variant: "panel" | "bar";
};

import { useCatalog } from "./catalog-context";

const Empty = () => <span className="text-white/30">—</span>;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-white/60 shrink-0">{label}</dt>
      <dd className="text-white text-right min-w-0">{children}</dd>
    </div>
  );
}

function Rows({ draft }: { draft: BookingDraft }) {
  const catalog = useCatalog();
  const { service, chosen, freeAddons, q, addonCost } = useDraftQuote(draft);
  const barber = getBarberName(catalog, draft.barberId);
  const isMember = service?.kind === "membership";

  return (
    <>
      <dl className="space-y-4">
        <Row label="Service">
          {service ? (
            <>
              <span className="block">{service.name}</span>
              <span className="block text-xs text-white/40 mt-1">
                {isMember ? "Membership • Included" : formatGBP(service.priceGBP)}
              </span>
            </>
          ) : (
            <Empty />
          )}
        </Row>
        {chosen.map((a) => {
          return (
            <Row key={a.id} label="Add-on">
              <span className="block">{a.name}</span>
              <span className="block text-xs text-white/40 mt-1">
                {freeAddons ? INCLUDED_WITH_PREMIUM : `+${formatGBP(addonCost(a))}`}
              </span>
            </Row>
          );
        })}
        <Row label="Barber">{barber ?? <Empty />}</Row>
        <Row label="Date">{draft.date ? formatDate(draft.date) : <Empty />}</Row>
        <Row label="Time">
          {draft.startMin != null ? (
            q ? (
              `${formatTime(draft.startMin)} – ${formatTime(draft.startMin + q.durationMin)}`
            ) : (
              formatTime(draft.startMin)
            )
          ) : (
            <Empty />
          )}
        </Row>
        <Row label="Duration">{q ? `${q.durationMin} min` : <Empty />}</Row>
      </dl>
      <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-baseline">
        <span className="text-xs tracking-[0.2em] text-white/40">TOTAL</span>
        <span className="text-2xl font-[500]">{q ? formatGBP(q.totalGBP) : <Empty />}</span>
      </div>
      {isMember && q && q.totalGBP === 0 && (
        <p className="mt-2 text-[11px] text-white/40 text-right">Covered by your membership.</p>
      )}
    </>
  );
}

export default function Summary({ draft, variant }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { service, chosen, q } = useDraftQuote(draft);

  if (variant === "panel") {
    return (
      <aside aria-label="Your booking" className="bg-[#111] border border-white/10 rounded-xl p-8">
        <h2 className="text-xs tracking-[0.2em] text-white/40 mb-6">YOUR BOOKING</h2>
        <Rows draft={draft} />
      </aside>
    );
  }

  const when = [
    draft.date ? formatDate(draft.date) : null,
    draft.startMin != null ? formatTime(draft.startMin) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      aria-label="Your booking"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-black/80 backdrop-blur-md border-t border-white/10 px-4 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
    >
      {open && service && (
        <div id={panelId} className="max-h-[60vh] overflow-y-auto pt-2 pb-4 mb-3 border-b border-white/10">
          <Rows draft={draft} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          {service ? (
            <p className="truncate">
              <span className="text-white">{service.name}</span>
              {chosen.length > 0 && (
                <span className="text-white/50">
                  {" "}
                  + {chosen.length} add-on{chosen.length === 1 ? "" : "s"}
                </span>
              )}
              {when && <span className="text-white/50"> • {when}</span>}
              {q && <span className="text-white/50"> • {formatGBP(q.totalGBP)}</span>}
            </p>
          ) : (
            <p className="text-white/50">Choose a service</p>
          )}
        </div>
        {service && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="shrink-0 min-h-11 px-4 py-2 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            {open ? "HIDE" : "DETAILS"}
          </button>
        )}
      </div>
    </aside>
  );
}
