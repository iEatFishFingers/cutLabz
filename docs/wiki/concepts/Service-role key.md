---
area: concepts
source: [lib/supabase/admin.ts, lib/supabase/env.ts, lib/store.ts, lib/catalog-db.ts, lib/customer/memberships.ts]
commit: 14ba133
updated: 2026-11-18
---
# Service-role key

**In plain English:** a master database key that ignores all RLS rules. It lives only on the server (env var `SUPABASE_SERVICE_ROLE_KEY`) and is used where the server has already checked who the user is and must write data customers aren't allowed to write directly.

| Fact | Code |
|---|---|
| Client factory `getSupabaseAdmin()`, singleton, no session persistence | `lib/supabase/admin.ts:10-23` |
| `import "server-only"` makes a client-bundle import fail the build | `lib/supabase/admin.ts:1` |
| `hasSupabaseEnv()` = URL + service-role key both set | `lib/supabase/env.ts:2-7` |

Used by (grep `getSupabaseAdmin`):
| Module | Why |
|---|---|
| [[Store Supabase]] | insert bookings (no customer insert policy), list day bookings for availability, customer reads/cancel/reschedule (each query filtered by `user_id`, `lib/store.ts:166`) |
| [[Catalog loader]] | read catalog incl. `time_off` (no public policy) |
| [[Customer memberships lib]] | insert memberships |
| [[Admin bookings lib]] | `createAdminBooking` calls `insertBooking` from `lib/store.ts` (`lib/admin/bookings.ts:5,211`), so admin-made bookings are inserted with this key, behind `requireAdminAction` |

All other admin reads/writes use the admin's own session + RLS ([[Admin auth]]).

Rule: never prefix it `NEXT_PUBLIC_`, never import `lib/supabase/admin.ts` from a `'use client'` file. Names of env vars: [[Environment and deployment]].

Related: [[Anon key]], [[Row Level Security]], [[Supabase clients]], [[Security Model]], [[Trust boundary]], [[00 Index]].
