---
area: customer-ui
source: [app/account/page.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route account
**In plain English:** `/account` is the customer's appointments page: upcoming bookings with Reschedule and Cancel, and a folded list of past and cancelled ones. A one-time green or red message appears after a cancel or reschedule. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/account/page.tsx` | async server page (`AppointmentsPage`) |
| `app/account/layout.tsx` | wraps in Suspense + shell, see [[Account shell and nav]] and [[Route account-settings]] |

## Flow
1. `await searchParams`, then `requireCustomer("/account")` ([[requireCustomer]], [[Viewer and session]]).
2. `listMyBookings(viewer, shopNow())` returns `{upcoming, past}` ([[Customer bookings lib]]).
3. Renders `BookingCard` per booking ([[Account booking components]]); past ones inside `<details>` "Past and cancelled (n)".
4. Empty state links to `BOOK_URL` ([[Site nav and links]]).

## Flash messages
Query params map to `FlashNote` kinds: `?cancelled=1`, `?rescheduled=1`, or `?notice=` one of `cancelled, rescheduled, too_late, not_found, not_active` (`page.tsx:14`; whitelisted `FLASH` set, so arbitrary text cannot be injected). `FlashNote` then rewrites the URL to `/account` with `history.replaceState`. Producers: [[Actions account-bookings]] flows via `CancelButton` and `RescheduleForm`.

## Security notes
Authenticated and `robots: noindex`. Only the viewer's own bookings are listed (filtering is in the lib / [[Row Level Security]], not this page). Flash input is whitelisted.

## Failure modes
Signed-out: `requireCustomer` redirects to login with `next=/account`. DB error: bubbles to Next's default error handling (no `error.tsx` under `/account`; unverified fallback).

## Tests covering it
See [[Tests unit]] (customer suite covers the lib, not this page).

## Changing this safely
New flash kinds need an entry in both `FLASH` here and `MESSAGES` in `FlashNote.tsx`.

## Known gaps
- Duplicated flash-kind lists in two files.
- No `app/account/error.tsx` found.
