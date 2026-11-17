"use server";

import { requireAdminAction } from "@/lib/admin/auth";
import {
  cleanText,
  hasSlug,
  LIMITS,
  slugify,
  uniqueSlug,
  type ActionResult,
} from "@/lib/admin/catalog-admin";
import { listFutureActiveBookings, plural } from "@/components/admin/settings/future-bookings";
import { revalidateCatalog } from "@/components/admin/settings/revalidate";

const GENERIC = "Could not save. Please try again.";

export async function saveBarber(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();

  const rawId = fd.get("id");
  const id = rawId === null || rawId === "" ? null : rawId;
  if (id !== null && (typeof id !== "string" || id.length > 64)) {
    return { ok: false, error: "Invalid request." };
  }

  const errs: Record<string, string> = {};
  const name = cleanText(fd.get("name"), LIMITS.barberName);
  if (!name) errs.name = `Name is required (max ${LIMITS.barberName} characters).`;
  else if (id === null && !hasSlug(name)) errs.name = "Use letters or numbers in the name.";
  const role = cleanText(fd.get("role") ?? "", LIMITS.barberRole, { allowEmpty: true });
  if (role === null) errs.role = `Max ${LIMITS.barberRole} characters.`;
  if (Object.keys(errs).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  }
  const active = fd.get("active") === "on";

  if (id === null) {
    const { data, error } = await db.from("barbers").select("id");
    if (error) return { ok: false, error: GENERIC };
    const taken = new Set((data ?? []).map((r) => r.id as string));
    const base = slugify(name as string);
    let newId = uniqueSlug(base, taken);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: insErr } = await db
        .from("barbers")
        .insert({ id: newId, name, role: role ?? "", active });
      if (!insErr) {
        revalidateCatalog("/admin/barbers", "/admin/hours");
        return {
          ok: true,
          message: "Barber added.",
          warning: "They have no opening hours yet. Set them in Hours before they can be booked.",
        };
      }
      if (insErr.code !== "23505") {
        console.error("barbers insert failed", insErr.code, insErr.message);
        return { ok: false, error: GENERIC };
      }
      taken.add(newId);
      newId = uniqueSlug(`${base}-${Math.random().toString(36).slice(2, 6)}`, taken);
    }
    return { ok: false, error: GENERIC };
  }

  const { data: existing, error: exErr } = await db
    .from("barbers")
    .select("id")
    .eq("id", id as string)
    .maybeSingle();
  if (exErr) return { ok: false, error: GENERIC };
  if (!existing) return { ok: false, error: "Barber not found." };

  const { error } = await db
    .from("barbers")
    .update({ name, role: role ?? "", active })
    .eq("id", id as string);
  if (error) {
    console.error("barbers update failed", error.code, error.message);
    return { ok: false, error: GENERIC };
  }
  revalidateCatalog("/admin/barbers", "/admin/hours", "/admin/time-off");

  let warning: string | undefined;
  if (!active) {
    try {
      const n = (await listFutureActiveBookings(db, id as string)).length;
      if (n > 0) {
        warning = `${plural(n, "upcoming booking remains", "upcoming bookings remain")} for this barber and need handling.`;
      }
    } catch {
      // best-effort
    }
  }
  return { ok: true, message: "Barber saved.", warning };
}
