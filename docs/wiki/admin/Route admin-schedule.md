---
area: admin
source: [app/admin/(panel)/hours/*, app/admin/(panel)/time-off/*]
commit: 14ba133
updated: 2026-11-18
---
# Route admin-schedule
**In plain English:** the Hours page (weekly opening windows per barber) and the Time off page (date ranges when a barber is away). They decide which slots customers see. Saving warns, but does not block, when existing bookings end up outside the new hours or on a day off.

## Files
| path | role |
|---|---|
| `hours/page.tsx`, `time-off/page.tsx` | guarded pages |
| `hours/actions.ts` | `saveHours` |
| `time-off/actions.ts` | `addTimeOff`, `deleteTimeOff` |

## Action behaviour
| action | validation | write |
|---|---|---|
| `saveHours` | `barberId` string <=64, `schedule` JSON string <= 20,000 chars, `parseSchedule`, barber exists | RPC `replace_availability(p_barber, p_rows)`: atomic delete+insert ([[DB functions]]); warns count of future active bookings outside new hours |
| `addTimeOff` | barber exists, valid start/end dates, end >= start, reason <= 200 | insert `time_off` (`reason` null if empty); warns count of pending/confirmed bookings in range |
| `deleteTimeOff` | `id` digits only (<=15) | delete by id; "Time off not found." if 0 rows |

## Security notes
- All three call `requireAdminAction()` first (hours/actions.ts:20, time-off/actions.ts:12,72). Admin session client, [[Row Level Security]] (`admin all availability/time_off`, [[RLS matrix]]).
- Cache: `revalidateCatalog("/admin/hours" | "/admin/time-off")` refreshes tag `catalog` ([[Cache Components]]). The public flow reads these through [[Catalog loader]].
- Page text states time off "blocks new online bookings only"; existing bookings stay.

## Rules & invariants
Max 4 windows/day, 0-1440, whole minutes ([[Admin catalog lib]]). Dates are shop-local strings ([[Time model]]). The future-bookings query is capped at 5000 rows (`future-bookings.ts:24`); "future" = date after today or `end_min` after now ([[Admin settings components]]).

## Failure modes
RPC failure returns "your previous hours were kept." Warning queries are best-effort and swallowed.

## Known gaps
- `addTimeOff` has no server check that dates are not in the past (only the form `minDate`); duplicate/overlapping ranges are allowed.
- The 5000-row cap can silently under-count warnings.
- Time off added over existing bookings leaves them in place; staff handle them manually ([[Route admin-dashboard]]).

Related: [[Slot computation]], [[Table availability]], [[Table time_off]], [[Admin hub]], [[Server action]], [[00 Index]].
