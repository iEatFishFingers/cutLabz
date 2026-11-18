// Storage layer. Supabase when configured; in-memory fallback outside production.
// Dates are "YYYY-MM-DD" and times are minutes from midnight, shop-local time.
import { hasSupabaseEnv } from "./supabase/env";

export type Booking = {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  barberId: string;
  serviceId: string;
  addonIds: string[];
  name: string;
  email: string;
  phone: string;
  notes: string;
  totalGBP: number;
  createdAt: string;
  /** Owning customer account (null for walk-in/admin-made bookings). */
  userId?: string | null;
  /** Membership that covers this cut (null for paid bookings). */
  membershipId?: string | null;
  /** "pending" | "confirmed" | "cancelled" | "completed" | "no_show". Default "confirmed". */
  status?: string;
  /** Customer-facing reference, e.g. "CL-3F9A2C". Present on rows read back. */
  reference?: string;
  /** Idempotency key supplied by the booking UI (unique per user). */
  requestKey?: string | null;
};

/** Raised by the DB trigger enforce_booking_cap (and mirrored by the memory store). */
export const BOOKING_LIMIT_MESSAGE = "You can hold up to 3 upcoming bookings. Cancel or complete one first.";

export function isBookingLimitError(error: { message?: string; code?: string } | null | undefined): boolean {
  return !!error && (error.message ?? "").includes("booking_limit_reached");
}

export const ACTIVE_STATUSES = ["pending", "confirmed"] as const;
export const isActiveStatus = (s: string | undefined): boolean =>
  s === undefined || s === "pending" || s === "confirmed";

export type RescheduleTarget = { date: string; startMin: number; endMin: number; barberId: string };

type Row = {
  id: string;
  reference: string;
  booking_date: string;
  start_min: number;
  end_min: number;
  barber_id: string;
  service_id: string;
  addon_ids: string[] | null;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  total_pence: number;
  created_at: string;
  user_id?: string | null;
  membership_id?: string | null;
  status?: string;
  request_key?: string | null;
};

const FULL_COLUMNS =
  "id, reference, booking_date, start_min, end_min, barber_id, service_id, addon_ids, name, email, phone, notes, total_pence, created_at, user_id, membership_id, status, request_key";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromRow(r: Row): Booking {
  return {
    id: r.id,
    date: r.booking_date,
    startMin: r.start_min,
    endMin: r.end_min,
    barberId: r.barber_id,
    serviceId: r.service_id,
    addonIds: r.addon_ids ?? [],
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    notes: r.notes ?? "",
    totalGBP: r.total_pence / 100,
    createdAt: r.created_at,
    userId: r.user_id ?? null,
    membershipId: r.membership_id ?? null,
    status: r.status ?? "confirmed",
    reference: r.reference,
    requestKey: r.request_key ?? null,
  };
}

async function backend() {
  if (hasSupabaseEnv()) return "supabase" as const;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase env is missing in production; refusing to use the in-memory store.",
    );
  }
  return "memory" as const;
}

export async function listBookingsForDate(date: string): Promise<Booking[]> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).listBookingsForDate(date);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("id,booking_date,start_min,end_min,barber_id,service_id,addon_ids,created_at")
    .eq("booking_date", date)
    .in("status", ["pending", "confirmed"]);
  if (error) {
    console.error("bookings list failed", error.code, error.message);
    throw new Error("Could not load bookings.");
  }
  // List rows are availability-only: customer PII and totals are deliberately
  // not fetched, so they are blank here. Only insertBooking returns full rows.
  return (data as Row[]).map((r) =>
    fromRow({ ...r, name: "", email: "", phone: "", notes: "", total_pence: 0 }),
  );
}

export async function insertBooking(
  b: Omit<Booking, "id" | "createdAt" | "reference">,
): Promise<Booking | "conflict" | "limit" | "duplicate"> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).insertBooking(b);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const db = getSupabaseAdmin();

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = crypto.randomUUID();
    const reference = `CL-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const { data, error } = await db
      .from("bookings")
      .insert({
        id,
        reference,
        booking_date: b.date,
        start_min: b.startMin,
        end_min: b.endMin,
        barber_id: b.barberId,
        service_id: b.serviceId,
        addon_ids: b.addonIds,
        name: b.name,
        email: b.email,
        phone: b.phone,
        notes: b.notes,
        total_pence: Math.round(b.totalGBP * 100),
        status: b.status ?? "confirmed",
        user_id: b.userId ?? null,
        membership_id: b.membershipId ?? null,
        request_key: b.requestKey ?? null,
      })
      .select(FULL_COLUMNS)
      .single();
    if (!error) return fromRow(data as Row);

    const msg = error.message ?? "";
    if (isBookingLimitError(error)) return "limit";
    if (error.code === "23P01") return "conflict";
    if (error.code === "23505") {
      if (msg.includes("request_key")) return "duplicate";
      // Only the reference column is expected to collide; retry with a new id.
      if (msg.includes("bookings_pkey")) continue;
      if (!msg.includes("reference")) {
        console.error("bookings insert failed", error.code, msg);
        throw new Error("Could not save booking.");
      }
      continue;
    }
    console.error("bookings insert failed", error.code, msg);
    throw new Error("Could not save booking.");
  }
  throw new Error("Could not generate a unique booking reference.");
}

// ---------- Customer-scoped reads/writes ----------
// All use the service-role client, so EVERY query is scoped by user_id here.

/** A user's pending/confirmed bookings from `sinceDate` on (caller filters precisely). */
export async function listActiveBookingsForUser(
  userId: string,
  sinceDate?: string,
): Promise<Booking[]> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).listActiveBookingsForUser(userId, sinceDate);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  let q = getSupabaseAdmin()
    .from("bookings")
    .select(FULL_COLUMNS)
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES]);
  if (sinceDate) q = q.gte("booking_date", sinceDate);
  const { data, error } = await q.order("booking_date").order("start_min");
  if (error) {
    console.error("user bookings list failed", error.code, error.message);
    throw new Error("Could not load bookings.");
  }
  return (data as Row[]).map(fromRow);
}

/** The user's booking created with this idempotency key, if any (any status). */
export async function findBookingByRequestKey(
  userId: string | null,
  requestKey: string,
): Promise<Booking | null> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).findBookingByRequestKey(userId, requestKey);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  // userId null = walk-in/admin bookings (user_id IS NULL).
  const base = getSupabaseAdmin().from("bookings").select(FULL_COLUMNS);
  const { data, error } = await (userId === null ? base.is("user_id", null) : base.eq("user_id", userId))
    .eq("request_key", requestKey)
    .maybeSingle();
  if (error) {
    console.error("booking request-key read failed", error.code, error.message);
    throw new Error("Could not load booking.");
  }
  return data ? fromRow(data as Row) : null;
}

/** All of a user's bookings (any status), newest first. */
export async function listBookingsForUser(userId: string, limit = 50): Promise<Booking[]> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).listBookingsForUser(userId, limit);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(FULL_COLUMNS)
    .eq("user_id", userId)
    .order("booking_date", { ascending: false })
    .order("start_min", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("user bookings history failed", error.code, error.message);
    throw new Error("Could not load bookings.");
  }
  return (data as Row[]).map(fromRow);
}

export async function getBookingForUser(userId: string, id: string): Promise<Booking | null> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).getBookingForUser(userId, id);
  }
  if (!UUID_RE.test(id)) return null;
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select(FULL_COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("user booking read failed", error.code, error.message);
    throw new Error("Could not load booking.");
  }
  return data ? fromRow(data as Row) : null;
}

/** Cancels the user's own pending/confirmed booking. True when a row changed. */
export async function cancelBooking(userId: string, id: string): Promise<boolean> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).cancelBooking(userId, id);
  }
  if (!UUID_RE.test(id)) return false;
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .in("status", [...ACTIVE_STATUSES])
    .select("id");
  if (error) {
    console.error("booking cancel failed", error.code, error.message);
    throw new Error("Could not cancel booking.");
  }
  return (data?.length ?? 0) > 0;
}

/** Moves the user's own active booking in one atomic UPDATE. */
export async function rescheduleBookingRow(
  userId: string,
  id: string,
  to: RescheduleTarget,
): Promise<Booking | "conflict" | "not_found" | "limit"> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).rescheduleBookingRow(userId, id, to);
  }
  if (!UUID_RE.test(id)) return "not_found";
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .update({
      booking_date: to.date,
      start_min: to.startMin,
      end_min: to.endMin,
      barber_id: to.barberId,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .in("status", [...ACTIVE_STATUSES])
    .select(FULL_COLUMNS);
  if (error) {
    // The no_overlap exclusion constraint makes the clash check atomic.
    if (isBookingLimitError(error)) return "limit";
    if (error.code === "23P01") return "conflict";
    console.error("booking reschedule failed", error.code, error.message);
    throw new Error("Could not reschedule booking.");
  }
  return data?.[0] ? fromRow(data[0] as Row) : "not_found";
}

// ---------- Account deletion ----------

/** Placeholder phone written over anonymised bookings (the column is NOT NULL). */
export const DELETED_PHONE = "deleted";

/** Cancels the user's not-yet-started pending/confirmed bookings. Returns how many changed. */
export async function cancelUpcomingBookingsForUser(
  userId: string,
  now: { date: string; min: number },
): Promise<number> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).cancelUpcomingBookingsForUser(userId, now);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const db = getSupabaseAdmin();
  const stamp = { status: "cancelled", cancelled_at: new Date().toISOString() };
  const later = await db
    .from("bookings")
    .update(stamp)
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .gt("booking_date", now.date)
    .select("id");
  if (later.error) {
    console.error("account cancel failed", later.error.code, later.error.message);
    throw new Error("Could not cancel bookings.");
  }
  const today = await db
    .from("bookings")
    .update(stamp)
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .eq("booking_date", now.date)
    .gt("start_min", now.min)
    .select("id");
  if (today.error) {
    console.error("account cancel failed", today.error.code, today.error.message);
    throw new Error("Could not cancel bookings.");
  }
  return (later.data?.length ?? 0) + (today.data?.length ?? 0);
}

/** Overwrites name/email/phone/notes on ALL of the user's bookings (kept for the shop's records). */
export async function anonymiseBookingsForUser(userId: string): Promise<void> {
  if ((await backend()) === "memory") {
    return (await import("./store-memory")).anonymiseBookingsForUser(userId, DELETED_PHONE);
  }
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("bookings").select("id").eq("user_id", userId);
  if (error) {
    console.error("account anonymise read failed", error.code, error.message);
    throw new Error("Could not anonymise bookings.");
  }
  const ids = (data ?? []).map((r) => r.id as string);
  for (let i = 0; i < ids.length; i += 10) {
    const results = await Promise.all(
      ids.slice(i, i + 10).map((id) =>
        db
          .from("bookings")
          .update({
            name: "Deleted customer",
            email: `deleted+${id}@example.invalid`,
            phone: DELETED_PHONE,
            notes: "",
            request_key: null,
          })
          .eq("id", id)
          .eq("user_id", userId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("account anonymise failed", failed.error.code, failed.error.message);
      throw new Error("Could not anonymise bookings.");
    }
  }
}
