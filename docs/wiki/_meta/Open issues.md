---
area: meta
source: [lib/, app/, components/, proxy.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-19
---
# Open issues

**In plain English:** bugs, risks and inconsistencies found while documenting. The table below was written before the QA rounds; see the status section first for what has since been fixed. Severity is the overseer's judgement: High = security/money, Med = wrong behaviour possible, Low = tidiness. Back to [[00 Index]] | [[Security Model]].

## Status on 2026-11-19
Three fix rounds followed the persona QA and the simulated month (commits `104cd85`, `484909d`, `a9871d1`; record in `docs/qa/2026-11-18-qa-and-month-simulation.md`).

| # | Status | How |
|---|---|---|
| 2 | Fixed | Customer opening `/admin` is no longer signed out |
| 5 | Fixed | Status changes are state-checked, stale-checked and audit-stamped |
| 6 | Partly | Admin walk-ins are idempotent and capped by date limits; "override hours" still skips time off by design |
| 7 | Partly | Time off is capped at 366 days and warns about overlapping bookings; no past-date block |
| 10 | Fixed | Database trigger `bookings_enforce_cap` |
| 20 | Fixed | `supabase/schema.sql` mirrors all later migrations |
| 30 | Fixed | Cancel and resume membership |
| 1, 3, 4, 8, 9 | Open | Placeholder memberships, account-exists message, admin login wording, no current-password check, no rate limiting |
| Others | Not rechecked | Low-severity items below were not re-verified after the fix rounds |

New open items from the QA rounds (owner decisions, not bugs): free-cut allowance and missed-cut policy, no-show and late-cancel fees, notifications, payments. See `status.md`.

## Security / business
| # | Sev | Issue | Evidence | Note |
|---|---|---|---|---|
| 1 | High | Memberships are free and self-serve; any account can join, again every 30 days | `lib/customer/memberships.ts:2,68-108` | [[Placeholder membership]] |
| 2 | Med | Signed-in customer who opens `/admin` is signed out (admin check calls `signOut()`) | `lib/admin/auth.ts:25-31` | [[requireAdmin]] |
| 3 | Med | `email_not_confirmed` message reveals that an account exists | `components/account/auth/actions.ts:67` | [[Auth forms and actions]] |
| 4 | Low | Admin login says "doesn't have admin access" for valid non-admin credentials | `app/admin/login/actions.ts:38` | [[Route admin-login]] |
| 5 | Med | Admin status changes accept any-to-any transition server-side | `lib/admin/bookings.ts:112` | [[Admin bookings lib]] |
| 6 | Med | Admin new booking skips past-date/window checks; "override hours" also skips time off | `lib/admin/bookings.ts` (createAdminBooking) | [[Route admin-new-booking]] |
| 7 | Low | `addTimeOff` has no past-date or overlap check | `app/admin/(panel)/time-off/actions.ts` | [[Route admin-schedule]] |
| 8 | Low | `changePassword` does not ask for the current password | `components/account/settings/actions.ts` | [[Route account-settings]] |
| 9 | Low | No app-level rate limiting on auth or booking (relies on Supabase, unverified) | grep | [[Security Model]] |

## Correctness
| # | Sev | Issue | Evidence | Note |
|---|---|---|---|---|
| 10 | Med | 3-booking cap has no race guard (member-cut cap does) | `lib/booking-server.ts:210-215` vs `:255-271` | [[Upcoming booking limits]] |
| 11 | Med | `hasSupabaseEnv()` ignores the anon key; missing anon key -> viewer/admin checks throw (500) instead of "signed out", and production guards don't catch it | `lib/supabase/env.ts:2-7`, `lib/supabase/server.ts:10` | [[Supabase clients]] |
| 12 | Low | Viewer ignores membership query errors -> member silently treated as non-member | `lib/customer/viewer.ts:40-48` | [[Viewer and session]] |
| 13 | Low | Limit errors are checked before window/open-day, so a limit message can mask an invalid date | `lib/booking-server.ts:199-220` | [[Booking server]] |
| 14 | Low | Client matches server error strings literally (`STALE_MESSAGES`); rewording breaks the reload prompt | `components/booking/BookingFlow.tsx` | [[Booking flow shell]] |
| 15 | Low | Reschedule page loads catalog uncached (no `catalog` tag) | `app/account/bookings/[id]/reschedule/page.tsx:50` | [[Route account-reschedule]] |
| 16 | Low | Admin catalog edits use `revalidateTag(..., "max")` (stale-while-revalidate), so /book may show the old catalog once | `components/admin/settings/revalidate.ts:8` | [[Cache Components]] |
| 17 | Low | Future-bookings warning query capped at 5000 rows | `components/admin/settings/future-bookings.ts:24` | [[Admin settings components]] |
| 18 | Low | In-memory store returns PII in day lists (Supabase version blanks it) | `lib/store-memory.ts:23` | [[Store memory fallback]] |

## Schema
| # | Sev | Issue | Evidence | Note |
|---|---|---|---|---|
| 19 | Low | `reference` column default (8 hex, no `CL-`) differs from app format `CL-` + 6 hex | `supabase/schema.sql:58`, `lib/store.ts:123` | [[Booking reference]] |
| 20 | Low | Header lists 3 migrations; a 4th is named later | `supabase/schema.sql:2,160` | [[Schema history and seed data]] |
| 21 | Low | `create policy` statements not idempotent; re-running the file errors | `supabase/schema.sql:115-181` | [[RLS matrix]] |
| 22 | Low | No unique/overlap guard on `availability` or `time_off`; `memberships.plan` not restricted to membership-kind services; `addons.extra_min` no `>= 0` check | `supabase/schema.sql:32,37-53,167` | [[Table availability]] |
| 23 | Low | `payment_status`, `stripe_payment_intent`, `barbers.user_id` have no writer in app code | `supabase/schema.sql:15,71-72` | [[Table bookings]] |

## Tidiness / drift
| # | Issue | Evidence | Note |
|---|---|---|---|
| 24 | Plan prices hard-coded in Home separately from `MEMBERSHIP_PLANS` | `components/Home.tsx:221`, `lib/membership.ts:63` | [[Route home and terms]] |
| 25 | `ACCOUNT_URL`, `MEMBERSHIP_URL`, `LOGIN_BOOK_URL` exported but never imported | `lib/links.ts` | [[Site nav and links]] |
| 26 | `app/globals.css` and `README.md` are create-next-app defaults | `app/globals.css:27-30` | [[Root layout and styles]] |
| 27 | Duplicated helpers: reference derivation, `dayNum`, `toMembership`, window checks | `lib/booking-server.ts:273`, `lib/membership.ts:34`, `lib/customer/viewer.ts:21` | [[Booking shared]] |
| 28 | "24 hours" text hard-coded instead of derived from `SELF_SERVE_NOTICE_MIN` | `lib/customer/bookings.ts:55-58` | [[24-hour rule]] |
| 29 | No tests for proxy, server actions, components or RLS | `tests/` | [[Test suite overview]] |
| 30 | No cancel-membership flow (memberships simply lapse) | `lib/customer/memberships.ts` | [[Membership period]] |
