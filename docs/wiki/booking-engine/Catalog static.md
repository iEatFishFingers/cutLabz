---
area: booking-engine
source: [lib/catalog.ts]
commit: 14ba133
updated: 2026-11-18
---
# Catalog static
**In plain English:** the shop's menu (services, add-ons, barbers, weekly hours) written as plain TypeScript, plus the three numbers that govern booking. It is the dev/fallback copy: live data comes from the database via [[Catalog loader]]. The type definitions here are used by almost every booking file.

## Files
| path | role |
|---|---|
| lib/catalog.ts | types, `seedCatalog`, booking constants |

## Public API / exports
| export | meaning |
|---|---|
| `Service`, `Addon`, `Barber`, `CatalogBarber`, `Hours`, `Window` | catalog shapes (`catalog.ts:6-21`) |
| `ClientCatalog` | safe for browsers: services, addons, barbers+hours (`:23`) |
| `ServerCatalog` | `ClientCatalog` + `timeOff` (never sent to browsers, `:27`) |
| `seedCatalog`, `services`, `addons`, `barbers` | seed data (`:39-63`) |
| `SLOT_STEP_MIN`, `BOOKING_WINDOW_DAYS`, `MIN_NOTICE_MIN` | constants (`:65-67`) |

## Rules & invariants
| rule | value | where |
|---|---|---|
| Slot step | 15 min | `catalog.ts:65` |
| Booking window | 28 days (today + next 27) | `catalog.ts:66`, applied `booking-shared.ts:158-165` |
| Minimum notice | 60 min | `catalog.ts:67`, applied `availability.ts:46` |
| Time unit | `Window` = minutes from midnight, shop-local; `Hours` keyed 0=Sun..6=Sat, `[]`/missing = closed | `catalog.ts:19-20` |
| Seed hours | Tue-Sat 11:00-21:00, Sun/Mon closed, both barbers | `catalog.ts:29-37` |
| Seed services | all 30 min; `core`/`plus`/`premium` are `kind: "membership"` (price 0); `haircut` 20, `haircut-beard` 25 (GBP) | `catalog.ts:41-45` |
| Seed add-ons | four, 5 GBP each, `extraMin: 0` | `catalog.ts:48-51` |

Concepts: [[Time model]], [[Booking window]], [[Slot computation]].

## Security notes
`ServerCatalog` vs `ClientCatalog` is the type-level [[Trust boundary]]: time-off (private) must never reach the browser; see `toClientCatalog` in [[Catalog loader]].

## Depends on / Used by
Depends on nothing. Used by [[Availability engine]], [[Booking shared]], [[Booking server]], [[Catalog loader]]; hub [[Booking engine hub]]; [[00 Index]].

## Failure modes
[[Catalog loader]] orders live rows by seed ids (`core`, `barber-1`...); renamed live ids simply sort last.

## Tests covering it
See [[Tests unit]].

## Changing this safely
A constant change affects client UI and server checks together (good). `SLOT_STEP_MIN` changes every slot grid; re-check [[Availability engine]].

## Known gaps
Header comment says hours are "unconfirmed" (`catalog.ts:3`); live hours are DB-managed ([[Table availability]]).
