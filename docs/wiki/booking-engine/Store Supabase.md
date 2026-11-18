---
area: booking-engine
source: [lib/store.ts]
commit: 14ba133
updated: 2026-11-18
---
# Store Supabase
**In plain English:** the only door between booking code and the `bookings` table. Every function uses the service-role (admin) client, which bypasses [[Row Level Security]], so each query is scoped by `user_id` in code. If Supabase is not configured it routes to [[Store memory fallback]] outside production, and refuses in production.

## Files
| path | role |
|---|---|
| lib/store.ts | `Booking` type, backend switch, queries |

## Public API / exports
| function | client/key | does |
|---|---|---|
| `listBookingsForDate(date)` | admin | active rows for a date, availability columns only, PII blanked (`:91-110`) |
| `insertBooking(b)` | admin | insert, returns row or `"conflict"` (`:112`) |
| `listActiveBookingsForUser(userId, since?)` | admin | pending/confirmed, `user_id` scoped (`:169`) |
| `listBookingsForUser(userId, limit=50)` | admin | any status, newest first (`:192`) |
| `getBookingForUser(userId, id)` | admin | one own row or null (`:211`) |
| `cancelBooking(userId, id)` | admin | status to `cancelled` + `cancelled_at`, only active own rows (`:231`) |
| `rescheduleBookingRow(userId, id, to)` | admin | one atomic UPDATE; `"conflict"` / `"not_found"` (`:252`) |
| `ACTIVE_STATUSES`, `isActiveStatus` | - | `pending`, `confirmed` (`:29-31`) |

No function uses the [[Anon key]]. The admin client is imported lazily (`await import`) so memory mode never loads it ([[Supabase clients]], [[Service-role key]]).

## Rules & invariants
- Backend choice `backend()` (`:81-89`): `hasSupabaseEnv()` true gives supabase; else production throws; else memory.
- Only `pending`/`confirmed` block slots (`:100`, `:181`).
- Exclusion violation: Postgres error `23P01` maps to `"conflict"` on insert (`:149`) and reschedule (`:276`); that is the `no_overlap` constraint ([[Table bookings]], [[Double-booking guard]]).
- Insert retries up to 3 times on a `bookings_pkey` or `reference` unique collision (`23505`), new UUID each time; other errors throw `Could not save booking.` (`:121-162`). Reference = `CL-` + 6 hex chars of id ([[Booking reference]]).
- Money: stored as `total_pence = Math.round(GBP*100)` (`:139`), read back `/100` (`:72`).
- Times: `booking_date` date string, `start_min`/`end_min` ints ([[Time model]]).
- `getBookingForUser`, `cancelBooking`, `rescheduleBookingRow` reject non-UUID ids first (`:215,235,260`).

## Security notes
Safety relies on every query having `.eq("user_id", userId)` (`:180,199,220,240,270`); a new function that forgets it would expose other users' rows. `listBookingsForDate` deliberately omits name/email/phone/notes/totals (`:105-109`). See [[Trust boundary]].

## Failure modes
DB errors are logged (code + message only) and rethrown as generic messages. A concurrent insert yields `"conflict"`, not an exception.

## Depends on / Used by
Depends: [[Store memory fallback]], [[Supabase clients]]. Used by [[Booking server]], [[Availability engine]] (type only), [[Customer bookings lib]], [[Admin bookings lib]] (unverified), [[Tests unit]]. Hub [[Booking engine hub]], [[00 Index]].

## Changing this safely
Mirror any change in [[Store memory fallback]] (same signature, same semantics). Keep `FULL_COLUMNS` (`:55`) in step with [[Table bookings]].

## Known gaps
- Reschedule UPDATE has no 24-hour or window check; callers must do it ([[Customer bookings lib]], [[24-hour rule]]).
- `listBookingsForUser` and `listActiveBookingsForUser` return full PII rows, intended only for the owner.
- `cancelled_at` is set here but the memory store does not track it.
