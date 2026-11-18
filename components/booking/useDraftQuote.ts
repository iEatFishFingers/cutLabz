"use client";

import {
  planIncludesFreeAddons,
  quote,
  type BookingDraft,
} from "@/lib/booking-shared";
import type { Addon, Service } from "@/lib/catalog";
import { findService, pickAddons, useCatalog } from "./catalog-context";
import { canUseService, useViewer } from "./viewer-context";

/**
 * Display-only pricing for the current draft. Add-ons are free only on the
 * viewer's own Premium membership cut (the server enforces the same rule).
 */
export function useDraftQuote(draft: BookingDraft): {
  service: Service | undefined;
  chosen: Addon[];
  freeAddons: boolean;
  q: ReturnType<typeof quote>;
  addonCost: (a: Addon) => number;
} {
  const catalog = useCatalog();
  const viewer = useViewer();
  const service = findService(catalog, draft.serviceId);
  const chosen = pickAddons(catalog, draft.addonIds);
  const freeAddons =
    service?.kind === "membership" &&
    canUseService(viewer, service) &&
    planIncludesFreeAddons(viewer.membership?.plan);
  const q = quote(catalog, draft.serviceId, draft.addonIds, { freeAddons });
  return {
    service,
    chosen,
    freeAddons,
    q,
    addonCost: (a) => (freeAddons ? 0 : a.priceGBP),
  };
}

export const INCLUDED_WITH_PREMIUM = "£0 (included with Premium)";
