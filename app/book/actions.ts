"use server";

import { createBooking, getSlots, type BookingViewer } from "@/lib/booking-server";
import {
  shopNow,
  type CreateBookingInput,
  type CreateBookingResult,
  type GetSlotsInput,
  type SlotsResult,
} from "@/lib/booking-shared";
import { getViewer } from "@/lib/customer/viewer";

// Server actions run per request (never prerendered), so reading the clock via
// shopNow() here is safe with Cache Components on. Inputs are untrusted:
// lib/booking-server.ts validates everything and recomputes price/duration.

async function currentViewer(): Promise<BookingViewer | null> {
  const v = await getViewer();
  return v ? { userId: v.userId, email: v.email, membership: v.membership } : null;
}

export async function getSlotsAction(input: GetSlotsInput): Promise<SlotsResult> {
  try {
    return await getSlots(input, shopNow(), await currentViewer());
  } catch (err) {
    console.error("getSlotsAction failed", err);
    return { ok: false, error: "Couldn't load times. Try again." };
  }
}

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  try {
    const viewer = await currentViewer();
    if (!viewer) return { ok: false, code: "auth", error: "Sign in to book." };
    return await createBooking(input, shopNow(), viewer);
  } catch (err) {
    console.error("createBookingAction failed", err);
    return { ok: false, code: "error", error: "Something went wrong. Try again." };
  }
}
