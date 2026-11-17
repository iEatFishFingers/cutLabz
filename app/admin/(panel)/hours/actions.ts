"use server";

import { requireAdminAction } from "@/lib/admin/auth";
import {
  isWithinWindows,
  parseSchedule,
  scheduleToRows,
  weekdayOf,
  type ActionResult,
} from "@/lib/admin/catalog-admin";
import { listFutureActiveBookings, plural } from "@/components/admin/settings/future-bookings";
import { revalidateCatalog } from "@/components/admin/settings/revalidate";

const GENERIC = "Could not save hours. Please try again.";

export async function saveHours(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();

  const barberId = formData.get("barberId");
  const raw = formData.get("schedule");
  if (typeof barberId !== "string" || barberId.length > 64 || typeof raw !== "string") {
    return { ok: false, error: "Invalid request." };
  }
  if (raw.length > 20_000) return { ok: false, error: "Invalid schedule." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid schedule." };
  }
  const parsed = parseSchedule(json);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const schedule = parsed.schedule;

  const { data: barber, error: bErr } = await db
    .from("barbers")
    .select("id")
    .eq("id", barberId)
    .maybeSingle();
  if (bErr) return { ok: false, error: GENERIC };
  if (!barber) return { ok: false, error: "Barber not found." };

  const rows = scheduleToRows(barberId, schedule).map((r) => ({
    weekday: r.weekday,
    open_min: r.open_min,
    close_min: r.close_min,
  }));

  // Atomic replace (delete + insert in one transaction, RLS applies).
  const { error: rpcErr } = await db.rpc("replace_availability", {
    p_barber: barberId,
    p_rows: rows,
  });
  if (rpcErr) {
    console.error("replace_availability failed", rpcErr.code, rpcErr.message);
    return { ok: false, error: "Could not save hours; your previous hours were kept." };
  }

  revalidateCatalog("/admin/hours");

  // Warn (don't block) about future bookings that fall outside the new hours.
  let warning: string | undefined;
  try {
    const future = await listFutureActiveBookings(db, barberId);
    const outside = future.filter(
      (b) => !isWithinWindows(b.start_min, b.end_min, schedule[weekdayOf(b.booking_date)] ?? []),
    ).length;
    if (outside > 0) {
      warning = `${plural(outside, "upcoming booking falls", "upcoming bookings fall")} outside the new hours and need handling.`;
    }
  } catch {
    // Warning is best-effort.
  }

  return { ok: true, message: "Hours saved.", warning };
}
