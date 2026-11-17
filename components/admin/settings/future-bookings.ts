import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shopNow } from "@/lib/booking-shared";

export type FutureBooking = {
  barber_id: string;
  booking_date: string;
  start_min: number;
  end_min: number;
};

/** Active (pending/confirmed) bookings that have not ended yet, shop-local.
 *  Request-time only (calls shopNow). Optionally limited to one barber. */
export async function listFutureActiveBookings(
  db: SupabaseClient,
  barberId?: string,
): Promise<FutureBooking[]> {
  const now = shopNow();
  let q = db
    .from("bookings")
    .select("barber_id,booking_date,start_min,end_min")
    .gte("booking_date", now.date)
    .in("status", ["pending", "confirmed"])
    .limit(5000);
  if (barberId) q = q.eq("barber_id", barberId);
  const { data, error } = await q;
  if (error) {
    console.error("future bookings failed", error.code, error.message);
    throw new Error("Could not load bookings.");
  }
  return ((data ?? []) as FutureBooking[]).filter(
    (b) => b.booking_date > now.date || b.end_min > now.min,
  );
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
