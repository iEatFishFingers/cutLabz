---
area: accounts
source: [lib/customer/bookings.ts]
commit: 14ba133
updated: 2026-11-18
---
# Customer bookings lib

**In plain English:** the rules for a customer managing their own bookings: list them, cancel one, find new times, move one. Each function re-checks everything (who owns it, is it still open, is it at least 24 hours away) because the browser can't be trusted. Price and length never change on a reschedule. Hub: [[Accounts hub]]; [[00 Index]].

## Public API (`lib/customer/bookings.ts`)
| fn | line | returns |
|---|---|---|
| `listMyBookings(viewer, now)` | 87 | `{upcoming, past}`; up to 100 rows loaded, past capped at 20 (`:61`) |
| `cancelMyBooking(viewer, id, now)` | 115 | `CancelResult` codes `not_found/too_late/not_active/error` |
| `getRescheduleSlots(viewer, input, now)` | 150 | `SlotsResult` (free start times) |
| `rescheduleMyBooking(viewer, input, now)` | 205 | `RescheduleResult` |
| `TOO_LATE_MESSAGE` | 55 | "Cancellations within 24 hours aren't available online..." |

## Rules & invariants
- **Upcoming** = status `pending|confirmed` and not started (`:96-97`); sorted soonest first; past newest first.
- `canSelfServe` flag on each card = active AND [[24-hour rule]] (`:82`, rule in [[Membership rules]]).
- Cancel: id string <= 64 chars -> own booking via `getBookingForUser` -> active -> `canSelfServe` -> `cancelBooking` (`:115-130`).
- Reschedule `prepare()` (`:137`): the 24h notice is measured against the ORIGINAL start (`:144`).
- Reschedule steps (`:205-264`): shape checks -> member-cut check via `membershipBlock` if the booking is a [[Member cut]] -> `isInWindow` ([[Booking window]]) -> open day -> time must be in [[Slot computation|computeSlots]] output -> recompute excluding this booking's own old slot -> try `orderCandidates` barbers via `rescheduleBookingRow`; `"conflict"` tries next barber; none left -> `slot_taken`. [[Double-booking guard]] is the final backstop.
- Duration = `endMin - startMin` of the existing booking (`:235`); price untouched.
- Fallback reference `CL-` + first 6 hex of id when none stored (`:69`); see [[Booking reference]].

## Depends on / Used by
Depends: [[Availability engine]], [[Booking server]], [[Booking shared]], [[Catalog loader]], [[Store Supabase]], [[Membership rules]]. Used by: [[Actions account-bookings]], [[Route account]], [[Route account-reschedule]].

## Security notes
Takes a `BookingViewer` (userId + membership) already authenticated by [[Viewer and session]]; ownership is enforced in the store by `userId` filters, not by trusting the id. See [[Trust boundary]].

## Failure modes
Not found / not owned both return the same `not_found` (no leak). Concurrent taker -> `slot_taken`. Store errors surface as thrown errors caught in the action.

## Tests covering it
[[Tests unit]] (customer suite), [[Tests integration]].

## Changing this safely
Keep validation here even though [[Actions account-bookings]] pre-checks shapes. Two near-identical `CancelResult`/`RescheduleResult` types exist (lib vs action; action adds `"auth"`).

## Known gaps
- Reschedule message text hard-codes "24 hours" (`:55-58`) instead of deriving from `SELF_SERVE_NOTICE_MIN`.
- `getRescheduleSlots` returns empty slots (not an error) when the member-cut rule blocks the date (`:169-170`).

## Changes since this note was written (2026-11-19)
`MyBooking` now carries `cancelledBy` and `cancelledAt` so a shop-cancelled booking says so and shows the shop contact details (`lib/shop-contact.ts`). `getMyBookingLimits` returns the cap state for the booking UI. New `lib/customer/account.ts` holds `deleteMyAccount`: admins are refused; upcoming bookings are cancelled; all bookings are anonymised (name "Deleted customer", email `deleted+<id>@example.invalid`, phone "deleted"); then the sign-in is deleted.
