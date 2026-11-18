---
area: booking-engine
source: [lib/store-memory.ts]
commit: 14ba133
updated: 2026-11-18
---
# Store memory fallback
**In plain English:** a stand-in "database" that keeps bookings in a JavaScript array while you develop or run tests without Supabase. It copies the real rules (only active bookings block a slot, overlaps are refused) but forgets everything when the server restarts. It can never be used in production.

## Files
| path | role |
|---|---|
| lib/store-memory.ts | array-backed mirror of [[Store Supabase]] |

## When it is used
| condition | result | where |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` both non-empty | Supabase, memory unused | `lib/supabase/env.ts:2-6`, `store.ts:82` |
| either missing, `NODE_ENV !== "production"` | memory | `store.ts:83-88` |
| either missing, `NODE_ENV === "production"` | throws, refusing to use memory | `store.ts:83-87` |
The anon key is not part of the test. The catalog has the same rule ([[Catalog loader]]), so no-env dev gets seed catalog + memory bookings together. How tests isolate from the real DB: see [[Test suite overview]] (not verified here).

## Public API / exports
Same functions as [[Store Supabase]]: `listBookingsForDate`, `insertBooking`, `listActiveBookingsForUser`, `listBookingsForUser`, `getBookingForUser`, `cancelBooking`, `rescheduleBookingRow`. Loaded only via dynamic `import("./store-memory")` from `store.ts`.

## Rules & invariants
- Storage: `globalThis.__cutlabzBookings` array, survives Next dev hot reloads (`:7-8`).
- Overlap = active status, same date, same barber, `t.start < x.end && t.end > x.start` (`:12-20`), the same half-open test as [[Availability engine]] and a stand-in for the `no_overlap` constraint ([[Double-booking guard]]).
- Insert re-checks overlap at write time then pushes (`:31-42`). Single-threaded JS makes this effectively atomic.
- Reference: `CL-` + first 6 hex of id uppercased (`:10`) ([[Booking reference]]).
- Returns copies (`{...row}`) so callers cannot mutate the store.

## Security notes
No access control beyond the `userId` filters copied from the real store. Not reachable in production.

## Failure modes
Data lost on restart; not shared across serverless instances.

## Depends on / Used by
Depends: `isActiveStatus`, types from [[Store Supabase]]. Used only by [[Store Supabase]] and thus [[Booking server]]. Hub [[Booking engine hub]], [[00 Index]].

## Tests covering it
[[Tests unit]].

## Changing this safely
Keep it behaviourally identical to [[Store Supabase]]; tests exercise it as the DB.

## Known gaps
- `listBookingsForDate` returns full rows including name/email (`:23`), unlike Supabase which blanks them; harmless in dev.
- `cancelBooking` does not record a cancel time.
- `Booking.userId` etc. are not validated; no UUID check on ids.
