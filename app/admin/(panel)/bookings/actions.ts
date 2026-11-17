"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { changeBookingStatus, createAdminBooking } from "@/lib/admin/bookings";
import type { AdminActionResult, NewBookingState } from "@/lib/admin/bookings-shared";
import { loadCatalog } from "@/lib/catalog-db";

export async function setBookingStatusAction(
  id: string,
  status: string,
): Promise<AdminActionResult> {
  const session = await requireAdminAction();
  const res = await changeBookingStatus(session, id, status);
  if (res.ok) revalidatePath("/admin");
  return res;
}

export async function createBookingAction(
  _prev: NewBookingState,
  formData: FormData,
): Promise<NewBookingState> {
  const session = await requireAdminAction();
  const get = (k: string) => formData.get(k);
  const startRaw = get("startMin");
  const res = await createAdminBooking(
    session,
    {
      barberId: get("barberId"),
      serviceId: get("serviceId"),
      addonIds: formData.getAll("addonIds"),
      date: get("date"),
      startMin: typeof startRaw === "string" && /^\d{1,4}$/.test(startRaw) ? Number(startRaw) : null,
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      notes: get("notes"),
      overrideHours: get("overrideHours") === "on",
    },
    await loadCatalog(),
  );
  if (res.ok) revalidatePath("/admin");
  return res;
}
