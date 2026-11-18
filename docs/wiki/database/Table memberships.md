---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table memberships

**In plain English:** one row is one membership period for one customer, with a start and end date. The database forbids two overlapping periods for the same person, so memberships cannot stack. Customers can see their own; only the server writes. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:164-175 | table + `memberships_no_overlap` |
| supabase/schema.sql:176 | index |
| supabase/schema.sql:177-181 | RLS + policies |

## Columns
| Column | Type / constraint |
|---|---|
| id | uuid PK |
| user_id | uuid not null FK auth.users, `on delete cascade` |
| plan | text not null FK `services(id)` |
| starts_on, ends_on | date; check `ends_on >= starts_on` |
| created_at | timestamptz default now() |

## Rules & invariants
- `memberships_no_overlap` (:171-174): `exclude using gist (user_id =, daterange(starts_on, ends_on, '[]') &&)`; `[]` makes both ends inclusive, so a new period cannot start on the day the old one ends. Concept: [[Membership period]]; app rules in [[Membership rules]].
- Index `memberships_user_idx (user_id, ends_on desc)` for "latest membership" lookups.
- [[Table bookings]]`.membership_id` points here (`on delete set null`) for a [[Member cut]].

## Reads / Writes
| Code | Client | Operation |
|---|---|---|
| lib/customer/memberships.ts:37,93 ([[Customer memberships lib]]) | service role | insert (subscribe), update (cancel) |
| lib/customer/viewer.ts:41 ([[Viewer and session]]) | user session (RLS) | read own |
| scripts/seed-mock.ts:191 ([[Seed mock script]]) | service role | mock rows |

Callers: [[Actions account-membership]]. Granted without payment: [[Placeholder membership]].

## Security notes
Policies: `customer reads own memberships` (select, `user_id = auth.uid()`), `admin all memberships` ([[RLS matrix]]). No customer write policy; the server checks the signed-in user then uses the [[Service-role key]] ([[Trust boundary]]).

## Failure modes
A second overlapping insert fails with an exclusion violation; app should map this to "already a member" (mapping unverified here).

## Changing this safely
Adding statuses (e.g. cancelled) would need the exclusion `where` clause revisited. Keep [[Membership rules]] aligned.

## Known gaps
- `plan` may reference a non-membership service (see [[Table services and addons]]).
- No row is auto-expired; "active" is derived from dates in code.
