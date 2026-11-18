import "server-only";
import type { AdminSession } from "@/lib/admin/auth";
import type { ServerCatalog, TimeOff, Window } from "@/lib/catalog";
import { LIMITS, isValidDateString, quote, resolveAddons } from "@/lib/booking-shared";
import { insertBooking } from "@/lib/store";
import {
  STEP,
  UUID_RE,
  barberWindows,
  fitsInWindows,
  isActiveStatus,
  isOnLeave,
  isStatus,
  type AdminActionResult,
  type AdminBarber,
  type AdminBooking,
  type BookingStatus,
} from "./bookings-shared";

type Db = AdminSession["db"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLS =
  "id,reference,booking_date,start_min,end_min,barber_id,service_id,addon_ids,name,email,phone,notes,total_pence,status,payment_status";

export type AdminDirectory = {
  barbers: AdminBarber[]; // ALL barbers, including inactive
  serviceNames: Record<string, string>;
  addonNames: Record<string, string>;
  timeOff: TimeOff[];
};

/** Every barber/service/add-on (no active filter) so old bookings still render. */
export async function loadAdminDirectory(db: Db): Promise<AdminDirectory> {
  const [b, s, a, av, to] = await Promise.all([
    db.from("barbers").select("id,name,active"),
    db.from("services").select("id,name"),
    db.from("addons").select("id,name"),
    db.from("availability").select("barber_id,weekday,open_min,close_min"),
    db.from("time_off").select("barber_id,start_date,end_date"),
  ]);
  for (const r of [b, s, a, av, to]) {
    if (r.error || !Array.isArray(r.data)) throw new Error("Could not load calendar data.");
  }
  const avail = av.data as any[];
  const barbers: AdminBarber[] = (b.data as any[])
    .map((r) => {
      const hours: Record<number, Window[]> = {};
      for (const x of avail.filter((x) => x.barber_id === r.id))
        (hours[x.weekday] ??= []).push({ open: x.open_min, close: x.close_min });
      for (const k of Object.keys(hours)) hours[Number(k)].sort((p, q) => p.open - q.open);
      return { id: r.id as string, name: (r.name as string) ?? "", active: r.active !== false, hours };
    })
    .sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name));
  const names = (rows: any[]) => Object.fromEntries(rows.map((r) => [r.id, r.name ?? ""]));
  return {
    barbers,
    serviceNames: names(s.data as any[]),
    addonNames: names(a.data as any[]),
    timeOff: (to.data as any[]).map((r) => ({
      barberId: r.barber_id,
      startDate: String(r.start_date),
      endDate: String(r.end_date),
    })),
  };
}

/** Bookings for an inclusive date range, via the admin's RLS session. */
export async function listAdminBookings(
  db: Db,
  from: string,
  to: string,
  dir: Pick<AdminDirectory, "serviceNames" | "addonNames">,
): Promise<AdminBooking[]> {
  if (!isValidDateString(from) || !isValidDateString(to)) throw new Error("Bad date range.");
  const { data, error } = await db
    .from("bookings")
    .select(COLS)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("start_min", { ascending: true });
  if (error) {
    console.error("admin bookings list failed", error.code);
    throw new Error("Could not load bookings.");
  }
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    reference: r.reference ?? "",
    date: String(r.booking_date),
    startMin: r.start_min,
    endMin: r.end_min,
    barberId: r.barber_id,
    serviceName: dir.serviceNames[r.service_id] || "Removed service",
    addonNames: ((r.addon_ids ?? []) as string[]).map((id) => dir.addonNames[id] || "Removed add-on"),
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    notes: r.notes ?? "",
    totalGBP: (r.total_pence ?? 0) / 100,
    status: isStatus(r.status) ? r.status : "unknown",
    statusRaw: String(r.status ?? ""),
    paymentStatus: r.payment_status ?? "",
  }));
}

export async function changeBookingStatus(
  session: AdminSession,
  id: unknown,
  status: unknown,
): Promise<AdminActionResult> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "Invalid booking." };
  if (!isStatus(status)) return { ok: false, error: "Invalid status." };
  const next: BookingStatus = status;
  const { data, error } = await session.db
    .from("bookings")
    .update({ status: next })
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === "23P01" && isActiveStatus(next))
      return { ok: false, error: "That barber already has a booking at that time." };
    console.error("admin status update failed", error.code);
    return { ok: false, error: "Could not update the booking." };
  }
  if (!data?.length) return { ok: false, error: "Booking not found." };
  return { ok: true };
}

export type CreateInput = {
  barberId: unknown;
  serviceId: unknown;
  addonIds: unknown;
  date: unknown;
  startMin: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  notes: unknown;
  overrideHours: unknown;
};

export type CreateResult =
  | { ok: true; reference: string; date: string; startMin: number; barberName: string }
  | { ok: false; error: string };

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.length <= max * 4 ? v.trim() : null;

export async function createAdminBooking(
  _session: AdminSession,
  input: CreateInput,
  catalog: ServerCatalog,
): Promise<CreateResult> {
  const fail = (error: string): CreateResult => ({ ok: false, error });

  const barber =
    typeof input.barberId === "string"
      ? catalog.barbers.find((b) => b.id === input.barberId)
      : undefined;
  if (!barber) return fail("Choose a barber.");
  const service =
    typeof input.serviceId === "string"
      ? catalog.services.find((s) => s.id === input.serviceId)
      : undefined;
  if (!service) return fail("Choose a service.");

  if (!Array.isArray(input.addonIds) || input.addonIds.length > 20) return fail("Invalid add-ons.");
  const addonIds = [...new Set(input.addonIds)];
  if (addonIds.some((a) => typeof a !== "string")) return fail("Invalid add-ons.");
  if (resolveAddons(catalog, addonIds as string[]).length !== addonIds.length)
    return fail("Unknown add-on.");

  const date = input.date;
  if (typeof date !== "string" || !isValidDateString(date)) return fail("Enter a valid date.");
  const startMin = input.startMin;
  if (
    typeof startMin !== "number" ||
    !Number.isInteger(startMin) ||
    startMin < 0 ||
    startMin >= 1440 ||
    startMin % STEP !== 0
  )
    return fail("Choose a start time.");

  const name = str(input.name, LIMITS.name);
  if (!name || name.length > LIMITS.name) return fail(`Enter a name (max ${LIMITS.name} characters).`);
  const phone = str(input.phone, LIMITS.phone);
  const email = str(input.email, LIMITS.email);
  const notes = typeof input.notes === "string" ? input.notes.trim() : null;
  if (phone === null || email === null || notes === null) return fail("Invalid details.");
  if (phone && (!/^\d{7,15}$/.test(phone.replace(/[\s()+-]/g, "")) || phone.length > LIMITS.phone))
    return fail("Enter a valid phone number or leave it blank.");
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > LIMITS.email))
    return fail("Enter a valid email or leave it blank.");
  if (notes.length > LIMITS.notes) return fail(`Notes: max ${LIMITS.notes} characters.`);

  const q = quote(catalog, service.id, addonIds as string[]);
  if (!q) return fail("Choose a service.");
  const endMin = startMin + q.durationMin;
  if (endMin > 1440) return fail("That booking would run past midnight.");

  if (input.overrideHours !== true) {
    if (isOnLeave(catalog.timeOff, barber.id, date))
      return fail(`${barber.name} is on time off that day. Tick "Override hours" to book anyway.`);
    if (!fitsInWindows(barberWindows(barber, date), startMin, endMin))
      return fail(
        `That time is outside ${barber.name}'s working hours. Tick "Override hours" to book anyway.`,
      );
  }

  const saved = await insertBooking({
    date,
    startMin,
    endMin,
    barberId: barber.id,
    serviceId: service.id,
    addonIds: addonIds as string[],
    name,
    email,
    phone,
    notes,
    totalGBP: q.totalGBP,
  });
  if (saved === "conflict") return fail("That barber already has a booking at that time.");
  // Admin bookings carry no user id, so the cap/idempotency results cannot occur.
  if (typeof saved === "string") return fail("Could not save booking.");
  // insertBooking derives the reference from the id the same way.
  const reference = `CL-${saved.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  return { ok: true, reference, date, startMin, barberName: barber.name };
}
