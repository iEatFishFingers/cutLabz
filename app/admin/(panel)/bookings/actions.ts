"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import {
  changeBookingStatus,
  createAdminBooking,
  searchAdminBookings,
} from "@/lib/admin/bookings";
import type {
  AdminActionResult,
  AdminBooking,
  NewBookingState,
} from "@/lib/admin/bookings-shared";
import { loadAdminCatalog } from "@/lib/catalog-db";

/** `expected` is the status the UI believes the booking has; a mismatch is refused as stale. */
export async function setBookingStatusAction(
  id: string,
  status: string,
  expected: string,
): Promise<AdminActionResult> {
  const session = await requireAdminAction();
  const res = await changeBookingStatus(session, id, status, expected);
  if (res.ok) revalidatePath("/admin");
  return res;
}

export async function searchBookingsAction(
  query: string,
): Promise<{ ok: true; bookings: AdminBooking[] } | { ok: false; error: string }> {
  const session = await requireAdminAction();
  try {
    return { ok: true, bookings: await searchAdminBookings(session, query) };
  } catch {
    return { ok: false, error: "Could not search bookings." };
  }
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
      requestKey: get("requestKey"),
    },
    await loadAdminCatalog(),
  );
  if (res.ok) revalidatePath("/admin");
  return res;
}
