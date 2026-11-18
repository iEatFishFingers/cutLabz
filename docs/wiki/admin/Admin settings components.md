---
area: admin
source: [components/admin/settings/*]
commit: 14ba133
updated: 2026-11-18
---
# Admin settings components
**In plain English:** the form and editor widgets for the settings pages, plus two small server helpers the actions share: one refreshes caches after a save, one counts upcoming bookings so staff get a warning.

## Files
| path | kind | role |
|---|---|---|
| `HoursEditor.tsx` | client | per-barber weekly draft editor (add window, copy day to other days, copy week to another barber); dirty tracking; posts `schedule` JSON + `barberId` to `saveHours` |
| `BarberForm.tsx` | client | add/edit barber; `useActionState(saveBarber)` |
| `ItemForm.tsx` | client | service or add-on form (`type` prop) |
| `TimeOffForm.tsx`, `TimeOffList.tsx` | client | add / delete time off; list flags overlapping bookings |
| `ui.tsx` | shared | class constants, `PageHeader`, `ResultMessage`, `FieldError`, `PanelSkeleton` |
| `revalidate.ts` | server-only | `revalidateCatalog(...paths)` |
| `future-bookings.ts` | server-only | `listFutureActiveBookings(db, barberId?)`, `plural()` |

## Key helpers
| helper | behaviour |
|---|---|
| `revalidateCatalog` | `revalidateTag("catalog","max")` then `revalidatePath` per path (revalidate.ts:7-10). Two-arg form per Next `revalidateTag.md`: marks stale, serves stale while refreshing. The tag is set in `app/book/BookingLoader.tsx:10` ([[Cache Components]]) |
| `listFutureActiveBookings` | pending/confirmed, `booking_date >= today`, `limit(5000)`, then drops ones already ended today (shop time via `shopNow`, [[Time model]]) |

## Rules & invariants
Client validation (`validateWindows`, max 4 windows) is UX only; actions re-validate via [[Admin catalog lib]]. HoursEditor `copyToBarber` only fills the draft; nothing saves until Save is pressed.

## Security notes
No guards inside components: protection lives in the actions ([[Route admin-catalog]], [[Route admin-schedule]]; [[requireAdmin]], [[Trust boundary]]). The two helper modules are `server-only`.

## Known gaps
- `future-bookings.ts` and `revalidate.ts` are server utilities living under `components/`, easy to miss.
- 5000-row cap, see [[Route admin-schedule]].

Used by the pages listed in [[Admin hub]]. Also [[Server action]], [[00 Index]].
