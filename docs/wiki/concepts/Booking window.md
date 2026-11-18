---
area: concepts
source: [lib/catalog.ts, lib/booking-shared.ts, lib/availability.ts, lib/booking-server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Booking window

**In plain English:** customers can book from today up to four weeks ahead, never less than one hour before the start, and only on days the shop is open. Members booking a free cut are further limited to dates inside their current membership.

| Rule | Value | Code |
|---|---|---|
| Window length | `BOOKING_WINDOW_DAYS = 28` (today + 27 days) | `lib/catalog.ts:66`, `lib/booking-shared.ts:158-165` |
| Minimum notice | `MIN_NOTICE_MIN = 60` | `lib/catalog.ts:67`, enforced `lib/availability.ts:46` |
| Open day | at least one barber has hours that weekday | `isOpenDay`, `lib/booking-shared.ts:167` |
| Member cut | date must be `<= membership.endsOn` | `memberCanBookOn`, `lib/membership.ts:30` ([[Member cut]]) |

## Where it is enforced
1. Client shows only `windowDates(today)` in the date picker ([[Booking steps]]) - convenience only.
2. Server `getSlots` returns `[]` outside the window (`lib/booking-server.ts:155`).
3. Server `createBooking` re-checks window, open day and that the start is a valid slot (`lib/booking-server.ts:217-225`) - this is the real guard ([[Trust boundary]]).
4. Reschedule uses the same checks via [[Customer bookings lib]].

Related: [[Time model]], [[Slot computation]], [[Booking server]], [[Catalog static]], [[00 Index]].
