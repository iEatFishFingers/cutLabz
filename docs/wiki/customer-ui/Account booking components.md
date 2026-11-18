---
area: customer-ui
source: [components/account/bookings/BookingCard.tsx, components/account/bookings/CancelButton.tsx, components/account/bookings/ConfirmDialog.tsx, components/account/bookings/FlashNote.tsx, components/account/bookings/RescheduleForm.tsx, components/account/bookings/ui.ts]
commit: 14ba133
updated: 2026-11-18
---
# Account booking components
**In plain English:** the pieces that make up the appointments list and the reschedule screen: a card per booking, a cancel button with a confirm popup, a one-time message bar, and the reschedule form. They call the server actions; the rules (24 hours etc.) are enforced there. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| File | Kind | Role |
|---|---|---|
| `BookingCard.tsx` | server | card: date, time, barber, services, price or "Free · Member cut", reference, status |
| `CancelButton.tsx` | client | opens `ConfirmDialog`, calls `cancelBookingAction(bookingId)` |
| `ConfirmDialog.tsx` | client | modal: focus trap, Escape closes (not while pending), focus returns to opener |
| `FlashNote.tsx` | client | message from `?notice` / `?cancelled` / `?rescheduled`, then `replaceState("/account")` |
| `RescheduleForm.tsx` | client | reuses `BarberStep` + `DateTimeStep` with reschedule actions |
| `ui.ts` | shared | `BTN_PRIMARY`, `BTN_SECONDARY`, `LABEL`, `LINK`, `FOCUS`, `STATUS_LABEL` ([[Visual style rules]]) |

## Which actions are called
| Component | Action ([[Actions account-bookings]]) | Result handling |
|---|---|---|
| `CancelButton` | `cancelBookingAction` | ok: `router.replace("/account?cancelled=1")`; `error`: show text in dialog; `auth`: to login; `too_late`/`not_found`/`not_active`: `/account?notice=<code>` |
| `RescheduleForm` | `getRescheduleSlotsAction({bookingId,date,barberId})` | passed as `fetchSlots` to `DateTimeStep` |
| `RescheduleForm` | `rescheduleBookingAction({bookingId,date,startMin,barberId})` | ok: `/account?rescheduled=1`; `slot_taken`: clear time, notice, bump `refreshKey`; `auth`: login with `next`; the three stale codes: `/account?notice=`; else error (+ membership link) |

Both use `useTransition` for pending state and wrap in try/catch for network failure.

## BookingCard rules
- Self-serve buttons only when `b.canSelfServe` (computed server-side in [[Customer bookings lib]] via `canSelfServe` from `lib/membership.ts`, [[24-hour rule]]). Otherwise: "Within 24 hours? Contact the shop" and a terms link ([[Route home and terms]]).
- `BookingCard` is a server component but renders client `CancelButton`, a normal server-to-client boundary.

## RescheduleForm details
- Wraps `CatalogProvider`, `ViewerProvider`, `MotionConfig reducedMotion="user"` ([[Booking flow shell]]).
- Draft starts from the booking: same service and add-ons, barber (or `"any"` if that barber no longer exists in the catalog). Service is not changeable. Duration is the original `endMin - startMin`.
- "Now / New" summary; Confirm disabled until date, time and barber chosen. "Keep current time" links back to `/account`.

## Security notes
UI only; ownership, 24-hour cutoff, slot validity re-checked in [[Customer bookings lib]] ([[Trust boundary]]).

## Failure modes
Slot taken between load and submit: notice and refetch. Network error: generic retry text.

## Known gaps
- `ConfirmDialog`'s focus trap is hand-rolled (selector `FOCUSABLE`); only the first `[data-autofocus]` element is focused, nothing happens if none exists (unverified which children set it).
- Outcome-code lists are duplicated in `CancelButton` and `RescheduleForm`.
