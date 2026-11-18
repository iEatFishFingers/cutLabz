---
area: admin
source: [app/admin/**, components/admin/**, lib/admin/**]
commit: 14ba133
updated: 2026-11-18
---
# Admin hub
**In plain English:** the back office at `/admin` where shop staff see the day/week calendar, change booking status, add walk-in bookings and edit barbers, services, opening hours and time off. Only users listed in the `admins` table get in. Everything is server-checked on every call, not just hidden in the UI.

## Notes in this area
| Note | Covers |
|---|---|
| [[Route admin-login]] | `/admin/login`, sign-in and sign-out actions |
| [[Admin panel shell]] | `(panel)` layout, header, nav, error boundary |
| [[Route admin-dashboard]] | `/admin` day/week calendar page |
| [[Admin board components]] | DayBoard, WeekView, DateNav, NextUp, BookingDetail |
| [[Route admin-new-booking]] | `/admin/bookings/new` walk-in form |
| [[Actions admin-bookings]] | status change + create actions |
| [[Admin bookings lib]] | calendar queries, validation, pure helpers |
| [[Admin catalog lib]] | pure validators/slugs/money for settings |
| [[Route admin-catalog]] | `/admin/barbers`, `/admin/services` |
| [[Route admin-schedule]] | `/admin/hours`, `/admin/time-off` |
| [[Admin settings components]] | forms, editors, revalidate helper |

## How it fits together
| Layer | Mechanism |
|---|---|
| Route gate | [[Proxy request gate]] / [[Auth gating]] redirect unauthenticated `/admin/*` to login (proxy.ts:8-18) |
| Page/layout gate | `requireAdmin()` redirects ([[Admin auth]], [[requireAdmin]]) |
| Action gate | `requireAdminAction()` throws `Unauthorized` |
| Data access | admin's own session client = [[Anon key]] + [[Row Level Security]] (`private.is_admin()` policies, see [[RLS matrix]]); only walk-in creation uses the [[Service-role key]] (via [[Store Supabase]]) |
| Public cache | catalog edits call `revalidateTag("catalog","max")` so `/book` refreshes ([[Cache Components]]) |

## Cross-cutting findings
- All 7 mutating admin actions (plus `signIn`) are guarded by `requireAdminAction()` or the sign-in admin check. No unguarded admin action found. `signOut` is intentionally unguarded.
- Booking status can move between any two of the 5 statuses; no transition rules server-side ([[Actions admin-bookings]]).
- See [[Security Model]], [[Request Lifecycles]], [[Admin auth]], [[00 Index]].

## Known gaps
See each note; summary in [[Open issues]].
