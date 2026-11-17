-- Cut Labz schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Dates/times are shop-local (Europe/London): booking_date + minutes from midnight,
-- matching lib/store.ts and lib/availability.ts.

create extension if not exists btree_gist;

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
-- Barbers/admins are users listed here (add rows after they sign up).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- Row Level Security ----------
alter table public.barbers      enable row level security;
alter table public.services     enable row level security;
alter table public.addons       enable row level security;
alter table public.availability enable row level security;
alter table public.time_off     enable row level security;
alter table public.bookings     enable row level security;
alter table public.admins       enable row level security;

-- Public can read the catalog (needed for the booking page).
create policy "catalog read barbers"      on public.barbers      for select using (true);
create policy "catalog read services"     on public.services     for select using (true);
create policy "catalog read addons"       on public.addons       for select using (true);
create policy "catalog read availability" on public.availability for select using (true);
create policy "catalog read time_off"     on public.time_off     for select using (true);

-- Admins manage everything.
create policy "admin all barbers"      on public.barbers      for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all services"     on public.services     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all addons"       on public.addons       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all availability" on public.availability for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all time_off"     on public.time_off     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin all bookings"     on public.bookings     for all using (public.is_admin()) with check (public.is_admin());

-- Customers: bookings contain personal data, so there is deliberately NO public
-- read/insert policy. The Next.js server creates bookings with the service-role
-- key (after validating input) and customers only see their own via their login.
create policy "customer reads own bookings" on public.bookings
  for select using (user_id = auth.uid());

-- ---------- Seed (matches lib/catalog.ts placeholders) ----------
insert into public.barbers (id, name, role) values
  ('barber-1','Barber One','Senior barber'),
  ('barber-2','Barber Two','Barber')
on conflict (id) do nothing;

insert into public.services (id, name, description, duration_min, price_pence, kind) values
  ('core','Core Membership Cut','Unlimited haircuts • 25 min',25,0,'membership'),
  ('plus','Plus Membership Cut','Haircut + beard trim • 35 min',35,0,'membership'),
  ('premium','Premium Membership Cut','Haircut + beard + free add-ons • 60 min',60,0,'membership'),
  ('haircut','Haircut','One-off appointment • 30 min',30,2000,'one-off'),
  ('haircut-beard','Haircut + Beard','One-off appointment • 40 min',40,2500,'one-off')
on conflict (id) do nothing;

insert into public.addons (id, name, price_pence, extra_min) values
  ('hot-towel','Hot Towel Treatment',500,10),
  ('wash-dry','Hair Wash & Dry',500,10),
  ('mask-steam','Face Mask / Steam',500,10),
  ('filler','Hairline Filler Spray',500,5)
on conflict (id) do nothing;

-- Tue-Sat 11:00-21:00 for both barbers
insert into public.availability (barber_id, weekday, open_min, close_min)
select b.id, d, 660, 1260
from public.barbers b, generate_series(2,6) as d
where not exists (select 1 from public.availability a where a.barber_id = b.id and a.weekday = d);
