---
area: accounts
source: [lib/supabase/admin.ts, lib/supabase/env.ts, lib/supabase/server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Supabase clients

**In plain English:** the server can reach the database in two very different ways. One acts *as the logged-in visitor* (limited by security rules); the other acts as the *owner of the whole database* (no limits). Picking the right one is the core security decision of the app. Hub: [[Accounts hub]]; index: [[00 Index]].

## Files
| path | role |
|---|---|
| `lib/supabase/server.ts` | `createSupabaseServerClient()`: user-session client |
| `lib/supabase/admin.ts` | `getSupabaseAdmin()`: service-role singleton |
| `lib/supabase/env.ts` | `hasSupabaseEnv()`: presence check |

## Comparison
| | server client | admin client |
|---|---|---|
| Key (env name) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` ([[Anon key]]) | `SUPABASE_SERVICE_ROLE_KEY` ([[Service-role key]]) |
| URL | `NEXT_PUBLIC_SUPABASE_URL` | same |
| [[Row Level Security]] | applies | bypassed |
| Cookies | reads/writes visitor's auth cookies via `cookies()` (`server.ts:15-31`) | none: `persistSession:false, autoRefreshToken:false` (`admin.ts:20`) |
| Cached | no (new each call, needs request) | module singleton (`admin.ts:7`) |
| Missing env | throws (`server.ts:10`) | throws (`admin.ts:12`) |

`hasSupabaseEnv()` checks only URL + service-role key (`env.ts:3-6`), not the anon key. Both files import `server-only` so they cannot reach the browser bundle.

## Cookie handling
`setAll` wraps `cookieStore.set` in try/catch (`server.ts:22-29`): in Server Components cookies are read-only (verified in Next docs `cookies.md`: setting is only supported in Server Functions and Route Handlers), so refresh is left to [[Proxy request gate]].

## Used by
[[Viewer and session]] and [[Admin auth]] (server client); [[Customer memberships lib]] and [[Store Supabase]] (admin client); [[Auth forms and actions]], [[Route auth-callback]] (server client); [[Environment and deployment]].

## Security notes
Service-role key must never be `NEXT_PUBLIC_`. Any admin-client write must be scoped by hand to the caller's user id (see `lib/customer/memberships.ts:2`). See [[Trust boundary]], [[Security Model]].

## Failure modes
Missing env: anything calling these throws; [[Viewer and session]] guards with `hasSupabaseEnv()` and treats it as signed out.

## Changing this safely
Do not add `persistSession` to the admin client; do not export the admin client to client components.

## Known gaps
- `hasSupabaseEnv()` ignores the anon key, so env with only service-role set passes the check but `createSupabaseServerClient` then throws (`viewer.ts:31-32`).
