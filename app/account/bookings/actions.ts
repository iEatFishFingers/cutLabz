"use server";

import { revalidatePath } from "next/cache";
import { cancelMyBooking, getRescheduleSlots, rescheduleMyBooking } from "@/lib/customer/bookings";
import { requireCustomerAction } from "@/lib/customer/viewer";
import { isValidDateString, shopNow, type SlotsResult } from "@/lib/booking-shared";

// Every input is untrusted: ids/dates/times are shape-checked here, and
// lib/customer/bookings.ts re-validates and enforces ownership and the 24h rule.

export type CancelResult =
  | { ok: true }
  | { ok: false; code: "auth" | "not_found" | "too_late" | "not_active" | "error"; error: string };

export type RescheduleResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "auth"
        | "not_found"
        | "too_late"
        | "not_active"
        | "unavailable"
        | "slot_taken"
        | "membership"
        | "limit"
        | "invalid"
        | "stale"
        | "error";
      error: string;
    };

const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 64 && /^[A-Za-z0-9-]+$/.test(v);

const AUTH = { ok: false, code: "auth", error: "Please sign in again." } as const;
const INVALID = { ok: false, code: "invalid", error: "That request isn't valid." } as const;

export async function cancelBookingAction(bookingId: string): Promise<CancelResult> {
  if (!isId(bookingId)) return { ok: false, code: "not_found", error: "Booking not found." };
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return AUTH;
    const res = await cancelMyBooking(viewer, bookingId, shopNow());
    revalidatePath("/account");
    return res;
  } catch (err) {
    console.error("cancelBookingAction failed", err);
    return { ok: false, code: "error", error: "Something went wrong. Try again." };
  }
}

export async function getRescheduleSlotsAction(input: {
  bookingId: string;
  date: string;
  barberId: string;
}): Promise<SlotsResult> {
  if (
    !input ||
    !isId(input.bookingId) ||
    typeof input.date !== "string" ||
    !isValidDateString(input.date) ||
    !isId(input.barberId)
  ) {
    return { ok: false, error: "Couldn't load times. Try again." };
  }
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return { ok: false, error: "Please sign in again." };
    return await getRescheduleSlots(
      viewer,
      { bookingId: input.bookingId, date: input.date, barberId: input.barberId },
      shopNow(),
    );
  } catch (err) {
    console.error("getRescheduleSlotsAction failed", err);
    return { ok: false, error: "Couldn't load times. Try again." };
  }
}

export async function rescheduleBookingAction(input: {
  bookingId: string;
  date: string;
  startMin: number;
  barberId: string;
  /** The slot the page believes the booking currently has. */
  expected: { date: string; startMin: number; barberId: string };
}): Promise<RescheduleResult> {
  const ex = input?.expected;
  if (
    !ex ||
    typeof ex.date !== "string" ||
    !isValidDateString(ex.date) ||
    !Number.isInteger(ex.startMin) ||
    ex.startMin < 0 ||
    ex.startMin >= 1440 ||
    !isId(ex.barberId)
  ) {
    return INVALID;
  }
  if (
    !input ||
    !isId(input.bookingId) ||
    typeof input.date !== "string" ||
    !isValidDateString(input.date) ||
    !Number.isInteger(input.startMin) ||
    input.startMin < 0 ||
    input.startMin >= 1440 ||
    !isId(input.barberId)
  ) {
    return INVALID;
  }
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return AUTH;
    const res = await rescheduleMyBooking(
      viewer,
      {
        bookingId: input.bookingId,
        date: input.date,
        startMin: input.startMin,
        barberId: input.barberId,
        expected: { date: ex.date, startMin: ex.startMin, barberId: ex.barberId },
      },
      shopNow(),
    );
    revalidatePath("/account");
    return res.ok ? { ok: true } : res;
  } catch (err) {
    console.error("rescheduleBookingAction failed", err);
    return { ok: false, code: "error", error: "Something went wrong. Try again." };
  }
}
