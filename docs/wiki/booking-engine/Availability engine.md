---
area: booking-engine
source: [lib/availability.ts]
commit: 14ba133
updated: 2026-11-18
---
# Availability engine
**In plain English:** a pure function that answers "which start times are free?" for a date, service length and barber (or "any"). It looks at weekly hours, days off, the 15-minute grid, the 60-minute notice rule and existing bookings. No database access and no clock reads: everything is passed in.

## Files
| path | role |
|---|---|
| lib/availability.ts | `computeSlots`, date helpers |

## Public API / exports
| export | meaning |
|---|---|
| `Slot = { startMin, barberIds }` | one free start with every barber free then (`:4`) |
| `computeSlots(opts): Slot[]` | opts: date, durationMin, barberId or "any", bookings, now{date,min}, catalog (`:17`) |
| `dayOfWeek(date)` | 0=Sun..6=Sat via a UTC date (`:6`) |
| `formatTime(min)` | `HH:MM` (`:61`) |

## Rules & invariants (algorithm, in order)
1. Past date returns `[]` (`:27`).
2. Candidates = requested barber (or all) minus barbers whose `timeOff` range (inclusive both ends) covers the date (`:31-37`).
3. Candidate starts: `s = open; s + duration <= close; s += SLOT_STEP_MIN` (15) per hours window (`:41-42`). The grid is anchored at each window's `open`, not the clock hour.
4. Notice: skip a start if `dayDiff*1440 + start < now.min + MIN_NOTICE_MIN` (60) (`:46`). `dayDiff` is whole days from `now.date`, so a late-evening "now" also blocks early next-day starts.
5. A barber is free if one window fully contains `[start,end)` and no booking of that barber overlaps: `start < bk.endMin && end > bk.startMin` (`:49-55`). Half-open, so back-to-back is allowed.
6. Slot kept only if at least one barber is free (`:56`).

Concepts: [[Slot computation]], [[Booking window]] (the 28-day cap is NOT here; it is `isInWindow` in [[Booking shared]]), [[Time model]], [[Double-booking guard]] (this is the app-level check; the DB constraint is the real guard).

## Security notes
Pure; trusts its inputs. [[Booking server]] validates them and supplies `now`.

## Failure modes
Dates are not validated here (`dayOfWeek` on garbage gives NaN); `parseCommon` in [[Booking server]] checks first.

## Depends on / Used by
Depends: [[Catalog static]] (constants, types), `Booking` type from [[Store Supabase]]. Used by [[Booking server]] (twice in `createBooking`), [[Booking shared]] (`dayOfWeek`), [[Booking steps]] (via the slot action). Hub [[Booking engine hub]], [[00 Index]].

## Tests covering it
[[Tests unit]].

## Changing this safely
`createBooking` re-runs this function to validate the client's chosen time, so UI and server cannot disagree. Keep it pure.

## Known gaps
- Misplaced doc comment: "Free start times..." sits above `dayNum`, not `computeSlots` (`availability.ts:11`).
- `dayNum` is duplicated in `lib/membership.ts:34`.
- Wall-clock minutes only; on clock-change days real elapsed time could differ by an hour (unverified in practice).
