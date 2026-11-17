"use client";

import { createContext, useContext } from "react";
import type { Addon, ClientCatalog, Service } from "@/lib/catalog";

const CatalogContext = createContext<ClientCatalog | null>(null);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: ClientCatalog;
  children: React.ReactNode;
}) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): ClientCatalog {
  const c = useContext(CatalogContext);
  if (!c) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return c;
}

// Local lookups (pure, catalog passed explicitly) so components only depend on
// the catalog shape, not on lib helper signatures.
export const findService = (c: ClientCatalog, id: string | null): Service | undefined =>
  c.services.find((s) => s.id === id);

/** Valid, de-duplicated add-ons in catalog order. Unknown ids are dropped. */
export const pickAddons = (c: ClientCatalog, ids: string[]): Addon[] =>
  c.addons.filter((a) => ids.includes(a.id));
