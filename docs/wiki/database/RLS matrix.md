---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# RLS matrix

**In plain English:** a grid of who can do what to each table. RLS is switched on for every table, so with no matching policy the answer is "nothing". The server's [[Service-role key]] skips RLS entirely, which is why most customer writes go through it. Part of the [[Database hub]]; back to [[00 Index]]; theory in [[Row Level Security]].

## Roles
| Role | Meaning |
|---|---|
| anon | not signed in, [[Anon key]] |
| customer | signed in, not in [[Table admins]] |
| admin | signed in and `private.is_admin()` true ([[DB functions#private.is_admin]]) |
| service role | admin client, bypasses RLS ([[Supabase clients]]) |

## Matrix (R=select, W=insert/update/delete, -=none)
| Table | anon | customer | admin | service role | Policies (schema.sql) |
|---|---|---|---|---|---|
| barbers | R | R | R W | R W | :115, :121 |
| services | R | R | R W | R W | :116, :122 |
| addons | R | R | R W | R W | :117, :123 |
| availability | R | R | R W | R W | :118, :124 |
| time_off | - | - | R W | R W | :125 |
| bookings | - | R own (`user_id = auth.uid()`) | R W | R W | :126, :135-136 |
| memberships | - | R own | R W | R W | :178-181 |
| admins | - | R own row | R own row only | R W | :129-130 |

Notes
- Catalog `select using (true)` has no `to` clause, so it applies to all roles (anon + authenticated).
- Admin policies are `for all to authenticated using (private.is_admin()) with check (private.is_admin())`; anon never matches.
- `admins` has no `admin all` policy: an admin sees only their own row, and nobody writes via the API.
- `replace_availability` runs as invoker, so it follows the `availability` row ([[DB functions]]).
- `private` schema: no usage for anon; authenticated has usage (:95-96).

## Who uses which column of the matrix
| Path | Client / role |
|---|---|
| [[Catalog loader]], [[Store Supabase]], [[Customer memberships lib]] | service role |
| [[Admin auth]], admin pages ([[Admin hub]]) | admin user session (RLS) |
| [[Viewer and session]] | customer session reading own membership |

## Security notes
Guests book without an account: the server validates and inserts with the service-role key ([[Booking server]], [[Trust boundary]]). The whole model is summarised in [[Security Model]].

## Changing this safely
Adding a table: enable RLS in the same migration, then add policies; absent policies default to deny. Never put the service-role key in client code.

## Known gaps
- Policies use plain `create policy` (not idempotent): re-running schema.sql on a populated DB errors; see [[Schema history and seed data]].
- Live policy state not compared with the file (unverified; file only).
