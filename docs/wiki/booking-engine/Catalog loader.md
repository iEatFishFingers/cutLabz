---
area: booking-engine
source: [lib/catalog-db.ts]
commit: 14ba133
updated: 2026-11-18
---
# Catalog loader
**In plain English:** reads the live menu (barbers, services, add-ons, weekly hours, time off) from Supabase and turns it into the same shapes as [[Catalog static]]. With no Supabase configured it hands back the seed catalog in dev. It does not cache by itself; caching is applied by one caller.

## Files
| path | role |
|---|---|
| lib/catalog-db.ts | `server-only` loader (`:1`) |

## Public API / exports
| export | meaning |
|---|---|
| `loadCatalog(): Promise<ServerCatalog>` | full catalog incl. `timeOff` (`:37`) |
| `toClientCatalog(c)` | strips `timeOff` (`:95`) |
| `getClientCatalog()` | `loadCatalog` then strip (`:99`) |

## Reads / Writes
Reads only, via the service-role client `getSupabaseAdmin()` ([[Supabase clients]], [[Service-role key]]), so [[Row Level Security]] is bypassed.
| table | columns | filter |
|---|---|---|
| barbers ([[Table barbers]]) | id,name,role | `active = true` |
| services, addons ([[Table services and addons]]) | id,name,description,duration_min,price_pence,kind / id,name,price_pence,extra_min | `active = true` |
| availability ([[Table availability]]) | barber_id,weekday,open_min,close_min | none |
| time_off ([[Table time_off]]) | barber_id,start_date,end_date | none (all rows) |

Five queries run in parallel (`:43-49`); any error throws `Failed to load <x>` (`:27-35`).

## Rules & invariants
- Prices: `price_pence / 100` (`:62,71`).
- Hours grouped per barber by weekday, sorted by `open` (`:78-83`).
- Ordering: position in the seed list, unknown ids last, then name, then id (`:17-25`).
- Fallback: no env and `NODE_ENV !== "production"` returns `seedCatalog`; in production it throws `Supabase is not configured.` (`:38-41`). Env test is `hasSupabaseEnv` (URL and service-role key both set, `lib/supabase/env.ts:2-6`).

## Caching
No `'use cache'` here. Only `app/book/BookingLoader.tsx:7-11` caches `getClientCatalog()` with `cacheLife("minutes")` and `cacheTag("catalog")`. Admin edits call `revalidateTag("catalog", "max")` (`components/admin/settings/revalidate.ts:8`); verified in Next docs (`revalidateTag.md`): the `max` profile is stale-while-revalidate. Exact `minutes` timings: unverified. `loadCatalog` is called uncached on every slot/booking request ([[Booking server]]). See [[Cache Components]].

## Security notes
Time off exists only in `ServerCatalog`; `toClientCatalog` is the filter before data reaches [[Route book]].

## Depends on / Used by
Depends: [[Catalog static]], [[Supabase clients]]. Used by [[Booking server]], [[Customer bookings lib]], [[Customer memberships lib]], [[Route book]], [[Route admin-new-booking]], [[Route account-reschedule]]. Hub [[Booking engine hub]], [[00 Index]].

## Failure modes
DB error throws; in actions this becomes a generic error ([[Actions book]]). A barber with no availability rows has empty `hours` and is never bookable.

## Tests covering it
[[Tests unit]].

## Changing this safely
Keep column lists in step with [[Database hub]] tables. Adding a field to `ClientCatalog` publishes it to browsers.

## Known gaps
- Whole `time_off` and `availability` tables are read per call (no date filter).
- Reschedule page calls `getClientCatalog()` uncached (`app/account/bookings/[id]/reschedule/page.tsx:50`), so the `catalog` tag does not apply there.

## Changes since this note was written (2026-11-19)
`loadCatalog` hides barbers with no working hours from `/book`; the admin screens use `loadAdminCatalog`, which still lists them.
