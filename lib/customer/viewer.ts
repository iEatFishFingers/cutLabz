import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { shopNow } from "@/lib/booking-shared";
import { isActiveOn, type Membership } from "@/lib/membership";

/** The signed-in customer. `membership` is set only while the plan is active today. */
export type Viewer = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  membership: Membership | null;
  /** User-session client (RLS applies: the user sees only their own rows). */
  db: SupabaseClient;
};

type MembershipRow = {
  id: string;
  plan: string;
  starts_on: string;
  ends_on: string;
  cancelled_at?: string | null;
};

export const toMembership = (r: MembershipRow): Membership => ({
  id: r.id,
  plan: r.plan,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  cancelledAt: r.cancelled_at ?? null,
});

async function load(): Promise<Viewer | null> {
  if (!hasSupabaseEnv()) return null;
  const db = await createSupabaseServerClient();
  // getUser() verifies the JWT with the Auth server (never trust getSession alone).
  const { data, error } = await db.auth.getUser();
  const user = data?.user;
  if (error || !user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const today = shopNow().date;
  const { data: rows } = await db
    .from("memberships")
    .select("id,plan,starts_on,ends_on,cancelled_at")
    .eq("user_id", user.id)
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("ends_on", { ascending: false })
    .limit(1);
  const m = rows?.[0] ? toMembership(rows[0] as MembershipRow) : null;

  return {
    userId: user.id,
    email: user.email ?? "",
    name: typeof meta.full_name === "string" ? meta.full_name : "",
    phone: typeof meta.phone === "string" ? meta.phone : "",
    membership: m && isActiveOn(m, today) ? m : null,
    db,
  };
}

const loadCached = cache(load);

/** Server Components: the viewer, or null when signed out. Dynamic (reads cookies). */
export const getViewer = (): Promise<Viewer | null> => loadCached();

/** Pages: redirects to /login?next=<next> when signed out. */
export async function requireCustomer(next: string): Promise<Viewer> {
  const v = await loadCached();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  return v;
}

/** Server actions: throws Error("Unauthorized"), never redirects. Not cached. */
export async function requireCustomerAction(): Promise<Viewer> {
  const v = await load();
  if (!v) throw new Error("Unauthorized");
  return v;
}

/** Only same-site relative paths survive; anything else falls back to /account. */
export function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/account";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/account";
  return next;
}
