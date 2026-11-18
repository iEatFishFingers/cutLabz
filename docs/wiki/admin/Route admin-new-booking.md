---
area: admin
source: [app/admin/(panel)/bookings/new/page.tsx, components/admin/bookings/NewBookingForm.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route admin-new-booking
**In plain English:** a form for staff to add a booking on a customer's behalf (walk-in or phone). It can be pre-filled from a calendar click. Staff can tick "Override hours" to book outside working hours or on time off.

## Files
| path | role |
|---|---|
| `bookings/new/page.tsx` | `requireAdmin()`, `loadCatalog()` ([[Catalog loader]]), parses `?date`, `?barber`, `?start` (1-4 digits only) |
| `NewBookingForm.tsx` | client; `useActionState(createBookingAction)`; start-time `<select>` from `startSteps` (15-min step) |

## Behaviour
- Services, add-ons and barbers come from the public catalog loader ([[Catalog loader]]); whether inactive ones are filtered out is unverified here.
- With override ticked the UI offers `OVERRIDE_WINDOW` 06:00-24:00 (NewBookingForm.tsx:27); the server makes the real decision.
- Success panel shows the reference `CL-XXXXXX` ([[Booking reference]]) with links to the day view or "add another".

## Security notes
Same guard and validation as any admin write: [[Actions admin-bookings]]. The booking is inserted with the [[Service-role key]] after the admin check.

## Failure modes
Server errors ("Choose a barber.", overlap, outside hours...) come back in `state` and render inline.

## Known gaps
- Past dates are not blocked server-side ([[Actions admin-bookings]]).
- A `walkIn` checkbox state exists in the form; its effect was not verified (unverified).

Depends on [[Booking shared]] (`quote`, `LIMITS`), [[Admin bookings lib]]. Hub [[Admin hub]], [[Route admin-dashboard]], [[00 Index]].
