---
area: admin
source: [lib/admin/catalog-admin.ts]
commit: 14ba133
updated: 2026-11-18
---
# Admin catalog lib
**In plain English:** a toolbox of pure, testable functions for the settings pages: checking opening hours, turning "12.50" into pence, making URL-safe ids from names, and cleaning text. No database calls and no `server-only`, so client forms can reuse it too.

## Public API / limits (all in `lib/admin/catalog-admin.ts`)
| export | what |
|---|---|
| `ActionResult` | `{ok:true,message,warning?}` or `{ok:false,error,fieldErrors?}` |
| `MAX_WINDOWS_PER_DAY = 4` (line 8) | opening windows per day |
| `LIMITS` (10-20) | service name 60, description 120, add-on name 60, barber name 60, role 60, reason 200, duration <= 600 min, price <= 9,999,999 pence, extra <= 600 min |
| `validateWindows` | <= 4, integers, 0..1440, open < close, no overlap (touching allowed) |
| `parseSchedule(raw)` | untrusted JSON to a sorted week with all 7 days |
| `scheduleToRows`, `rowsToSchedule` | schedule vs `availability` rows |
| `hhmmToMinutes`, `minutesToHHMM` | "HH:MM" 00:00-24:00 |
| `parsePounds` | `£12.50` to pence, integer maths, max 99,999.99 |
| `slugify`, `uniqueSlug`, `RESERVED_SLUGS` | ids, max 40 chars; reserved: any, item, new, none, all, default |
| `cleanText`, `parseIntStrict`, `isDateString`, `weekdayOf` | validators |

## Rules & invariants
- Weekday numbers are DB style, 0 = Sunday; display order `WEEK_ORDER` Mon..Sun (line 23). See [[Table availability]], [[Time model]].
- `"any"` is reserved because it is the any-barber sentinel in the booking flow ([[Booking engine hub]]).
- `cleanText` replaces control chars with spaces.

## Security notes
This is the server-side validation used by every settings action ([[Route admin-catalog]], [[Route admin-schedule]]); client code reuses it only for UX. See [[Trust boundary]].

## Depends on / Used by
Used by [[Admin settings components]] and the barbers/services/hours/time-off action files. Tests: [[Tests unit]] (which suite covers it is unverified). Hub [[Admin hub]], [[00 Index]].

## Known gaps
- `weekdayOf`/`isDateString` duplicate `dayOfWeek` ([[Availability engine]]) and `isValidDateString` ([[Booking shared]]).
- `isWithinWindows` duplicates `fitsInWindows` ([[Admin bookings lib]]).
