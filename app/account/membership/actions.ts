"use server";

import { revalidatePath } from "next/cache";
import { shopNow } from "@/lib/booking-shared";
import { cancelMembership, resumeMembership, subscribeToPlan } from "@/lib/customer/memberships";
import { requireCustomerAction } from "@/lib/customer/viewer";
import { MEMBERSHIP_PLANS } from "@/lib/membership";

export type JoinResult =
  | { ok: true }
  | { ok: false; code: "auth" | "invalid" | "already_member" | "error"; error: string };

// Placeholder (unpaid) membership: no payment is taken. The plan id is untrusted
// and checked against the known plans before anything reaches the data layer.
export async function joinPlanAction(planId: string): Promise<JoinResult> {
  if (typeof planId !== "string" || !MEMBERSHIP_PLANS.some((p) => p.id === planId)) {
    return { ok: false, code: "invalid", error: "Choose a valid plan." };
  }
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return { ok: false, code: "auth", error: "Please sign in again." };
    const res = await subscribeToPlan(viewer, planId, shopNow().date);
    revalidatePath("/account");
    revalidatePath("/account/membership");
    revalidatePath("/book");
    return res.ok ? { ok: true } : res;
  } catch (err) {
    console.error("joinPlanAction failed", err);
    return { ok: false, code: "error", error: "Something went wrong. Try again." };
  }
}

/** Undoes a cancellation of the current membership (clears cancelled_at). */
export async function resumeMembershipAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return { ok: false, error: "Please sign in again." };
    const res = await resumeMembership(viewer, shopNow().date);
    revalidatePath("/account", "layout");
    revalidatePath("/account/membership");
    revalidatePath("/book");
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  } catch (err) {
    console.error("resumeMembershipAction failed", err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/** Ends the membership at the end of the current period (access continues until then). */
export async function cancelMembershipAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const viewer = await requireCustomerAction().catch(() => null);
    if (!viewer) return { ok: false, error: "Please sign in again." };
    const res = await cancelMembership(viewer, shopNow().date);
    revalidatePath("/account", "layout");
    revalidatePath("/account/membership");
    revalidatePath("/book");
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  } catch (err) {
    console.error("cancelMembershipAction failed", err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
