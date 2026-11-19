---
area: admin
source: [lib/admin/bookings.ts, lib/admin/bookings-shared.ts]
commit: 14ba133
updated: 2026-11-18
---
# Admin bookings lib
**In plain English:** the code behind the calendar: loading bookings, changing status, creating walk-ins (`bookings.ts`, server-only), plus pure helpers for laying out the timeline (`bookings-shared.ts`, safe for the browser).

## Files
| path | role |
|---|---|
| `lib/admin/bookings.ts` | `server-only`; I/O + validation; takes the admin session's `db` |
| `lib/admin/bookings-shared.ts` | pure types and helpers, no I/O or clock |

## Public API
| export | note |
|---|---|
| `loadAdminDirectory(db)` | all barbers (incl. inactive), service/add-on names, hours, time off; active first then by name |
| `listAdminBookings(db, from, to, dir)` | inclusive range by `start_min`; removed names become "Removed service"/"Removed add-on"; unknown status becomes `"unknown"` |
| `changeBookingStatus(session, id, status)` | see [[Actions admin-bookings]] |
| `createAdminBooking(session, input, catalog)` | walk-in create; session unused (`_session`) |
| `STATUSES`, `isStatus`, `isActiveStatus` | active = pending/confirmed, matches the constraint ([[Double-booking guard]]) |
| `STEP=15`, `ROW_MIN=30` | start-time step; timeline rounding (bookings-shared.ts:57-58) |
| `weekDates`, `timelineBounds`, `closedSegments`, `assignLanes`, `startSteps`, `nextUp`, `nextStep`, `initials`, `UUID_RE` | layout/selection helpers |

## Rules & invariants
- `createAdminBooking` order: barber, service, add-ons, date, start, details, quote, end <= 1440, then hours/time-off unless `overrideHours === true`, then `insertBooking`. Customers get similar checks in [[Booking server]]; [[Booking shared]] supplies `quote`, `LIMITS`, `isValidDateString`.
- `COLS` select list excludes `user_id`/`membership_id` (bookings.ts:23).
- Reference is rebuilt as `CL-` + first 6 hex of id, duplicating `insertBooking` ([[Booking reference]]).

## Security notes
Reads use the admin's [[Anon key]] session so [[Row Level Security]] still applies; `server-only` keeps it out of client bundles.

## Failure modes
Query error throws generic `"Could not load..."`; `23P01` mapped to a friendly message; `insertBooking` returning `"conflict"` gives "That barber already has a booking at that time."

## Known gaps
- Reference derivation duplicated (drift risk).
- `listAdminBookings` has no row limit (at most one week).

Links: [[Admin board components]], [[Route admin-dashboard]], [[Admin hub]], [[Time model]], [[00 Index]].

## Changes since this note was written (2026-11-19)
Status changes go through `changeBookingStatus(session, id, status, expected)`: the allowed moves depend on the current state and whether the cut has started (`allowedStatusChanges`), a stale view returns "This booking changed. Refresh and try again.", and each change is stamped with who and when. Added `searchAdminBookings` (returns `{bookings, truncated}`), `getAttentionItems` (clashes in the next 28 days, unresolved past bookings from the last 45 days, shop-cancelled customers to contact from the last 14 days), and walk-in idempotency. Dates are clamped to 2000 to 2100. Issue 5 in [[Open issues]] is closed.
