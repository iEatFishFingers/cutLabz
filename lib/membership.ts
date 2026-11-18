// Membership + customer self-service rules. Pure: no I/O, no clock reads.
// Dates are shop-local "YYYY-MM-DD"; times are minutes from midnight.
import { addDays } from "./booking-shared";

export type Membership = {
  id: string;
  /** services.id of the membership cut this plan covers ("core" | "plus" | "premium"). */
  plan: string;
  startsOn: string; // inclusive
  endsOn: string; // inclusive: the last day a booking may fall on
  /** ISO timestamp when the member cancelled; access continues until endsOn. Null when not cancelled. */
  cancelledAt: string | null;
};

/** A placeholder (unpaid) membership lasts this many days, start day included. */
export const MEMBERSHIP_DAYS = 30;
/** Members: free cuts they may hold as upcoming bookings at once. */
export const MAX_UPCOMING_MEMBER_CUTS = 1;
/** Anyone: active upcoming bookings (member or paid) held at once. */
export const MAX_UPCOMING_BOOKINGS = 3;
/** Customers may cancel/reschedule themselves until this long before the start. */
export const SELF_SERVE_NOTICE_MIN = 24 * 60;

export function membershipPeriod(today: string): { startsOn: string; endsOn: string } {
  return { startsOn: today, endsOn: addDays(today, MEMBERSHIP_DAYS - 1) };
}

export const isActiveOn = (m: Membership, date: string): boolean =>
  m.startsOn <= date && date <= m.endsOn;

/** Free member cut allowed on `date`? Needs a plan that is active today AND ends on/after `date`. */
export function memberCanBookOn(m: Membership | null, today: string, date: string): boolean {
  return !!m && isActiveOn(m, today) && date >= today && date <= m.endsOn;
}

const dayNum = (d: string) => {
  const [y, mo, dd] = d.split("-").map(Number);
  return Date.UTC(y, mo - 1, dd) / 86_400_000;
};

/** Minutes from `now` to the start of a booking (negative once started). */
export function minutesUntil(
  date: string,
  startMin: number,
  now: { date: string; min: number },
): number {
  return (dayNum(date) - dayNum(now.date)) * 1440 + startMin - now.min;
}

/** True while a customer may still cancel/reschedule on their own. */
export const canSelfServe = (
  date: string,
  startMin: number,
  now: { date: string; min: number },
): boolean => minutesUntil(date, startMin, now) >= SELF_SERVE_NOTICE_MIN;

/** True once the booking's start time has passed. */
export const hasStarted = (
  date: string,
  startMin: number,
  now: { date: string; min: number },
): boolean => minutesUntil(date, startMin, now) <= 0;

/** Display info for the three plans (prices are display-only until Stripe exists). */
export const MEMBERSHIP_PLANS = [
  { id: "core", name: "Core", priceGBP: 29.99, perks: ["Unlimited haircuts"] },
  { id: "plus", name: "Plus", priceGBP: 39.99, perks: ["Unlimited haircuts", "Beard trims included"] },
  {
    id: "premium",
    name: "Premium",
    priceGBP: 69.99,
    perks: ["Unlimited haircuts", "Beard trims included", "Free add-ons"],
  },
] as const;
