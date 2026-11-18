---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table availability

**In plain English:** each row says "this barber works on this weekday from this time to this time". A barber with no row for a weekday is off that day. Times are minutes after midnight, in shop-local time. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:36-43 | table |
| supabase/schema.sql:118, 124 | policies |
| supabase/schema.sql:138-157 | `replace_availability` ([[DB functions]]) |
| supabase/schema.sql:211-215 | seed |

## Columns
| Column | Type / constraint |
|---|---|
| id | bigint identity PK |
| barber_id | text FK [[Table barbers]], `on delete cascade` |
| weekday | int, check 0-6 (0=Sunday, 6=Saturday) |
| open_min | int, check 0-1440 |
| close_min | int, check 0-1440 and `> open_min` |

## Reads / Writes
| Code | Operation |
|---|---|
| lib/catalog-db.ts:47 ([[Catalog loader]]) | service role, all rows |
| lib/admin/bookings.ts:39 ([[Admin bookings lib]]) | admin session |
| app/admin/(panel)/hours/page.tsx:13, actions.ts:54 ([[Route admin-schedule]]) | read; write via `rpc('replace_availability')` |
| app/admin/(panel)/barbers/page.tsx:13 | counts hours per barber |
| scripts/seed-mock.ts ([[Seed mock script]]) | mock hours |

## Rules & invariants
- Seed: `open_min=660` (11:00), `close_min=1260` (21:00), weekdays 2-6 (Tue-Sat) for each barber (schema.sql:213-215).
- Consumed by [[Slot computation]] and [[Availability engine]] under the [[Time model]].
- Swapped atomically per barber by the RPC (delete then insert in one function).

## Security notes
Public read (:118) so the booking page can load hours; writes admin-only ([[RLS matrix]]).

## Failure modes
Zero rows for a barber means no slots at all. A hand-edited row with `close_min` in 1..1440 passes the check even if it is not on a 15-min grid; grid logic lives in code, not SQL.

## Changing this safely
Edit hours via /admin/hours so the RPC keeps the swap atomic. See [[Admin catalog lib]].

## Known gaps
- No unique `(barber_id, weekday)` and no overlap constraint: duplicate or overlapping rows for one weekday are allowed by SQL.
