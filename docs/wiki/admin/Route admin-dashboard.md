---
area: admin
source: [app/admin/(panel)/page.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route admin-dashboard
**In plain English:** `/admin` is the calendar. It shows one day (a timeline per barber) or one week (a card per day) with bookings, closed hours and time off. Date and view come from the URL (`?date=YYYY-MM-DD&view=day|week`).

## Files
| path | role |
|---|---|
| `app/admin/(panel)/page.tsx` | page; `Calendar` async component inside Suspense (page.tsx:93-103) |

## Flow (page.tsx:17-34)
1. `requireAdmin()` gives `session.db` (admin's RLS client).
2. `shopNow()` ([[Time model]]) gives today; `parseDateParam`/`parseView` fall back to today / `day` ([[Admin bookings lib]]).
3. `loadAdminDirectory` (all barbers incl. inactive, names, hours, time off), then `listAdminBookings` for the day or Mon-Sun week.
4. Shown barbers = active ones plus inactive ones that still have a booking in range.
5. Day view: `NextUp` (today only), `DayBoard`, or "Closed. No barber is working this day." if no hours/bookings ([[Admin board components]]).

## Reads
Tables via admin RLS: `barbers`, `services`, `addons`, `availability`, `time_off`, `bookings` ([[Table bookings]], [[Table availability]], [[Table time_off]]). Not cached: runs per request.

## Security notes
Page guard `requireAdmin()` ([[Admin auth]]); reads depend on the `admin all bookings` policy ([[RLS matrix]]).

## Failure modes
A failed query throws `"Could not load calendar data."` / `"Could not load bookings."` to the error boundary ([[Admin panel shell]]).

## Known gaps
- Week view shows only pending/confirmed bookings (`isActiveStatus`), so cancelled/completed/no-show are visible only on the day view.
- A bad `?date` silently falls back to today.

Links: [[Admin hub]], [[Booking window]], [[00 Index]].
