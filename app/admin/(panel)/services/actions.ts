"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminAction } from "@/lib/admin/auth";
import {
  cleanText,
  hasSlug,
  LIMITS,
  parseIntStrict,
  parsePounds,
  slugify,
  uniqueSlug,
  type ActionResult,
} from "@/lib/admin/catalog-admin";
import { revalidateCatalog } from "@/components/admin/settings/revalidate";

const GENERIC = "Could not save. Please try again.";
const bad = (fieldErrors: Record<string, string>): ActionResult => ({
  ok: false,
  error: "Please fix the highlighted fields.",
  fieldErrors,
});

function readId(fd: FormData): string | null | "invalid" {
  const v = fd.get("id");
  if (v === null || v === "") return null; // create
  if (typeof v !== "string" || v.length > 64) return "invalid";
  return v;
}

/** Insert with a server-generated unique slug id; retry on PK collision. */
async function insertWithSlug(
  db: SupabaseClient,
  table: "services" | "addons",
  name: string,
  row: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { data, error } = await db.from(table).select("id");
  if (error) return { error: GENERIC };
  const taken = new Set((data ?? []).map((r) => r.id as string));
  const base = slugify(name);
  let id = uniqueSlug(base, taken);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error: insErr } = await db.from(table).insert({ ...row, id });
    if (!insErr) return { error: null };
    if (insErr.code !== "23505") {
      console.error(`${table} insert failed`, insErr.code, insErr.message);
      return { error: GENERIC };
    }
    taken.add(id);
    id = uniqueSlug(`${base}-${Math.random().toString(36).slice(2, 6)}`, taken);
  }
  return { error: GENERIC };
}

export async function saveService(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  const id = readId(fd);
  if (id === "invalid") return { ok: false, error: "Invalid request." };

  const errs: Record<string, string> = {};
  const name = cleanText(fd.get("name"), LIMITS.serviceName);
  if (!name) errs.name = `Name is required (max ${LIMITS.serviceName} characters).`;
  else if (id === null && !hasSlug(name)) errs.name = "Use letters or numbers in the name.";
  const description = cleanText(fd.get("description") ?? "", LIMITS.description, {
    allowEmpty: true,
  });
  if (description === null) errs.description = `Max ${LIMITS.description} characters.`;
  const duration = parseIntStrict(fd.get("durationMin"), 1, LIMITS.maxDurationMin);
  if (duration === null) errs.durationMin = `Whole minutes, 1 to ${LIMITS.maxDurationMin}.`;
  const price = parsePounds(typeof fd.get("price") === "string" ? (fd.get("price") as string) : "");
  if (price === null) errs.price = "Enter a price like 25 or 25.50.";
  const kind = fd.get("kind");
  if (kind !== "membership" && kind !== "one-off") errs.kind = "Choose a type.";
  if (Object.keys(errs).length > 0) return bad(errs);

  const fields = {
    name,
    description: description ?? "",
    duration_min: duration,
    price_pence: price,
    kind,
    active: fd.get("active") === "on",
  };

  if (id === null) {
    const { error } = await insertWithSlug(db, "services", name as string, fields);
    if (error) return { ok: false, error };
    revalidateCatalog("/admin/services");
    return { ok: true, message: "Service added." };
  }

  const { data, error } = await db.from("services").update(fields).eq("id", id).select("id");
  if (error) {
    console.error("services update failed", error.code, error.message);
    return { ok: false, error: GENERIC };
  }
  if (!data || data.length === 0) return { ok: false, error: "Service not found." };
  revalidateCatalog("/admin/services");
  return { ok: true, message: "Service saved." };
}

export async function saveAddon(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  const id = readId(fd);
  if (id === "invalid") return { ok: false, error: "Invalid request." };

  const errs: Record<string, string> = {};
  const name = cleanText(fd.get("name"), LIMITS.addonName);
  if (!name) errs.name = `Name is required (max ${LIMITS.addonName} characters).`;
  else if (id === null && !hasSlug(name)) errs.name = "Use letters or numbers in the name.";
  const price = parsePounds(typeof fd.get("price") === "string" ? (fd.get("price") as string) : "");
  if (price === null) errs.price = "Enter a price like 5 or 5.50.";
  const extra = parseIntStrict(fd.get("extraMin"), 0, LIMITS.maxExtraMin);
  if (extra === null) errs.extraMin = `Whole minutes, 0 to ${LIMITS.maxExtraMin}.`;
  if (Object.keys(errs).length > 0) return bad(errs);

  const fields = {
    name,
    price_pence: price,
    extra_min: extra,
    active: fd.get("active") === "on",
  };

  if (id === null) {
    const { error } = await insertWithSlug(db, "addons", name as string, fields);
    if (error) return { ok: false, error };
    revalidateCatalog("/admin/services");
    return { ok: true, message: "Add-on added." };
  }

  const { data, error } = await db.from("addons").update(fields).eq("id", id).select("id");
  if (error) {
    console.error("addons update failed", error.code, error.message);
    return { ok: false, error: GENERIC };
  }
  if (!data || data.length === 0) return { ok: false, error: "Add-on not found." };
  revalidateCatalog("/admin/services");
  return { ok: true, message: "Add-on saved." };
}
