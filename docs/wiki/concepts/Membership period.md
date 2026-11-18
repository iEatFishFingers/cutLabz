---
area: concepts
source: [lib/membership.ts, lib/customer/memberships.ts, lib/customer/viewer.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Membership period

**In plain English:** a membership is a row with a start date and an end date, 30 days long including the first day. A person can never have two memberships covering the same day; the database enforces that.

| Rule | Code |
|---|---|
| Length `MEMBERSHIP_DAYS = 30`; `startsOn = today`, `endsOn = today + 29` (both inclusive) | `lib/membership.ts:14,22-24` |
| Active on a date: `startsOn <= date <= endsOn` | `isActiveOn`, `lib/membership.ts:26` |
| No overlap per user: `memberships_no_overlap` exclusion on `daterange(starts_on, ends_on, '[]')` | `supabase/schema.sql:171-174` |
| Overlap error `23P01`/`23505` -> "You already have an active membership." | `lib/customer/memberships.ts:104` |
| Viewer exposes only a membership active today | `lib/customer/viewer.ts:40-55` |

Consequences:
- Renewal is only possible after the current period ends (a new period always starts "today").
- No cancel-membership code path exists (grep of `lib/`, `app/`); periods simply expire. RLS policy "admin all memberships" (`supabase/schema.sql:180`) would allow admin edits, but no admin UI does so.
- The constraint has no status filter, unlike bookings ([[Double-booking guard]]).

Related: [[Table memberships]], [[Placeholder membership]], [[Member cut]], [[Customer memberships lib]], [[Membership rules]], [[Time model]], [[00 Index]].
