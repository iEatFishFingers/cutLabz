---
area: concepts
source: [lib/availability.ts, lib/catalog.ts, lib/booking-server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Slot computation

**In plain English:** to show free times, the server takes each barber's weekly hours, chops them into 15-minute starting points, throws away times that are too soon, then removes any start where the cut would overlap an existing booking. A time is offered if at least one suitable barber is free.

`computeSlots({date, durationMin, barberId, bookings, now, catalog})` in `lib/availability.ts:17-59`:

1. Past date -> `[]` (line 27).
2. Candidate barbers = chosen barber, or all for `"any"`, minus those on [[Table time_off|time off]] that date (lines 31-37).
3. Starts every `SLOT_STEP_MIN = 15` min (`lib/catalog.ts:65`) from each window `open` while `start + duration <= close` (line 42).
4. Drop starts closer than `MIN_NOTICE_MIN = 60` to now (line 46, see [[Booking window]]).
5. For each start, keep barbers whose window fits it and who have no overlapping booking (`start < bk.endMin && end > bk.startMin`, line 54).
6. Result: `Slot = {startMin, barberIds[]}`.

Durations: every seeded service is 30 min and add-ons add 0 min (`lib/catalog.ts:41-51`), so in practice a slot is 30 min; duration is still computed by `quote()` ([[Booking shared]]).

`createBooking` calls it twice: once with no bookings (is this a legal start at all?) and once with the day's bookings (is it still free?) (`lib/booking-server.ts:223-232`); then the DB is the final word ([[Double-booking guard]]). For `"any"` the least-busy barber is tried first (`orderCandidates`, line 127).

Related: [[Availability engine]], [[Booking server]], [[Time model]], [[Catalog loader]], [[Tests unit]], [[00 Index]].
