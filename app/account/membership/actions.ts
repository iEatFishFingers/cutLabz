"use server";

import { revalidatePath } from "next/cache";
import { shopNow } from "@/lib/booking-shared";
import { subscribeToPlan } from "@/lib/customer/memberships";
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
