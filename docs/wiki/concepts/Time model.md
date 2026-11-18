---
area: concepts
source: [lib/booking-shared.ts, lib/availability.ts, lib/membership.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Time model

**In plain English:** the site never stores "a moment in time" for an appointment. It stores a calendar date plus "minutes after midnight" in Manchester (UK) time, so 14:30 on 2 Dec is `"2026-12-02"` + `870`. This avoids timezone and clock-change bugs, as long as "today" is always worked out in UK time.

| Thing | Representation | Where |
|---|---|---|
| Shop timezone | `SHOP_TZ = "Europe/London"` | `lib/booking-shared.ts:11` |
| Date | `"YYYY-MM-DD"` string; DB `booking_date date` | `lib/store.ts:2`, `supabase/schema.sql:59` |
| Time | integer minutes from midnight, `0..1440`; DB `start_min`/`end_min int` | `supabase/schema.sql:60-61` |
| "Now" | `shopNow()` -> `{date, min}` via `Intl.DateTimeFormat` in `SHOP_TZ` | `lib/booking-shared.ts:129-144` |
| Weekday | `dayOfWeek(date)` 0=Sun..6=Sat (UTC maths on the date string) | `lib/availability.ts:6-9` |
| Date maths | `addDays()` / `dayNum()` use `Date.UTC`, never the local clock | `lib/booking-shared.ts:146`, `lib/membership.ts:34` |
| Audit stamps | `created_at`, `cancelled_at` are real `timestamptz` | `supabase/schema.sql:74,185` |

## Rules
- Comparisons between dates are plain string comparisons (`"2026-12-02" < "2026-12-10"`), valid because of the fixed format.
- Minutes-until maths: `(dayDiff * 1440) + startMin - now.min` (`lib/membership.ts:40-46`, same idea in `lib/availability.ts:46`).
- `shopNow()` must only run at request time or after hydration, never during prerender ([[Cache Components]]); the client uses `useShopToday` ([[Booking flow shell]]).
- A DST day is not special: a slot is "minutes on the wall clock", so 23- or 25-hour days only affect the minutes-until arithmetic by up to 60 min (unverified edge case, no test found).

## Used by
[[Slot computation]], [[Booking window]], [[24-hour rule]], [[Membership period]], [[Availability engine]], [[Booking shared]], [[Membership rules]], [[Table bookings]]. Overview: [[Architecture Overview]] | [[00 Index]].
