// Mock data for local development: customers, memberships, bookings, varied
// working hours and time off, written to the Supabase project in .env.local.
//
//   npm run seed:mock          create (safe to re-run: it removes its own data first)
//   npm run seed:mock:remove   delete everything this script created
//
// Everything is tagged so it can be removed precisely:
//   - users:      mock+<name>@example.invalid  (no password, they cannot sign in)
//   - time off:   reason starts with "MOCK:"
//   - bookings:   belong to those users (deleted with them)
//   - hours:      only changed if still the original Tue-Sat 11:00-21:00 seed, and
//                 only restored by --remove if they are still the mock pattern.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addDays, shopNow } from "../lib/booking-shared";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall through to the check below
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const REMOVE = process.argv.includes("--remove");
const EMAIL_PREFIX = "mock+";
const EMAIL_SUFFIX = "@example.invalid";
const TIME_OFF_TAG = "MOCK:";
const STEP = 30;

type Win = [number, number];
const hm = (h: number, m = 0) => h * 60 + m;

// weekday: 0=Sun..6=Sat
const SEED_HOURS: Record<string, Record<number, Win[]>> = {};
const MOCK_HOURS: Record<string, Record<number, Win[]>> = {
  // Wayne: split shift (lunch 14:00-15:00) Tue-Fri, shorter Saturday.
  "barber-1": { 2: [[hm(11), hm(14)], [hm(15), hm(21)]], 3: [[hm(11), hm(14)], [hm(15), hm(21)]], 4: [[hm(11), hm(14)], [hm(15), hm(21)]], 5: [[hm(11), hm(14)], [hm(15), hm(21)]], 6: [[hm(10), hm(18)]] },
  // Ayaan: 12:00-20:00 Tue-Sat.
  "barber-2": { 2: [[hm(12), hm(20)]], 3: [[hm(12), hm(20)]], 4: [[hm(12), hm(20)]], 5: [[hm(12), hm(20)]], 6: [[hm(12), hm(20)]] },
};
for (const b of ["barber-1", "barber-2"]) {
  SEED_HOURS[b] = Object.fromEntries([2, 3, 4, 5, 6].map((d) => [d, [[hm(11), hm(21)] as Win]]));
}

const dow = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// Small deterministic PRNG so re-runs make the same shape of data.
let seed = 20260101;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

async function hoursAsRows(): Promise<{ barber_id: string; weekday: number; open_min: number; close_min: number }[]> {
  const { data, error } = await db.from("availability").select("barber_id,weekday,open_min,close_min");
  if (error) throw error;
  return data ?? [];
}

const toRows = (h: Record<string, Record<number, Win[]>>) =>
  Object.entries(h).flatMap(([barber_id, days]) =>
    Object.entries(days).flatMap(([d, wins]) => wins.map(([o, c]) => ({ barber_id, weekday: Number(d), open_min: o, close_min: c }))),
  );
const sig = (rows: { barber_id: string; weekday: number; open_min: number; close_min: number }[]) =>
  rows.map((r) => `${r.barber_id}|${r.weekday}|${r.open_min}|${r.close_min}`).sort().join(";");

async function setHours(h: Record<string, Record<number, Win[]>>) {
  for (const barber of Object.keys(h)) {
    const del = await db.from("availability").delete().eq("barber_id", barber);
    if (del.error) throw del.error;
  }
  const ins = await db.from("availability").insert(toRows(h));
  if (ins.error) throw ins.error;
}

async function mockUsers(): Promise<{ id: string; email: string }[]> {
  const out: { id: string; email: string }[] = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.startsWith(EMAIL_PREFIX) && u.email.endsWith(EMAIL_SUFFIX)) out.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 200) break;
  }
  return out;
}

async function removeAll(restoreHours: boolean) {
  const users = await mockUsers();
  const ids = users.map((u) => u.id);
  if (ids.length) {
    const b = await db.from("bookings").delete().in("user_id", ids);
    if (b.error) throw b.error;
    for (const id of ids) {
      const r = await db.auth.admin.deleteUser(id);
      if (r.error) throw r.error;
    }
  }
  const t = await db.from("time_off").delete().like("reason", `${TIME_OFF_TAG}%`);
  if (t.error) throw t.error;
  let hours = "left as is";
  if (restoreHours && sig(await hoursAsRows()) === sig(toRows(MOCK_HOURS))) {
    await setHours(SEED_HOURS);
    hours = "restored to Tue-Sat 11:00-21:00";
  }
  console.log(`removed ${ids.length} mock users (and their bookings/memberships), mock time off; hours ${hours}`);
}

const NAMES = [
  "Liam Carter", "Noah Patel", "Oliver Khan", "Elijah Brooks", "James Murphy", "Mason Reid", "Ethan Walker", "Lucas Hughes",
  "Jacob Okafor", "Aiden Shaw", "Henry Bell", "Leo Fraser", "Mohammed Hussain", "Daniel Evans", "Samuel Wood", "Tariq Mahmood",
];

async function main() {
  console.log(`target project: ${new URL(url!).host}`);
  await removeAll(false); // re-run safe; hours restored below only if we re-apply them

  const now = shopNow();
  const today = now.date;

  // ---- hours ----
  const currentSig = sig(await hoursAsRows());
  let hoursNote: string;
  if (currentSig === sig(toRows(SEED_HOURS)) || currentSig === sig(toRows(MOCK_HOURS))) {
    await setHours(MOCK_HOURS);
    hoursNote = "applied (Wayne split shift Tue-Fri + short Sat, Ayaan 12-20)";
  } else {
    hoursNote = "NOT changed (your hours were customised); bookings follow your current hours";
  }

  // ---- time off ----
  const off = [
    { barber_id: "barber-2", start_date: addDays(today, 9), end_date: addDays(today, 10), reason: `${TIME_OFF_TAG} holiday` },
    { barber_id: "barber-1", start_date: addDays(today, 12), end_date: addDays(today, 12), reason: `${TIME_OFF_TAG} training course` },
  ];
  {
    const r = await db.from("time_off").insert(off);
    if (r.error) throw r.error;
  }

  // ---- catalog ----
  const [{ data: services }, { data: addons }, hoursRows, { data: offRows }] = await Promise.all([
    db.from("services").select("id,kind,price_pence,duration_min,active"),
    db.from("addons").select("id,price_pence,extra_min,active"),
    hoursAsRows(),
    db.from("time_off").select("barber_id,start_date,end_date"),
  ]);
  const svc = new Map((services ?? []).map((s) => [s.id as string, s]));
  const addonList = (addons ?? []).filter((a) => a.active);
  const barbers = [...new Set(hoursRows.map((r) => r.barber_id))].sort();
  const wins = (barber: string, date: string): Win[] =>
    hoursRows
      .filter((r) => r.barber_id === barber && r.weekday === dow(date))
      .map((r) => [r.open_min, r.close_min] as Win)
      .sort((a, b) => a[0] - b[0]);
  const onLeave = (barber: string, date: string) =>
    (offRows ?? []).some((o) => o.barber_id === barber && o.start_date <= date && date <= o.end_date);

  // ---- users + memberships ----
  type U = { id: string; name: string; email: string; phone: string; m: { id: string; plan: string; start: string; end: string } | null };
  const plans: [string, number][] = [["core", -12], ["core", -3], ["plus", -20], ["plus", -7], ["premium", -15], ["plus", -45]];
  const users: U[] = [];
  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i];
    const email = `${EMAIL_PREFIX}${name.toLowerCase().replace(/[^a-z]+/g, ".")}${EMAIL_SUFFIX}`;
    const phone = `07700 9${String(10 + i).padStart(2, "0")} ${String(100 + i * 7).padStart(3, "0")}`;
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name, phone } });
    if (error || !data.user) throw error ?? new Error("createUser failed");
    let m: U["m"] = null;
    if (plans[i]) {
      const [plan, offset] = plans[i];
      const start = addDays(today, offset);
      const end = addDays(start, 29);
      const ins = await db.from("memberships").insert({ user_id: data.user.id, plan, starts_on: start, ends_on: end }).select("id").single();
      if (ins.error) throw ins.error;
      m = { id: ins.data.id as string, plan, start, end };
    }
    users.push({ id: data.user.id, name, email, phone, m });
  }

  // ---- bookings ----
  type Row = Record<string, unknown>;
  const rows: Row[] = [];
  const userSlots = new Set<string>(); // `${userId}|${date}|${start}`
  const upcoming = new Map<string, number>(); // userId -> upcoming active
  const upcomingMember = new Set<string>();
  const nowAbs = (date: string, min: number) => {
    const a = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;
    return (a(date) - a(today)) * 1440 + min - now.min; // minutes from now
  };

  const make = (u: U, barber: string, date: string, start: number, status: string, member: boolean) => {
    const plan = u.m?.plan;
    const serviceId = member && plan ? plan : rand() < 0.65 ? "haircut" : "haircut-beard";
    const s = svc.get(serviceId);
    if (!s) return;
    const chosen = rand() < 0.3 ? shuffle(addonList).slice(0, 1 + Math.floor(rand() * 2)) : [];
    const free = serviceId === "premium";
    const total = s.price_pence + (free ? 0 : chosen.reduce((n: number, a) => n + a.price_pence, 0));
    const dur = s.duration_min + chosen.reduce((n: number, a) => n + a.extra_min, 0);
    const id = crypto.randomUUID();
    const createdAt = new Date(Date.parse(`${date}T12:00:00Z`) - (1 + Math.floor(rand() * 6)) * 86_400_000).toISOString();
    rows.push({
      id,
      reference: `CL-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      booking_date: date,
      start_min: start,
      end_min: start + dur,
      barber_id: barber,
      service_id: serviceId,
      addon_ids: chosen.map((a) => a.id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      notes: "",
      total_pence: total,
      status,
      payment_status: status === "completed" && total > 0 ? "paid" : "unpaid",
      user_id: u.id,
      membership_id: member ? u.m?.id : null,
      cancelled_at: status === "cancelled" ? createdAt : null,
      created_at: createdAt,
    });
    userSlots.add(`${u.id}|${date}|${start}`);
  };

  const memberOn = (u: U, date: string) => !!u.m && u.m.start <= date && date <= u.m.end;

  // All candidate slots (30-min grid inside each window), past and future.
  const past: { barber: string; date: string; start: number }[] = [];
  const future: { barber: string; date: string; start: number }[] = [];
  for (let off = -21; off <= 14; off++) {
    const date = addDays(today, off);
    for (const barber of barbers) {
      if (onLeave(barber, date)) continue;
      for (const [open, close] of wins(barber, date)) {
        for (let s = open; s + STEP <= close; s += STEP) {
          const away = nowAbs(date, s);
          if (away < -STEP) past.push({ barber, date, start: s });
          else if (away >= 90) future.push({ barber, date, start: s });
        }
      }
    }
  }

  // Past: ~45% of slots, mostly completed.
  for (const p of past) {
    if (rand() > 0.45) continue;
    const eligible = users.filter((u) => !userSlots.has(`${u.id}|${p.date}|${p.start}`));
    if (!eligible.length) continue;
    const u = pick(eligible);
    const member = memberOn(u, p.date) && rand() < 0.85;
    const r = rand();
    make(u, p.barber, p.date, p.start, r < 0.82 ? "completed" : r < 0.92 ? "no_show" : "cancelled", member);
  }

  // Upcoming: a shuffled sample, respecting the same caps the app enforces.
  let target = 34;
  for (const f of shuffle(future)) {
    if (target <= 0) break;
    const eligible = users.filter(
      (u) => (upcoming.get(u.id) ?? 0) < 3 && !userSlots.has(`${u.id}|${f.date}|${f.start}`),
    );
    if (!eligible.length) break;
    const u = pick(eligible);
    const canMember = memberOn(u, f.date) && u.m!.end >= today && !upcomingMember.has(u.id);
    const member = canMember && rand() < 0.8;
    const cancelled = rand() < 0.07;
    make(u, f.barber, f.date, f.start, cancelled ? "cancelled" : "confirmed", member);
    if (!cancelled) {
      upcoming.set(u.id, (upcoming.get(u.id) ?? 0) + 1);
      if (member) upcomingMember.add(u.id);
    }
    target--;
  }

  for (let i = 0; i < rows.length; i += 100) {
    const r = await db.from("bookings").insert(rows.slice(i, i + 100));
    if (r.error) throw r.error;
  }

  const by = (f: (r: Row) => boolean) => rows.filter(f).length;
  console.log(`hours: ${hoursNote}`);
  console.log(`time off: ${off.length} entries (Ayaan ${off[0].start_date}..${off[0].end_date}, Wayne ${off[1].start_date})`);
  console.log(`users: ${users.length} (members: ${users.filter((u) => u.m).length}, one expired)`);
  console.log(
    `bookings: ${rows.length} (past ${by((r) => (r.booking_date as string) < today)}, upcoming active ${by(
      (r) => (r.booking_date as string) >= today && r.status === "confirmed",
    )}, cancelled ${by((r) => r.status === "cancelled")}, no-show ${by((r) => r.status === "no_show")}, member cuts ${by((r) => !!r.membership_id)})`,
  );
}

(REMOVE ? removeAll(true) : main()).catch((e) => {
  console.error("seed failed:", e?.message ?? e);
  process.exit(1);
});
