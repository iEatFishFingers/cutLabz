"use server";

import { createBooking, getSlots } from "@/lib/booking-server";
import {
  shopNow,
  type CreateBookingInput,
  type CreateBookingResult,
  type GetSlotsInput,
  type SlotsResult,
} from "@/lib/booking-shared";

// Server actions run per request (never prerendered), so reading the clock via
// shopNow() here is safe with Cache Components on. Inputs are untrusted:
// lib/booking-server.ts validates everything and recomputes price/duration.

export async function getSlotsAction(input: GetSlotsInput): Promise<SlotsResult> {
  try {
    return await getSlots(input, shopNow());
  } catch (err) {
    console.error("getSlotsAction failed", err);
    return { ok: false, error: "Couldn't load times. Try again." };
  }
}

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  try {
    return await createBooking(input, shopNow());
  } catch (err) {
    console.error("createBookingAction failed", err);
    return { ok: false, code: "invalid", error: "Something went wrong. Try again." };
  }
}
