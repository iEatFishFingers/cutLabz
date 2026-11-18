---
area: admin
source: [app/admin/(panel)/barbers/*, app/admin/(panel)/services/*]
commit: 14ba133
updated: 2026-11-18
---
# Route admin-catalog
**In plain English:** the Barbers page and the Services/Add-ons page. Staff add and edit entries, and untick Active to hide one. Nothing can be deleted because old bookings point at them.

## Files
| path | role |
|---|---|
| `barbers/page.tsx`, `services/page.tsx` | pages, `requireAdmin()`, load via RLS client |
| `barbers/actions.ts` | `saveBarber(prev, fd)` |
| `services/actions.ts` | `saveService`, `saveAddon` |

## Action behaviour
| action | validation | on success |
|---|---|---|
| `saveBarber` | `id` absent = create (<=64 chars); name 1-60 with letters/numbers on create; role <=60; `active` = checkbox "on" | create: slug id via `uniqueSlug`, up to 3 tries on `23505`, warns "no opening hours yet". Update to inactive: warns count of future active bookings |
| `saveService` | name <=60, description <=120, duration 1-600 whole min, price via `parsePounds`, `kind` is `membership` or `one-off` | insert with slug or update; "Service not found." if 0 rows |
| `saveAddon` | name <=60, price, extra 0-600 min | same |

## Security notes
| Item | Value |
|---|---|
| Guard | `requireAdminAction()` first line of all 3 actions (barbers/actions.ts:21, services/actions.ts:60,110) |
| DB client | admin session ([[Anon key]] + [[Row Level Security]]: `admin all barbers/services/addons`, [[RLS matrix]]) |
| Cache | `revalidateCatalog(...)` calls `revalidateTag("catalog","max")` plus `revalidatePath` of admin pages ([[Admin settings components]]). `max` = stale-while-revalidate, verified in Next `revalidateTag.md` ([[Cache Components]]) |
| Ids | new ids are server-generated; the client never chooses them |

## Failure modes
DB errors log code and message and return "Could not save. Please try again."; field errors come back per field.

## Known gaps
- Deactivating a service/add-on gives no warning about future bookings using it (barbers do).
- With `max`, `/book` may serve the old catalog once while it refreshes (inherent to stale-while-revalidate).
- `saveBarber` update revalidates `/admin/time-off`, create does not (minor).

Depends on [[Admin catalog lib]], [[Table barbers]], [[Table services and addons]]. Hub [[Admin hub]], [[Server action]], [[00 Index]].
