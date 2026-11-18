---
area: concepts
source: [supabase/schema.sql, lib/store.ts, lib/booking-server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Double-booking guard

**In plain English:** two people can click "confirm" on the same slot at the same moment. The app checks first, but the database has the final say: a Postgres rule physically refuses a second active booking that overlaps the same barber's time.

| Layer | What | Code |
|---|---|---|
| App pre-check | slot recomputed with the day's bookings | `lib/booking-server.ts:227-232` ([[Slot computation]]) |
| DB constraint | `no_overlap` exclusion constraint: same `barber_id`, same `booking_date`, overlapping `int4range(start_min,end_min)`, only while status is `pending`/`confirmed` | `supabase/schema.sql:77-81` |
| Error mapping | Postgres `23P01` -> `"conflict"` | `lib/store.ts:149` (insert), `lib/store.ts:276` (reschedule) |
| Retry | for barber `"any"`, a conflict moves on to the next candidate barber | `lib/booking-server.ts:238-254` |
| User message | `slot_taken`: "That time was just taken." | `lib/booking-server.ts:231` |

Notes:
- `int4range` is half-open `[start,end)`, so back-to-back bookings (10:00-10:30, 10:30-11:00) are allowed.
- Cancelled / completed / no-show rows leave the constraint, freeing the slot.
- Needs the `btree_gist` extension (`supabase/schema.sql:7`).
- The in-memory store emulates the check ([[Store memory fallback]]).
- Memberships have a similar guard: [[Membership period]].

Related: [[Table bookings]], [[Store Supabase]], [[Booking server]], [[Tests integration]], [[00 Index]].
