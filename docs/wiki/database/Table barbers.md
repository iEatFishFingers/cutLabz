---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table barbers

**In plain English:** one row per barber who can take appointments. Setting `active = false` hides a barber from customers without deleting their booking history. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:10-16 | table definition |
| supabase/schema.sql:115, 121 | policies |
| supabase/schema.sql:191-194 | seed rows |

## Columns
| Column | Type | Notes |
|---|---|---|
| id | text PK | slug like `barber-1`, not a uuid |
| name | text not null | |
| role | text not null | default `'Barber'` |
| active | boolean not null | default true |
| user_id | uuid null | FK `auth.users(id)` `on delete set null`; comment: "links a barber to an admin login" |

## Reads / Writes
| Code | Client | Operation |
|---|---|---|
| lib/catalog-db.ts:44 ([[Catalog loader]]) | service role | select active barbers |
| lib/admin/bookings.ts:36 ([[Admin bookings lib]]) | admin session | select all incl. inactive |
| app/admin/(panel)/barbers/page.tsx:12, actions.ts:41-77 ([[Route admin-catalog]], [[Admin catalog lib]]) | admin session (RLS) | list, insert, update |
| app/admin/(panel)/hours, time-off ([[Route admin-schedule]]) | admin session | list/validate id |

## Rules & invariants
- Referenced by [[Table availability]] and [[Table time_off]] with `on delete cascade`; by [[Table bookings]] with no cascade (default restrict), so a barber with bookings cannot be hard-deleted (schema.sql:62).
- Policies: public `select using (true)` (:115); `admin all` for authenticated admins (:121). See [[RLS matrix]].

## Security notes
Anyone, including anon, can read every barber row, including inactive ones and `user_id` ([[Row Level Security]]). Writes need [[DB functions#private.is_admin]] true.

## Changing this safely
New columns exposed to the browser become public via the select policy. Update the seed (schema.sql:191) and [[Catalog static]] together.

## Known gaps
- Nothing in `lib/` or `app/` reads `barbers.user_id` (grep of selects shows only id,name,role,active); how it is meant to be used is unverified.
