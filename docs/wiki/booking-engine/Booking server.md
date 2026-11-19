---
area: booking-engine
source: [lib/booking-server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Booking server
**In plain English:** the server-side brain of booking. It treats everything from the browser as untrusted, re-computes price, duration and free times itself, enforces membership and booking limits, then tries to save. It has no `'use server'` so tests can call it directly; [[Actions book]] is the thin wrapper.

## Files
| path | role |
|---|---|
| lib/booking-server.ts | `getSlots`, `createBooking`, helpers |

## Public API / exports
| export | meaning |
|---|---|
| `getSlots(input, now, viewer?)` | free slots (`:141`) |
| `createBooking(input, now, viewer?)` | validate + insert (`:163`) |
| `membershipBlock(viewer, serviceId, now, date)` | member-cut gate, `null` = allowed; also used by rescheduling (`:111`) |
| `isMembershipService(catalog, id)` | `kind === "membership"` (`:106`) |
| `orderCandidates(...)` | least-busy barber first for "any", ties in catalog order (`:127`) |
| `BookingViewer` | `{userId, email, membership}` (`:38`) |

## getSlots order (`:141-159`)
Load catalog, `parseCommon`, then for member services: no matching plan gives `Members only.`; plan not covering the date gives empty slots; then not in window or closed gives empty; else `listBookingsForDate` + [[Availability engine]].

## createBooking step order
1. No viewer: `code:"auth"` (`:168`).
2. `loadCatalog()` ([[Catalog loader]], uncached) and `parseCommon` (`:169-172`): object shape; service id exists; add-ons at most 10, each string <= 64 chars, known, de-duplicated; barber id or `"any"`; date string <= 10 chars and valid. Server recomputes `durationMin`/`totalGBP` with `quote` (`:94`). Failure: `invalid`.
3. Details: `name`, `phone`, `notes` must be strings <= 2000 chars, then `validateContact` (`:175-187`). Email is taken from the account, client email ignored (`:247`).
4. `startMin` must be an integer (`:189-191`).
5. Member cut (`kind === "membership"`): `membershipBlock` gives `code:"membership"` (`:193-197`).
6. Limits: fetch own active bookings since yesterday, drop those already started (`:199-201`). Member cut and `>= MAX_UPCOMING_MEMBER_CUTS` (1, `membership.ts:16`) gives `limit` (`:204`); `>= MAX_UPCOMING_BOOKINGS` (3, `membership.ts:18`) gives `limit` (`:210`). See [[Upcoming booking limits]], [[Member cut]].
7. Window: `isInWindow` then `isOpenDay`, else `unavailable` (`:217-220`). [[Booking window]].
8. `computeSlots` with no bookings: start must exist (grid, hours, time off, 60-min notice) else `unavailable` (`:223-225`).
9. `listBookingsForDate`, `computeSlots` again; start gone gives `slot_taken` (`:227-232`).
10. Candidates = `orderCandidates` (`:235`).
11. For each candidate: `insertBooking` ([[Store Supabase]]). `"conflict"` (the `no_overlap` exclusion violation, SQLSTATE 23P01) means try the next candidate (`:254`); after all fail, `slot_taken` (`:286`). See [[Double-booking guard]].
12. Member-cut race guard (`:255-271`): re-list; if more than 1 member cut now exists and 1+ are older (by `createdAt|id`), cancel this new row and return `limit`.
13. Success: build `ConfirmedBooking`; `reference` is rebuilt as `CL-` + first 6 hex of id uppercased (`:273`) ([[Booking reference]]).

`membershipId` is stored only for member cuts, from `viewer.membership.id` (`:252`).

## Security notes
All input is `unknown`; sizes bounded before regexes. The viewer comes from the server session ([[Viewer and session]], [[requireCustomer]]), never from input. Member rules internals: [[Membership rules]]. See [[Trust boundary]].

## Failure modes
Store errors throw; [[Actions book]] catches and returns `code:"error"`. Two simultaneous requests are decided by the DB constraint, not step 9.

## Depends on / Used by
Depends: [[Catalog loader]], [[Availability engine]], [[Booking shared]], [[Store Supabase]], [[Membership rules]]. Used by [[Actions book]], [[Customer bookings lib]] (`membershipBlock`, `orderCandidates`), [[Actions admin-bookings]] (unverified exact imports). Hub [[Booking engine hub]], [[00 Index]].

## Tests covering it
[[Tests unit]].

## Changing this safely
Keep validation order: cheap checks before DB reads. Any new rule must also be applied in reschedule ([[Customer bookings lib]]).

## Known gaps
- Limits (step 6) run before window/open checks (step 7), so a limit message can mask an invalid date.
- Booking `reference` is recomputed (`:273`) instead of using `row.reference` ([[Store Supabase]] already returns it); they agree today.
- Race guard: if the cancel fails or throws, the surplus member cut remains (unverified).
- `getSlots` reveals "Members only." to anonymous users but not slots; no auth check on paid services (intended).

## Changes since this note was written (2026-11-19)
`createBooking` accepts a `requestKey`: a retry or double-click with the same key returns the original booking instead of an error (on a slot conflict it first checks for the replay). The 3-booking cap is now checked in the app and enforced in the database (see [[DB functions]]), and phone is required. Customer cancellations stamp `status_changed_by = 'customer'`. `rescheduleMyBooking` requires an `expected` block (date, start, barber) and returns code "stale" if the booking moved since the page loaded. Messages `BOOKING_LIMIT_MESSAGE` and `MEMBER_CUT_LIMIT_MESSAGE` live in the customer lib. Premium members get free add-ons via `quote(..., { freeAddons })`.
