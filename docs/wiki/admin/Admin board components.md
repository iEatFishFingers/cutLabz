---
area: admin
source: [components/admin/bookings/DayBoard.tsx, components/admin/bookings/WeekView.tsx, components/admin/bookings/DateNav.tsx, components/admin/bookings/NextUp.tsx, components/admin/bookings/BookingDetail.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Admin board components
**In plain English:** the pieces that draw the calendar. DayBoard is a vertical timeline per barber; click an empty slot to start a new booking, click a booking to open a details panel with status buttons.

## Files
| component | kind | role |
|---|---|---|
| `DayBoard.tsx` | client | column per barber (tabs on mobile), 1.5 px/min (`PX`, line 24), lanes for overlaps, closed/time-off overlays, dialog with Esc + Tab trap |
| `BookingDetail.tsx` | client | details + status buttons, calls `setBookingStatusAction` |
| `WeekView.tsx` | no hooks | 7 day cards, per-barber counts, links to day view |
| `DateNav.tsx` | client | Prev/Today/Next (step 1 or 7 days), date picker, Day/Week, "New booking" link |
| `NextUp.tsx` | no hooks | next confirmed booking per barber from now |

## Behaviour
- Empty-click goes to `/admin/bookings/new?date&barber&start`, start snapped to 15 min (`STEP`) (DayBoard.tsx:50).
- Status buttons in BookingDetail: pending shows Confirm; not completed/cancelled shows Mark completed; not no_show/cancelled shows Mark no-show; cancelled/completed/no_show show Reopen (sets `confirmed`); not cancelled shows Cancel with a confirm step.
- Non-active statuses render at 50% opacity, name struck through.

## Security notes
Buttons are UX only; the server re-validates in [[Actions admin-bookings]] (admin guard, UUID id, status whitelist). Phone/email render as `tel:`/`mailto:` links (phone stripped to digits and `+`).

## Depends on / Used by
Helpers in [[Admin bookings lib]] (`assignLanes`, `timelineBounds`, `closedSegments`). Used by [[Route admin-dashboard]]. Concepts: [[Double-booking guard]] (Reopen can hit it), [[Time model]], [[Request Lifecycles#Admin status change]]. Hub [[Admin hub]], [[00 Index]].

## Failure modes
Reopen onto an occupied slot returns "That barber already has a booking at that time.", shown in the panel.

## Known gaps
- Payment status is displayed but cannot be changed anywhere in the admin UI.
