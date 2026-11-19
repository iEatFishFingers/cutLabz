-- Cut Labz schema (mirrors what is applied in Supabase, project kqomhuuwpvdxhranptke).
-- Applied as migrations: init_cutlabz_schema, security_hardening, replace_availability_fn, customer_flow_hardening,
-- admin_audit_and_walkin_idempotency, booking_contacted_marker.
-- Dates/times are shop-local (Europe/London): booking_date + minutes from midnight,
-- matching lib/store.ts and lib/availability.ts.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------- Catalog ----------
create table if not exists public.barbers (
  id          text primary key,
  name        text not null,
  role        text not null default 'Barber',
  active      boolean not null default true,
  user_id     uuid references auth.users(id) on delete set null  -- links a barber to an admin login
);

create table if not exists public.services (
  id           text primary key,
  name         text not null,
  description  text not null default '',
  duration_min int  not null check (duration_min > 0),
  price_pence  int  not null check (price_pence >= 0),
  kind         text not null check (kind in ('membership','one-off')),
  active       boolean not null default true
);

create table if not exists public.addons (
  id          text primary key,
  name        text not null,
  price_pence int  not null check (price_pence >= 0),
  extra_min   int  not null default 0,
  active      boolean not null default true
);

-- Weekly working hours per barber. weekday: 0=Sunday .. 6=Saturday
create table if not exists public.availability (
  id         bigint generated always as identity primary key,
  barber_id  text not null references public.barbers(id) on delete cascade,
  weekday    int  not null check (weekday between 0 and 6),
  open_min   int  not null check (open_min between 0 and 1440),
  close_min  int  not null check (close_min between 0 and 1440 and close_min > open_min)
);

-- `reason` is private: there is deliberately NO public read policy on this table.
-- The server reads it with the service-role key and exposes only the dates.
create table if not exists public.time_off (
  id         bigint generated always as identity primary key,
  barber_id  text not null references public.barbers(id) on delete cascade,
  start_date date not null,
  end_date   date not null check (end_date >= start_date),
  reason     text
);

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  booking_date date not null,
  start_min   int  not null check (start_min between 0 and 1440),
  end_min     int  not null check (end_min between 0 and 1440 and end_min > start_min),
  barber_id   text not null references public.barbers(id),
  service_id  text not null references public.services(id),
  addon_ids   text[] not null default '{}',
  name        text not null,
  email       text not null,
  phone       text not null,
  notes       text not null default '',
  total_pence int  not null check (total_pence >= 0),
  status      text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','completed','no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','deposit_paid','paid','refunded')),
  stripe_payment_intent text,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),

  -- The double-booking guard: one barber cannot have overlapping active bookings.
  constraint no_overlap exclude using gist (
    barber_id with =,
    booking_date with =,
    int4range(start_min, end_min) with &&
  ) where (status in ('pending','confirmed'))
);

create index if not exists bookings_date_idx on public.bookings (booking_date);
create index if not exists bookings_email_idx on public.bookings (lower(email));

-- ---------- Admin check ----------
-- Admins are users listed here (add a row after the user exists in Auth).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Lives in a non-exposed schema so it cannot be called over the public API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---------- Row Level Security ----------
alter table public.barbers      enable row level security;
alter table public.services     enable row level security;
alter table public.addons       enable row level security;
alter table public.availability enable row level security;
alter table public.time_off     enable row level security;
alter table public.bookings     enable row level security;
alter table public.admins       enable row level security;

-- Public can read the catalog (not time_off, which has private reasons).
create policy "catalog read barbers"      on public.barbers      for select using (true);
create policy "catalog read services"     on public.services     for select using (true);
create policy "catalog read addons"       on public.addons       for select using (true);
create policy "catalog read availability" on public.availability for select using (true);

-- Admins manage everything.
create policy "admin all barbers"      on public.barbers      for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin all services"     on public.services     for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin all addons"       on public.addons       for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin all availability" on public.availability for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin all time_off"     on public.time_off     for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin all bookings"     on public.bookings     for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- A signed-in user may see their own admins row (used by the app's admin check).
create policy "admin reads self" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Customers: bookings contain personal data, so there is deliberately NO public
-- read/insert policy. The Next.js server creates bookings with the service-role
-- key (after validating input) and customers only see their own via their login.
create policy "customer reads own bookings" on public.bookings
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Atomic weekly-hours swap (used by /admin/hours) ----------
-- SECURITY INVOKER: runs with the caller's RLS, so only admins can change hours.
create or replace function public.replace_availability(p_barber text, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'rows must be an array';
  end if;
  delete from public.availability where barber_id = p_barber;
  insert into public.availability (barber_id, weekday, open_min, close_min)
  select p_barber, (r->>'weekday')::int, (r->>'open_min')::int, (r->>'close_min')::int
  from jsonb_array_elements(p_rows) r;
end;
$$;
revoke execute on function public.replace_availability(text, jsonb) from public, anon;
grant execute on function public.replace_availability(text, jsonb) to authenticated;

-- ---------- Customer accounts + memberships ----------
-- Applied as migration: customer_accounts_memberships.
-- A membership is a dated period (no stacking: the exclusion constraint forbids
-- overlapping periods for one user). Customers can read their own; all writes
-- happen on the Next.js server (service-role) after it checks the signed-in user.
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan       text not null references public.services(id),
  starts_on  date not null,
  ends_on    date not null check (ends_on >= starts_on),
  created_at timestamptz not null default now(),
  constraint memberships_no_overlap exclude using gist (
    user_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
);
create index if not exists memberships_user_idx on public.memberships (user_id, ends_on desc);
alter table public.memberships enable row level security;
create policy "customer reads own memberships" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy "admin all memberships" on public.memberships
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

alter table public.bookings
  add column if not exists membership_id uuid references public.memberships(id) on delete set null,
  add column if not exists cancelled_at  timestamptz;
create index if not exists bookings_user_idx on public.bookings (user_id, booking_date);
create index if not exists bookings_membership_idx on public.bookings (membership_id) where membership_id is not null;

-- ---------- Seed (matches lib/catalog.ts seedCatalog) ----------
-- Real barbers; every service ~30 min including add-ons (confirmed by the owner).
insert into public.barbers (id, name, role) values
  ('barber-1','Wayne Graham','Barber'),
  ('barber-2','Ayaan Ali','Barber')
on conflict (id) do nothing;

insert into public.services (id, name, description, duration_min, price_pence, kind) values
  ('core','Core Membership Cut','Unlimited haircuts • 30 min',30,0,'membership'),
  ('plus','Plus Membership Cut','Haircut + beard trim • 30 min',30,0,'membership'),
  ('premium','Premium Membership Cut','Haircut + beard + free add-ons • 30 min',30,0,'membership'),
  ('haircut','Haircut','One-off appointment • 30 min',30,2000,'one-off'),
  ('haircut-beard','Haircut + Beard','One-off appointment • 30 min',30,2500,'one-off')
on conflict (id) do nothing;

insert into public.addons (id, name, price_pence, extra_min) values
  ('hot-towel','Hot Towel Treatment',500,0),
  ('wash-dry','Hair Wash & Dry',500,0),
  ('mask-steam','Face Mask / Steam',500,0),
  ('filler','Hairline Filler Spray',500,0)
on conflict (id) do nothing;

-- Tue-Sat 11:00-21:00 for both barbers (per-barber hours still to be confirmed)
insert into public.availability (barber_id, weekday, open_min, close_min)
select b.id, d, 660, 1260
from public.barbers b, generate_series(2,6) as d
where not exists (select 1 from public.availability a where a.barber_id = b.id and a.weekday = d);

-- ---------- QA fixes: membership cancel, idempotent booking, booking cap ----------
-- Applied to the live project. Cancelling a membership sets cancelled_at; access
-- continues until ends_on.
alter table public.memberships add column if not exists cancelled_at timestamptz;

-- Idempotent submit: a retry with the same (user, key) never creates a 2nd booking.
alter table public.bookings add column if not exists request_key text;
create unique index if not exists bookings_user_request_key_idx
  on public.bookings (user_id, request_key) where request_key is not null;

-- Hard cap: a user may hold at most 3 upcoming pending/confirmed bookings. The
-- advisory lock serialises concurrent inserts for one user (closes the race).
create or replace function public.enforce_booking_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if new.user_id is null or new.status not in ('pending','confirmed') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select count(*) into n
  from public.bookings b
  where b.user_id = new.user_id
    and b.id <> new.id
    and b.status in ('pending','confirmed')
    and (b.booking_date::timestamp + make_interval(mins => b.start_min))
        > (now() at time zone 'Europe/London');
  if n >= 3 then
    raise exception 'booking_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_booking_cap() from public, anon, authenticated;

drop trigger if exists bookings_enforce_cap on public.bookings;
create trigger bookings_enforce_cap
  before insert or update of status, booking_date, start_min, user_id on public.bookings
  for each row execute function public.enforce_booking_cap();

-- ---------- Admin QA fixes: status audit + walk-in idempotency ----------
-- Applied to the live project.
alter table public.bookings
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by text;
-- Walk-in/admin bookings (user_id null) are idempotent on request_key too.
create unique index if not exists bookings_admin_request_key_idx
  on public.bookings (request_key) where user_id is null and request_key is not null;
-- Staff "contacted the customer" stamp for shop-cancelled bookings.
alter table public.bookings add column if not exists contacted_at timestamptz;

-- Applied to the live project: when the shop contacted the customer about a booking.
alter table public.bookings add column if not exists contacted_at timestamptz;
