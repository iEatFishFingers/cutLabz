---
area: accounts
source: [lib/customer/memberships.ts]
commit: 14ba133
updated: 2026-11-18
---
# Customer memberships lib

**In plain English:** this is where a customer "joins" a plan. No card is charged: it just writes a 30-day membership row for that user. It uses the all-powerful database key, so it carefully limits every query to the one user. Hub: [[Accounts hub]]; [[00 Index]].

## Public API (`lib/customer/memberships.ts`)
| fn | line | behaviour |
|---|---|---|
| `getMembershipOverview(viewer, today)` | 49 | `{current, past[]}`; current = row active today |
| `subscribeToPlan(viewer, planId, today)` | 68 | validates, inserts, returns `SubscribeResult` |

## Reads / Writes
| Op | Table | Client |
|---|---|---|
| list (`:36-41`) | `memberships` where `user_id`, order `ends_on` desc, limit 50 | [[Supabase clients|admin client]] ([[Service-role key]]) |
| insert (`:92-101`) | `memberships` (`user_id, plan, starts_on, ends_on`) | admin client |

## Rules & invariants
- Plan must exist in the catalog with `kind === "membership"` (`:76`), see [[Catalog loader]].
- Period from `membershipPeriod(today)`: 30 days inclusive ([[Membership rules]], [[Membership period]]).
- Overlap: Postgres exclusion violation `23P01` (or `23505`) maps to `already_member` (`:104`); backed by `memberships_no_overlap` in [[Table memberships]]. No stacking.
- No payment anywhere: [[Placeholder membership]]. Prices in `MEMBERSHIP_PLANS` are display-only.
- Dev fallback: in-memory array on `globalThis.__cutlabzMemberships` when Supabase env is missing and `NODE_ENV !== "production"`; in production it throws instead (`:21-27`). Compare [[Store memory fallback]].

## Depends on / Used by
Depends: [[Catalog loader]], [[Membership rules]], [[Supabase clients]]. Used by: [[Actions account-membership]], [[Route account-membership]].

## Security notes
Service-role insert bypasses [[Row Level Security]]; safety rests on `viewer.userId` coming from [[Viewer and session]] and never from the client. See [[Trust boundary]].

## Failure modes
List error -> throws "Could not load memberships." Insert error other than overlap -> generic `error` result, logged server-side only.

## Tests covering it
[[Tests unit]] (customer suite, memory backend); [[Tests integration]].

## Changing this safely
Keep the user scoping on every query. When real payments arrive, this insert should move behind a payment webhook.

## Known gaps
- No cancel function exists (the registry scope mentions "cancel"; code only has overview + subscribe). Customers cannot end a membership themselves; it simply lapses after 30 days.
- `upcomingStart?: never` in the overview return type is dead (`:52`).
- Memory-fallback clash check compares to the new period only, fine for 30-day rows.

## Changes since this note was written (2026-11-19)
Added `cancelMembership` (end of period via `cancelled_at`) and `resumeMembership`. Issue 30 in [[Open issues]] (no cancel flow) is closed. Joining is still a free placeholder, see [[Placeholder membership]].
