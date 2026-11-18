import "server-only";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase/admin";
import {
  seedCatalog,
  type Addon,
  type CatalogBarber,
  type ClientCatalog,
  type Hours,
  type Service,
  type ServerCatalog,
  type TimeOff,
} from "./catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function orderBySeed<T extends { id: string; name: string }>(rows: T[], seed: { id: string }[]): T[] {
  const idx = (id: string) => {
    const i = seed.findIndex((s) => s.id === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...rows].sort(
    (a, b) => idx(a.id) - idx(b.id) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

function must(
  res: { data: unknown; error: { message: string } | null },
  what: string,
): Row[] {
  if (res.error || !Array.isArray(res.data)) {
    throw new Error(`Failed to load ${what}${res.error ? `: ${res.error.message}` : ""}`);
  }
  return res.data as Row[];
}

/** Drops barbers with no availability rows at all (never bookable by customers). */
export function withoutHourlessBarbers<T extends { barbers: CatalogBarber[] }>(c: T): T {
  return { ...c, barbers: c.barbers.filter((b) => Object.keys(b.hours).length > 0) };
}

/** Customer-facing catalog: barbers without any opening hours are excluded. */
export async function loadCatalog(): Promise<ServerCatalog> {
  return withoutHourlessBarbers(await loadCatalogAll());
}

/** Admin tools: every active barber, even one that has no hours yet. */
export async function loadAdminCatalog(): Promise<ServerCatalog> {
  return loadCatalogAll();
}

async function loadCatalogAll(): Promise<ServerCatalog> {
  if (!hasSupabaseEnv()) {
    if (process.env.NODE_ENV !== "production") return seedCatalog;
    throw new Error("Supabase is not configured.");
  }
  const db = getSupabaseAdmin();
  const [b, s, a, av, to] = await Promise.all([
    db.from("barbers").select("id,name,role").eq("active", true),
    db.from("services").select("id,name,description,duration_min,price_pence,kind").eq("active", true),
    db.from("addons").select("id,name,price_pence,extra_min").eq("active", true),
    db.from("availability").select("barber_id,weekday,open_min,close_min"),
    db.from("time_off").select("barber_id,start_date,end_date"),
  ]);
  const barberRows = must(b, "barbers");
  const serviceRows = must(s, "services");
  const addonRows = must(a, "addons");
  const availRows = must(av, "availability");
  const offRows = must(to, "time_off");

  const services: Service[] = orderBySeed(
    serviceRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      durationMin: r.duration_min,
      priceGBP: r.price_pence / 100,
      kind: r.kind,
    })),
    seedCatalog.services,
  );
  const addons: Addon[] = orderBySeed(
    addonRows.map((r) => ({
      id: r.id,
      name: r.name,
      priceGBP: r.price_pence / 100,
      extraMin: r.extra_min,
    })),
    seedCatalog.addons,
  );
  const barbers: CatalogBarber[] = orderBySeed(
    barberRows.map((r) => {
      const hours: Hours = {};
      for (const row of availRows.filter((x) => x.barber_id === r.id)) {
        (hours[row.weekday] ??= []).push({ open: row.open_min, close: row.close_min });
      }
      for (const k of Object.keys(hours)) hours[Number(k)].sort((x, y) => x.open - y.open);
      return { id: r.id, name: r.name, role: r.role ?? "", hours };
    }),
    seedCatalog.barbers,
  );
  const timeOff: TimeOff[] = offRows.map((r) => ({
    barberId: r.barber_id,
    startDate: String(r.start_date),
    endDate: String(r.end_date),
  }));
  return { services, addons, barbers, timeOff };
}

export function toClientCatalog(c: ServerCatalog): ClientCatalog {
  return { services: c.services, addons: c.addons, barbers: c.barbers };
}

export async function getClientCatalog(): Promise<ClientCatalog> {
  return toClientCatalog(await loadCatalog());
}
