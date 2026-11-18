---
area: booking-engine
source: [lib/booking-shared.ts]
commit: 14ba133
updated: 2026-11-18
---
# Booking shared
**In plain English:** the booking "contract" and small helpers used by both the browser flow and the server: types, price/duration quoting, shop-local date/time maths and form validation. It has no I/O, so client components can import it.

## Files
| path | role |
|---|---|
| lib/booking-shared.ts | types + pure helpers |

## Public API / exports
| export | meaning |
|---|---|
| `SHOP_TZ = "Europe/London"` | `:11` |
| `BookingDraft`, `emptyDraft` | client draft (`:14-36`) |
| `GetSlotsInput`, `SlotsResult`, `CreateBookingInput`, `ConfirmedBooking`, `CreateBookingResult` | action contracts (`:41-90`) |
| `quote(catalog, serviceId, addonIds)` | authoritative `{durationMin, totalGBP}` (`:109`) |
| `addonPrice`, `resolveAddons`, `getService`, `getBarberName`, `formatGBP` | helpers |
| `shopNow(at?)` | `{date, min}` in Europe/London via `Intl.DateTimeFormat` (`:129`) |
| `addDays`, `isValidDateString`, `windowDates`, `isInWindow`, `isOpenDay`, `formatDate` | date helpers |
| `LIMITS`, `validateContact`, `validateDetails` | validation |

## Rules & invariants
| rule | value | where |
|---|---|---|
| Time representation | date `"YYYY-MM-DD"` string, time = integer minutes from midnight; no `Date` objects stored ([[Time model]]) | `:15-19` |
| Shop-local "now" | `shopNow` formats a real instant in `Europe/London`, `hourCycle: h23` | `:129-144` |
| Window | `date >= today && date <= addDays(today, 27)` (28 days incl. today) | `:158-165` |
| Result codes | `error, slot_taken, invalid, unavailable, auth, membership, limit` | `:77-90` |
| Field limits | name 80, email 254, phone 20, notes 500 | `:181` |
| Name | trimmed length 2..80 | `:188-189` |
| Phone | after stripping `\s()+-`, 7-15 digits, raw length <= 20 | `:187,190` |
| Premium add-ons free | `service.id === "premium"` gives price 0 | `:105` |
| Duration / price | service + sum(`extraMin`); price = service + add-ons | `:118-119` |

`shopNow` must only run at request time, never during prerender ([[Cache Components]]). `isValidDateString` round-trips the date to reject impossible days (`:151-156`).

## Security notes
`quote` is the server's source of truth; client prices are ignored ([[Trust boundary]], [[Booking server]]). `validateDetails` (with email) is client-side convenience; the server uses `validateContact` and the account email.

## Failure modes
`shopNow` falls back to `"00"` if `Intl` omits a part (`:139`), silently giving a wrong date.

## Depends on / Used by
Depends: [[Catalog static]], [[Availability engine]] (`dayOfWeek`). Used by [[Booking server]], [[Actions book]], [[Booking flow shell]], [[Booking steps]], [[Membership rules]] (`addDays`). Hub [[Booking engine hub]], [[00 Index]].

## Tests covering it
[[Tests unit]].

## Changing this safely
Types are the client/server contract; adding or renaming a result `code` needs UI handling in [[Booking steps]].

## Known gaps
- `addonPrice` hard-codes the id `"premium"` instead of using catalog data (`:105`).
- [[Membership rules]] imports `addDays` from here while this file does not import it back; no cycle found.
- Email regex is loose (`:200`).
