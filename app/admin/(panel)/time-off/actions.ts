"use server";

import { requireAdminAction } from "@/lib/admin/auth";
import { cleanText, isDateString, LIMITS, type ActionResult } from "@/lib/admin/catalog-admin";
import { plural } from "@/components/admin/settings/future-bookings";
import { revalidateCatalog } from "@/components/admin/settings/revalidate";

export async function addTimeOff(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();

  const barberId = formData.get("barberId");
  const start = formData.get("startDate");
  const end = formData.get("endDate");
  const reason = cleanText(formData.get("reason") ?? "", LIMITS.reason, { allowEmpty: true });

  const fieldErrors: Record<string, string> = {};
  if (typeof barberId !== "string" || !barberId || barberId.length > 64) {
    fieldErrors.barberId = "Choose a barber.";
  }
  if (!isDateString(start)) fieldErrors.startDate = "Enter a valid start date.";
  if (!isDateString(end)) fieldErrors.endDate = "Enter a valid end date.";
  if (isDateString(start) && isDateString(end) && end < start) {
    fieldErrors.endDate = "End date must be on or after the start date.";
  }
  if (reason === null) fieldErrors.reason = `Reason must be ${LIMITS.reason} characters or fewer.`;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { data: barber, error: bErr } = await db
    .from("barbers")
    .select("id")
    .eq("id", barberId as string)
    .maybeSingle();
  if (bErr) return { ok: false, error: "Could not save time off. Please try again." };
  if (!barber) return { ok: false, error: "Barber not found." };

  const { error } = await db.from("time_off").insert({
    barber_id: barberId,
    start_date: start,
    end_date: end,
    reason: reason || null,
  });
  if (error) {
    console.error("time_off insert failed", error.code, error.message);
    return { ok: false, error: "Could not save time off. Please try again." };
  }

  revalidateCatalog("/admin/time-off");

  let warning: string | undefined;
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", barberId as string)
    .in("status", ["pending", "confirmed"])
    .gte("booking_date", start as string)
    .lte("booking_date", end as string);
  if (count && count > 0) {
    warning = `${plural(count, "booking overlaps", "bookings overlap")} this time off. Handle them in the bookings calendar.`;
  }
  return { ok: true, message: "Time off added.", warning };
}

export async function deleteTimeOff(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { db } = await requireAdminAction();
  const raw = formData.get("id");
  if (typeof raw !== "string" || !/^\d{1,15}$/.test(raw)) {
    return { ok: false, error: "Invalid request." };
  }
  const id = Number(raw);
  const { data, error } = await db.from("time_off").delete().eq("id", id).select("id");
  if (error) {
    console.error("time_off delete failed", error.code, error.message);
    return { ok: false, error: "Could not remove time off. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Time off not found." };
  revalidateCatalog("/admin/time-off");
  return { ok: true, message: "Time off removed." };
}
