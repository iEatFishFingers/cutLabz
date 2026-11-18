---
area: accounts
source: [app/account/bookings/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Actions account-bookings

**In plain English:** the three buttons-behind-the-scenes a signed-in customer can press on their bookings: cancel, "show me free times" and "move my booking". Each one cleans up the input, confirms the user is signed in, then hands over to the real logic. Hub: [[Accounts hub]]; [[00 Index]].

## Public API (`app/account/bookings/actions.ts`, `"use server"`)
| action | line | returns |
|---|---|---|
| `cancelBookingAction(bookingId)` | 38 | `CancelResult` |
| `getRescheduleSlotsAction({bookingId,date,barberId})` | 52 | `SlotsResult` |
| `rescheduleBookingAction({bookingId,date,startMin,barberId})` | 80 | `RescheduleResult` (`{ok:true}` only, no booking body) |

Result codes add `"auth"` ("Please sign in again.") to the lib's set. These are [[Server action]]s: public POST endpoints callable by anyone, hence all validation.

## Rules & invariants
| Check | Where |
|---|---|
| id shape: string, 1-64 chars, `[A-Za-z0-9-]+` | `isId` `:32` |
| date via `isValidDateString` ([[Booking shared]]) | `:60,89` |
| `startMin` integer, 0 <= x < 1440 | `:91-93` |
| auth: `requireCustomerAction().catch(()=>null)` -> `AUTH` | `:41,67,99` ([[Viewer and session]]) |
| clock: `shopNow()` server-side, never from client | `:43,72,109` ([[Time model]]) |

Then [[Customer bookings lib]] repeats shape checks and enforces ownership + [[24-hour rule]]. Success calls `revalidatePath("/account")` (`:44,111`); note `getRescheduleSlotsAction` does not revalidate (read only).

## Security notes
See [[Trust boundary]]. The barber id uses `isId`, so `"any"` passes; the lib checks it against the catalog. The user id is never an argument.

## Failure modes
Any thrown error is logged (`console.error`) and returned as a generic `error` message; unauthenticated returns `code:"auth"`, which the UI should answer by sending the user to sign in.

## Depends on / Used by
Depends: [[Customer bookings lib]], [[Viewer and session]], [[Booking shared]]. Used by: [[Account booking components]] (cancel/confirm), [[Route account-reschedule]], [[Route account]].

## Tests covering it
[[Tests unit]] (customer suite covers the lib; actions themselves unverified).

## Changing this safely
Add new inputs to the `isId`-style whitelist first. Invalidate `/account` after any write.

## Known gaps
- `revalidatePath("/account")` only; the reschedule page path is not revalidated (it is dynamic, unverified).
