import "server-only";
// Placeholder (unpaid) self-serve memberships: a dated 30-day period per user.
// Writes use the service-role client but are always scoped to the given user.
import { loadCatalog } from "../catalog-db";
import { isActiveOn, membershipPeriod, type Membership } from "../membership";
import { hasSupabaseEnv } from "../supabase/env";

type MembershipRow = {
  id: string;
  plan: string;
  starts_on: string;
  ends_on: string;
  cancelled_at: string | null;
};
const COLUMNS = "id,plan,starts_on,ends_on,cancelled_at";
const toMembership = (r: MembershipRow): Membership => ({
  id: r.id,
  plan: r.plan,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  cancelledAt: r.cancelled_at ?? null,
});

const toPublic = (m: Membership): Membership => ({
  id: m.id,
  plan: m.plan,
  startsOn: m.startsOn,
  endsOn: m.endsOn,
  cancelledAt: m.cancelledAt,
});

// Dev/test fallback, only outside production and without Supabase env.
type MemRow = Membership & { userId: string };
const g = globalThis as unknown as { __cutlabzMemberships?: MemRow[] };
const mem = (g.__cutlabzMemberships ??= []);

async function backend() {
  if (hasSupabaseEnv()) return "supabase" as const;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase env is missing in production; refusing to use the in-memory store.");
  }
  return "memory" as const;
}

async function listForUser(userId: string): Promise<Membership[]> {
  if ((await backend()) === "memory") {
    return mem
      .filter((m) => m.userId === userId)
      .map((m) => ({
        id: m.id,
        plan: m.plan,
        startsOn: m.startsOn,
        endsOn: m.endsOn,
        cancelledAt: m.cancelledAt,
      }));
  }
  const { getSupabaseAdmin } = await import("../supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("ends_on", { ascending: false })
    .limit(50);
  if (error) {
    console.error("memberships list failed", error.code, error.message);
    throw new Error("Could not load memberships.");
  }
  return (data as MembershipRow[]).map(toMembership);
}

export async function getMembershipOverview(
  viewer: { userId: string },
  today: string,
): Promise<{ current: Membership | null; upcomingStart?: never; past: Membership[] }> {
  const rows = (await listForUser(viewer.userId)).sort((a, b) => b.endsOn.localeCompare(a.endsOn));
  const current = rows.find((m) => isActiveOn(m, today)) ?? null;
  return { current, past: rows.filter((m) => m !== current) };
}

export type SubscribeResult =
  | { ok: true; membership: Membership }
  | { ok: false; code: "invalid" | "already_member" | "error"; error: string };

const ALREADY = {
  ok: false,
  code: "already_member",
  error: "You already have an active membership.",
} as const;

export async function subscribeToPlan(
  viewer: { userId: string },
  planId: unknown,
  today: string,
): Promise<SubscribeResult> {
  if (typeof planId !== "string" || planId.length > 64)
    return { ok: false, code: "invalid", error: "Choose a valid plan." };
  const catalog = await loadCatalog();
  if (!catalog.services.some((s) => s.id === planId && s.kind === "membership"))
    return { ok: false, code: "invalid", error: "Choose a valid plan." };

  const period = membershipPeriod(today);

  if ((await backend()) === "memory") {
    const clash = mem.some(
      (m) => m.userId === viewer.userId && m.startsOn <= period.endsOn && period.startsOn <= m.endsOn,
    );
    if (clash) return ALREADY;
    const row: MemRow = {
      id: crypto.randomUUID(),
      userId: viewer.userId,
      plan: planId,
      cancelledAt: null,
      ...period,
    };
    mem.push(row);
    return { ok: true, membership: toPublic(row) };
  }

  const { getSupabaseAdmin } = await import("../supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .insert({
      user_id: viewer.userId,
      plan: planId,
      starts_on: period.startsOn,
      ends_on: period.endsOn,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // The exclusion constraint forbids overlapping periods for one user.
    if (error.code === "23P01" || error.code === "23505") return ALREADY;
    console.error("membership insert failed", error.code, error.message);
    return { ok: false, code: "error", error: "Couldn't start your membership. Try again." };
  }
  return { ok: true, membership: toMembership(data as MembershipRow) };
}

export type CancelMembershipResult =
  | { ok: true; membership: Membership }
  | { ok: false; code: "no_membership" | "error"; error: string };

/**
 * Cancels at the end of the period: stamps cancelled_at on the viewer's active
 * membership. Access and free-cut rights continue until ends_on. Idempotent:
 * cancelling again keeps the first timestamp and returns ok.
 */
export async function cancelMembership(
  viewer: { userId: string },
  today: string,
): Promise<CancelMembershipResult> {
  const none = {
    ok: false,
    code: "no_membership",
    error: "You don't have an active membership to cancel.",
  } as const;

  if ((await backend()) === "memory") {
    const m = mem.find((x) => x.userId === viewer.userId && isActiveOn(x, today));
    if (!m) return none;
    m.cancelledAt ??= new Date().toISOString();
    return { ok: true, membership: toPublic(m) };
  }

  const { getSupabaseAdmin } = await import("../supabase/admin");
  const db = getSupabaseAdmin();
  const { data: rows, error: readErr } = await db
    .from("memberships")
    .select(COLUMNS)
    .eq("user_id", viewer.userId)
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1);
  if (readErr) {
    console.error("membership read failed", readErr.code, readErr.message);
    return { ok: false, code: "error", error: "Couldn't cancel your membership. Try again." };
  }
  const current = rows?.[0] as MembershipRow | undefined;
  if (!current) return none;
  if (current.cancelled_at) return { ok: true, membership: toMembership(current) };

  const { data, error } = await db
    .from("memberships")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", current.id)
    .eq("user_id", viewer.userId)
    .is("cancelled_at", null)
    .select(COLUMNS);
  if (error) {
    console.error("membership cancel failed", error.code, error.message);
    return { ok: false, code: "error", error: "Couldn't cancel your membership. Try again." };
  }
  // A concurrent cancel won the race: still fine.
  return { ok: true, membership: toMembership((data?.[0] as MembershipRow | undefined) ?? current) };
}

/** Memory-store twin of the FK cascade on account deletion (no-op with Supabase). */
export async function deleteMembershipsForUserInMemory(userId: string): Promise<void> {
  if ((await backend()) !== "memory") return;
  for (let i = mem.length - 1; i >= 0; i--) if (mem[i].userId === userId) mem.splice(i, 1);
}
