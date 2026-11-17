import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminSession = { userId: string; email: string; db: SupabaseClient };

type Result =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "no-session" | "not-admin" };

async function check(): Promise<Result> {
  const db = await createSupabaseServerClient();
  // getUser() verifies the JWT with the Auth server (never trust getSession alone).
  const { data, error } = await db.auth.getUser();
  const user = data?.user;
  if (error || !user) return { ok: false, reason: "no-session" };

  const { data: row, error: adminErr } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminErr || !row) {
    try {
      await db.auth.signOut();
    } catch {
      // best effort; cookie clearing may be impossible during render
    }
    return { ok: false, reason: "not-admin" };
  }
  return { ok: true, session: { userId: user.id, email: user.email ?? "", db } };
}

// Deduplicated per request for Server Components (layout + page).
const checkCached = cache(check);

/** Pages/layouts: redirects to /admin/login when not an admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const r = await checkCached();
  if (!r.ok) {
    redirect(r.reason === "not-admin" ? "/admin/login?error=not-admin" : "/admin/login");
  }
  return r.session;
}

/** Server actions: throws Error("Unauthorized"), never redirects. Not cached. */
export async function requireAdminAction(): Promise<AdminSession> {
  const r = await check();
  if (!r.ok) throw new Error("Unauthorized");
  return r.session;
}
