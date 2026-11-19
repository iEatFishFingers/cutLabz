---
area: overview
source: [proxy.ts, lib/supabase/admin.ts, lib/supabase/server.ts, lib/customer/viewer.ts, lib/admin/auth.ts, lib/store.ts, lib/booking-server.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Security Model

**In plain English:** who can do what, and where that is checked. The short version: the proxy only nudges people to the right login page; the real checks happen in every server page and action; and the database adds its own row-level rules so that a bug in one layer is caught by the next.

## Trust boundaries
| Boundary | Trusted? | Guard |
|---|---|---|
| Browser -> server | no | validation in lib, [[Trust boundary]] |
| Proxy | optimistic only (`proxy.ts:4-5`) | [[Proxy request gate]], [[Auth gating]] |
| Page / action -> lib | yes after guard | [[requireCustomer]], [[requireAdmin]] |
| Server -> DB | depends on key | [[Anon key]] (RLS) vs [[Service-role key]] (no RLS) |

## Auth model
- Supabase Auth, email + password; sessions in `sb-*-auth-token` cookies managed by `@supabase/ssr` ([[Supabase clients]]).
- Identity is always re-verified with `auth.getUser()` (`lib/customer/viewer.ts:34`, `lib/admin/auth.ts:16`), never trusted from the cookie alone.
- Admin = a row in [[Table admins]] (added by hand). Checked in app ([[Admin auth]]) and in DB (`private.is_admin()`, [[DB functions]]).
- Email links go through [[Route auth-callback]]; redirects pass `safeNext` (open-redirect guard).

## Key handling
| Env var (name only) | Exposure | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | all clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, RLS-limited | session clients, proxy |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (`import "server-only"`) | store, catalog loader, memberships, admin booking insert |
Details: [[Environment and deployment]].

## Which client does what
| Operation | Client | Why |
|---|---|---|
| Customer creates booking | service role | no customer insert policy by design (`supabase/schema.sql:132-134`) |
| Customer lists/cancels/reschedules | service role, filtered by `user_id` (`lib/store.ts:166`) | one code path for memory + DB |
| Customer reads membership in viewer | session (RLS) | `lib/customer/viewer.ts:40` |
| Admin catalog/hours/time-off/status | admin session (RLS + `is_admin`) | [[Admin catalog lib]], [[Admin bookings lib]] |
| Admin creates booking | service role via `insertBooking` | `lib/admin/bookings.ts:211` |

## What the server re-validates
Price, duration, add-ons, barber, date window, notice, slot freedom, membership, limits, 24 h rule, booking ownership: see [[Booking server]], [[Customer bookings lib]], [[Upcoming booking limits]], [[24-hour rule]].

## RLS summary
Public read on catalog tables; no public access to `time_off`, `bookings`, `memberships` except own rows for signed-in users; admins full access. Full grid: [[RLS matrix]], concept: [[Row Level Security]].

## Known weaknesses
Free placeholder memberships, `email_not_confirmed` enumeration, customer sign-out on `/admin`, no app rate limiting, unrestricted admin status transitions: all in [[Open issues]].

[[Architecture Overview]] | [[00 Index]]

## Changes since this note was written (2026-11-19)
Account deletion, the database cap guard, audit stamps on every status change, stale-state checks on admin and reschedule actions, and idempotency keys were added. The rate-limiting gap (issue 9) and the account-exists message (issue 3) remain. The QA record is in `docs/qa/2026-11-18-qa-and-month-simulation.md`.
