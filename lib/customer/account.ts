import "server-only";
// Self-service account deletion. Uses the service-role client, so it is scoped
// strictly to the given user id (taken from the verified session, never input).
import { shopNow } from "../booking-shared";
import { anonymiseBookingsForUser, cancelUpcomingBookingsForUser } from "../store";
import { hasSupabaseEnv } from "../supabase/env";
import { deleteMembershipsForUserInMemory } from "./memberships";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

const FAILED = { ok: false, error: "We couldn't delete your account. Try again." } as const;

/**
 * Order matters: refuse admins, cancel upcoming bookings, anonymise ALL bookings
 * (kept for the shop's records, but no longer personal data), and only then
 * delete the auth user (memberships cascade; bookings.user_id goes null via FK).
 * If any step fails we stop, so a failed delete never leaves a half-erased user
 * who can no longer retry: the user still exists and can run it again.
 */
export async function deleteMyAccount(
  viewer: { userId: string },
  now: { date: string; min: number } = shopNow(),
): Promise<DeleteAccountResult> {
  try {
    if (hasSupabaseEnv()) {
      const { getSupabaseAdmin } = await import("../supabase/admin");
      const db = getSupabaseAdmin();
      const { data, error } = await db
        .from("admins")
        .select("user_id")
        .eq("user_id", viewer.userId)
        .maybeSingle();
      if (error) {
        console.error("admin check failed", error.code, error.message);
        return FAILED;
      }
      if (data) return { ok: false, error: "Admin accounts can't be deleted here." };
    }

    await cancelUpcomingBookingsForUser(viewer.userId, now);
    await anonymiseBookingsForUser(viewer.userId);

    if (hasSupabaseEnv()) {
      const { getSupabaseAdmin } = await import("../supabase/admin");
      const { error } = await getSupabaseAdmin().auth.admin.deleteUser(viewer.userId);
      if (error) {
        console.error("auth user delete failed", error.status, error.message);
        return FAILED;
      }
    } else {
      await deleteMembershipsForUserInMemory(viewer.userId);
    }
    return { ok: true };
  } catch (err) {
    console.error("deleteMyAccount failed", err);
    return FAILED;
  }
}
