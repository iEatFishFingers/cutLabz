---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# DB functions

**In plain English:** two small functions live in the database. One answers "is the current user an admin?" and is used inside the security policies. The other replaces a barber's weekly hours in one all-or-nothing step. Part of the [[Database hub]]; back to [[00 Index]].

## private.is_admin
| Item | Value (schema.sql) |
|---|---|
| Signature | `private.is_admin() returns boolean` (:98) |
| Properties | `language sql stable security definer set search_path = public` (:99) |
| Body | `exists (select 1 from public.admins where user_id = (select auth.uid()))` (:100) |
| Schema | `private`, created :94; `revoke all on schema private from public, anon`; `grant usage ... to authenticated` (:95-96) |
| Grants | `revoke execute ... from public, anon`; `grant execute ... to authenticated` (:102-103) |

Security definer so it can read [[Table admins]] regardless of that table's RLS; pinned `search_path` blocks hijacking; living in a non-exposed schema means it cannot be called over the REST API. `(select auth.uid())` is wrapped so Postgres evaluates it once per query. Used by every `admin all ...` policy ([[RLS matrix]]).

## public.replace_availability
| Item | Value |
|---|---|
| Signature | `replace_availability(p_barber text, p_rows jsonb) returns void` (:140-141) |
| Properties | `plpgsql`, **`security invoker`**, `set search_path = public` (:142-144) |
| Steps | error if `p_rows` is not a JSON array (:147-149); `delete` all rows for the barber (:150); insert one row per element from keys `weekday`, `open_min`, `close_min` (:151-153) |
| Grants | revoke from public, anon; grant to authenticated (:156-157) |

Because it is invoker, the caller's RLS applies: only an admin passes `admin all availability`; a customer calling it would delete nothing and insert nothing (policy blocks). The whole function is one transaction, so a failing insert (e.g. check violation) rolls back the delete.

| Caller | Link |
|---|---|
| app/admin/(panel)/hours/actions.ts:54 `db.rpc("replace_availability", ...)` | [[Route admin-schedule]], [[Admin settings components]], [[Server action]] |

## Rules & invariants
Input is validated by the table checks ([[Table availability]]), not by the function. See [[Row Level Security]], [[Admin auth]].

## Failure modes
A non-array payload raises `rows must be an array`. A constraint error aborts and leaves the old hours intact.

## Changing this safely
Keep `security invoker` and keep grants; making it definer would let any authenticated user rewrite hours.

## Known gaps
- Header comment (schema.sql:2) lists only three migrations; see [[Schema history and seed data]].

## Changes since this note was written (2026-11-19)
New function `enforce_booking_cap()` (PL/pgSQL, takes a `pg_advisory_xact_lock` per customer, counts other pending or confirmed future bookings in Europe/London time, raises `booking_limit_reached` with code P0001 at 3 or more) with trigger `bookings_enforce_cap` before insert or update of status, date, start, user. This closes the former race on the 3-booking cap. The app maps the error to the "limit" result.
