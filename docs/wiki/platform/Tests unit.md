---
area: platform
source: [tests/availability.test.ts, tests/availability-rules.test.ts, tests/booking-shared.test.ts, tests/booking-server.test.ts, tests/store.test.ts, tests/customer.test.ts]
commit: 14ba133
updated: 2026-11-18
---
# Tests unit

**In plain English:** the fast suites (`npm test`) that prove the booking rules: opening hours, free slots, double-booking, membership limits, cancel/reschedule timing. All run on the in-memory store with a pretend clock. Isolation is explained in [[Test suite overview]]. Hub: [[Platform hub]]; [[00 Index]].

| Suite | Proves | Covers |
|---|---|---|
| `availability.test.ts` | closed Sun/Mon, no past dates, same-day hides starts before now + 60 min, 15-min steps, last start by duration (25 min -> 20:30, 60 -> 20:00), touching bookings OK, `any` = union of free barbers | [[Availability engine]], [[Slot computation]] |
| `availability-rules.test.ts` | per-barber hours, split (lunch) windows never straddled, inclusive time-off dates, add-on minutes shorten last start | [[Availability engine]], [[Table time_off]] |
| `booking-shared.test.ts` | BST/GMT `shopNow`, midnight rollover, `addDays`, 28-day window, quote rules (premium add-ons free), `validateDetails` | [[Booking shared]], [[Time model]], [[Booking window]] |
| `booking-server.test.ts` | `createBooking` happy path + reference, `slot_taken`, `any` assignment (fewer bookings first), server-side price and email, auth code, validation codes, closed days write nothing; `getSlots` | [[Booking server]], [[Double-booking guard]], [[Booking reference]] |
| `store.test.ts` | insert id/createdAt, same-barber overlap conflict, other barber/date allowed, adjacent (end == start) allowed | [[Store memory fallback]], [[Store Supabase]] |
| `customer.test.ts` | member-cut rules (matching active membership, free, one upcoming, end date inclusive, max 3 upcoming), cancel (ok >= 24h, `too_late`, `not_found`), reschedule (own old slot reusable, atomic on conflict, measured from original start), `subscribeToPlan` 30-day period / `already_member` | [[Customer bookings lib]], [[Customer memberships lib]], [[Member cut]], [[24-hour rule]], [[Upcoming booking limits]], [[Membership period]] |

Numbers come from test titles (`customer.test.ts:121,141,153,312`) and are enforced in the lib notes, not re-verified here.

## Rules & invariants
- Fixed clocks: Tue 2026-11-17 at 09:00 / 10:00 London (`availability.test.ts:11`, `booking-server.test.ts:8`).
- `beforeEach(resetStore)` isolates tests ([[Test suite overview#Helpers]]).

## Failure modes
A failure after a rules change usually means a hard-coded 2026-11 date meets a changed rule such as the [[Booking window]]; the clock is injected, so real time is not the cause.

## Known gaps
Admin actions, [[Auth gating]], and Postgres-only guarantees (the exclusion constraint, RLS) are untested here; see [[Tests integration]].
