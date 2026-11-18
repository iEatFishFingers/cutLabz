---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table time_off

**In plain English:** date ranges when a barber is away (holiday, sickness). Customers never see why: the `reason` text is private, so this is the one catalog table with no public read policy. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:45-53 | table and comment |
| supabase/schema.sql:125 | only policy (admin all) |

## Columns
| Column | Type / constraint |
|---|---|
| id | bigint identity PK |
| barber_id | text FK [[Table barbers]], `on delete cascade` |
| start_date, end_date | date; check `end_date >= start_date` (inclusive range) |
| reason | text, nullable, private |

## Reads / Writes
| Code | Client | Operation |
|---|---|---|
| lib/catalog-db.ts:48 ([[Catalog loader]]) | service role | select `barber_id,start_date,end_date` only (no reason) |
| lib/admin/bookings.ts:40 ([[Admin bookings lib]]) | admin session | same columns |
| app/admin/(panel)/time-off/page.tsx:18, actions.ts:41,78 ([[Route admin-schedule]]) | admin session | list, insert, delete |
| actions.ts:56 | admin session | reads [[Table bookings]] to warn about clashes |

## Rules & invariants
- Anon and non-admin authenticated users get zero rows: RLS is on, only `admin all time_off` exists ([[RLS matrix]]).
- The server exposes only dates: feeds [[Slot computation]] / [[Availability engine]].

## Security notes
This is the reference example of "deliberately no public policy" ([[Row Level Security]], [[Service-role key]]). Never add a `select using (true)` policy here.

## Failure modes
Time off added after bookings exist does not cancel them; the admin action only checks for existing bookings (time-off/actions.ts:56, behaviour unverified beyond the query).

## Changing this safely
If you expose `reason` to a new feature, do it server-side with the admin client and select explicit columns.

## Known gaps
- No overlap constraint: overlapping time-off ranges for one barber are allowed.
