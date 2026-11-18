---
area: booking-engine
source: [lib/catalog.ts, lib/catalog-db.ts, lib/availability.ts, lib/booking-shared.ts, lib/booking-server.ts, lib/store.ts, lib/store-memory.ts, app/book/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Booking engine hub
**In plain English:** the code that decides what can be booked and saves it. A menu is loaded, free times are worked out from hours and existing bookings, and when a customer confirms, the server re-checks everything and inserts the booking. The database has the last word on double-booking. Back to [[00 Index]].

## Notes in this area
| note | one line |
|---|---|
| [[Catalog static]] | types, seed menu, the 15 / 28 / 60 constants |
| [[Catalog loader]] | live menu from Supabase, client vs server catalog |
| [[Availability engine]] | pure `computeSlots` |
| [[Booking shared]] | contract types, quote, shop-local date helpers, validation |
| [[Booking server]] | `getSlots`, `createBooking` step order |
| [[Store Supabase]] | the only `bookings` table access, service-role |
| [[Store memory fallback]] | dev/test in-memory twin |
| [[Actions book]] | the two server actions the UI calls |

## Data flow
```
Catalog loader -> (cached client catalog) -> Route book UI
UI -> getSlotsAction -> getSlots -> loadCatalog + listBookingsForDate -> computeSlots
UI -> createBookingAction -> createBooking -> checks -> insertBooking
        (23P01 no_overlap) -> "conflict" -> next barber or slot_taken
```

## Key numbers (each verified in its note)
| value | meaning | source |
|---|---|---|
| 15 min | slot grid | `lib/catalog.ts:65` |
| 28 days | booking window | `lib/catalog.ts:66` |
| 60 min | minimum notice | `lib/catalog.ts:67` |
| 1 / 3 | upcoming member cuts / bookings | `lib/membership.ts:16,18` ([[Upcoming booking limits]]) |

## Cross-cutting
- Time: strings plus minutes, shop-local `Europe/London` ([[Time model]], [[Booking shared]]).
- Keys: everything here uses the service-role client; the anon key is unused ([[Service-role key]], [[Anon key]], [[Row Level Security]]).
- Caching: only the client catalog on /book is cached ([[Catalog loader#Caching]], [[Cache Components]]).
- Concepts: [[Slot computation]], [[Booking window]], [[Double-booking guard]], [[Member cut]], [[Booking reference]], [[Trust boundary]].
- Neighbours: [[Membership rules]], [[Customer bookings lib]] (cancel/reschedule reuse these), [[Database hub]], [[Booking flow shell]], [[Request Lifecycles]].

## Known gaps (area summary)
See each note. Main ones: `time_off`/`availability` read whole per request; limits checked before window in `createBooking`; reschedule page bypasses the catalog cache; `addonPrice` hard-codes `"premium"`.
