---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table bookings

**In plain English:** every appointment, past and future. The database itself refuses to save two live appointments that overlap for the same barber, so even a race between two customers cannot double-book. Customers can only read their own rows; all writes come from the server. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:56-82 | create table + `no_overlap` |
| supabase/schema.sql:84-85 | indexes |
| supabase/schema.sql:183-187 | later `alter table`: membership_id, cancelled_at, indexes |
| supabase/schema.sql:126, 135-136 | policies |

## Columns
| Column | Type / default / check |
|---|---|
| id | uuid PK `gen_random_uuid()` |
| reference | text unique, default 8 upper-case hex chars of a uuid ([[Booking reference]]) |
| booking_date | date |
| start_min, end_min | int 0-1440; `end_min > start_min` |
| barber_id, service_id | text FKs ([[Table barbers]], [[Table services and addons]]), no cascade |
| addon_ids | text[] default `{}` |
| name, email, phone | text not null; notes default `''` |
| total_pence | int `>= 0` |
| status | check in pending, confirmed, cancelled, completed, no_show; default `confirmed` |
| payment_status | check unpaid, deposit_paid, paid, refunded; default `unpaid` |
| stripe_payment_intent | text null (no Stripe code verified) |
| user_id | uuid FK auth.users, `on delete set null` |
| created_at | timestamptz default now() |
| membership_id | uuid FK [[Table memberships]], `on delete set null` (added :184) |
| cancelled_at | timestamptz null (added :185) |

## Rules & invariants
- `no_overlap` (:77-81): `exclude using gist (barber_id =, booking_date =, int4range(start_min,end_min) &&) where status in ('pending','confirmed')`. Needs `btree_gist` ([[Schema history and seed data]]). Cancelled/completed/no_show rows free the slot. Concept: [[Double-booking guard]].
- Indexes: `bookings_date_idx(booking_date)`, `bookings_email_idx(lower(email))`, `bookings_user_idx(user_id, booking_date)`, partial `bookings_membership_idx(membership_id) where not null`.
- Guest bookings have `user_id` null; [[Member cut]] rows carry `membership_id`.

## Reads / Writes
| Code | Client |
|---|---|
| lib/store.ts:97-263 ([[Store Supabase]]) | service role: create, list, update status, cancel, reschedule |
| lib/admin/bookings.ts:77,115 ([[Admin bookings lib]]), components/admin/settings/future-bookings.ts:20, time-off/actions.ts:56 | admin session (RLS) |
| lib/customer/bookings.ts ([[Customer bookings lib]]) via store | service role |
| scripts/seed-mock.ts, tests/integration ([[Tests integration]]) | service role |

## Security notes
No anon policy and no customer insert/update policy: personal data (name, email, phone). Customers `select` own rows (`user_id = auth.uid()`); admin all ([[RLS matrix]], [[Trust boundary]]).

## Failure modes
Insert that collides raises an exclusion violation (SQLSTATE 23P01, [[Booking server]] handling unverified here); see [[Request Lifecycles]].

## Changing this safely
Changing the `where` status list changes which statuses hold a slot; update [[Availability engine]] together.

## Known gaps
- `stripe_payment_intent`, `payment_status` have no writer found in `lib/` (no billing yet; see [[Placeholder membership]]).
- `status`/`cancelled_at` consistency is not enforced by SQL.
