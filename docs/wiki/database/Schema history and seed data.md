---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Schema history and seed data

**In plain English:** `schema.sql` is one file that was applied to Supabase in four steps (migrations). It reads top to bottom in that order, with the newest changes (memberships) added near the end. It finishes by inserting the real barbers, services, add-ons and opening hours. Part of the [[Database hub]]; back to [[00 Index]].

## Statement order
| Lines | Step | Notes |
|---|---|---|
| 1-4 | header | project ref, migration names, shop-local time comment ([[Time model]]) |
| 6-7 | `extensions` schema + `btree_gist` | required so `=` on text/uuid/date can sit in a gist exclusion ([[Double-booking guard]]) |
| 9-53 | catalog tables | [[Table barbers]], [[Table services and addons]], [[Table availability]], [[Table time_off]] |
| 55-85 | [[Table bookings]] + indexes | with `no_overlap` |
| 87-103 | [[Table admins]], `private` schema, `is_admin()` | [[DB functions]] |
| 105-136 | RLS enable + policies | "security_hardening" era ([[RLS matrix]]) |
| 138-157 | `replace_availability` | "replace_availability_fn" |
| 159-187 | [[Table memberships]], alter bookings | "customer_accounts_memberships" |
| 189-215 | seed | below |

Migration names stated in the file: `init_cutlabz_schema`, `security_hardening`, `replace_availability_fn` (:2) and `customer_accounts_memberships` (:160). There is no `supabase/migrations/` folder in the repo (unverified beyond reading schema.sql); the live DB is the source of record.

## Seed rows (idempotent)
| Table | Rows | Guard |
|---|---|---|
| barbers | `barber-1` Wayne Graham, `barber-2` Ayaan Ali | `on conflict (id) do nothing` |
| services | core, plus, premium (membership, 30 min, 0p); haircut 2000p, haircut-beard 2500p (one-off, 30 min) | same |
| addons | hot-towel, wash-dry, mask-steam, filler, 500p each, 0 extra min | same |
| availability | each barber, weekdays 2-6, 660-1260 (Tue-Sat 11:00-21:00) | `where not exists` per barber+weekday |

Seed mirrors `seedCatalog` in [[Catalog static]]; comment notes per-barber hours are "still to be confirmed" (:211). Local fake data is separate: [[Seed mock script]].

## How to apply
Run the file in the Supabase SQL editor or as a migration. Tables, indexes, columns and seeds are re-runnable; the `create policy` lines are not (they fail if the policy exists). Environment wiring: [[Environment and deployment]].

## Security notes
The file contains no secrets (project ref only in a comment).

## Known gaps
- Header lists 3 migrations, a 4th is named at :160.
- Non-idempotent policies (:115-136, :178-181).
- Missing constraints noted per table: no `(barber_id, weekday)` uniqueness ([[Table availability]]), no time-off overlap guard ([[Table time_off]]), `memberships.plan` not limited to membership kind ([[Table memberships]]).
- Live schema may contain objects not in the file (see [[Database hub]]).

## Changes since this note was written (2026-11-19)
Migrations applied after this note: `customer_flow_hardening`, `admin_audit_and_walkin_idempotency`, `booking_contacted_marker`. All are mirrored in `supabase/schema.sql`. The example data seed now stamps the audit columns too.
