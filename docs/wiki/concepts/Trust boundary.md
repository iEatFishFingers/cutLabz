---
area: concepts
source: [proxy.ts, lib/booking-server.ts, lib/catalog.ts, lib/catalog-db.ts, lib/customer/bookings.ts]
commit: 14ba133
updated: 2026-11-18
---
# Trust boundary

**In plain English:** anything that comes from the browser (prices, durations, chosen times, even the email field) could be faked. The rule in this codebase is: the browser may *suggest*, the server *decides*, and the database is the last line of defence.

| Browser sends | Server does instead | Code |
|---|---|---|
| service/add-on ids | must exist in the live catalog; max 10 add-ons, ids <= 64 chars | `lib/booking-server.ts:63-101` |
| price / duration | ignored; recomputed with `quote()` | `lib/booking-server.ts:3,94` |
| email | ignored; account email used | `lib/booking-server.ts:176,247` |
| start time | must be an integer that is a legal, still-free slot | `lib/booking-server.ts:189-232` |
| "I'm a member" | membership read server-side from DB | `lib/customer/viewer.ts:40-55` |
| cancel/reschedule button | 24 h re-check, `user_id` scoping | `lib/customer/bookings.ts:126,145`, `lib/store.ts:166` |

Layers, outer to inner:
1. [[Proxy request gate]] - optimistic only ("NOT the security boundary", `proxy.ts:4-5`).
2. [[requireCustomer]] / [[requireAdmin]] in every page and action.
3. Validation in lib modules ([[Booking server]], [[Customer bookings lib]]).
4. Postgres: [[Row Level Security]] and constraints ([[Double-booking guard]]).

Data going *out* is trimmed too: `ClientCatalog` excludes `time_off` (`lib/catalog.ts:22-27`); day-booking lists drop PII (`lib/store.ts:105-108`).

See [[Security Model]] | [[00 Index]].
