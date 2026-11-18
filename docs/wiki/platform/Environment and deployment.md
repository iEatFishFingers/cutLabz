---
area: platform
source: [.env.local.example, lib/supabase/admin.ts, lib/supabase/env.ts, lib/supabase/server.ts, proxy.ts]
commit: 14ba133
updated: 2026-11-18
---
# Environment and deployment

**In plain English:** the app needs three Supabase settings to talk to the real database. If they are missing it falls back to an in-memory fake in development but refuses to work in production. Secrets live in `.env.local` (git-ignored); only names are documented here. Hub: [[Platform hub]]; [[00 Index]].

## Env vars (names only)
| Name | Exposure | Read in |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `lib/supabase/admin.ts:18`, `env.ts:4`, `server.ts:8`, `proxy.ts:28`, seed script |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public ([[Anon key]]) | `lib/supabase/server.ts:9`, `proxy.ts:29` |
| `SUPABASE_SERVICE_ROLE_KEY` | server only ([[Service-role key]]) | `lib/supabase/admin.ts:19`, `env.ts:5`, seed script |
| `CUTLABZ_INTEGRATION` | dev flag `=1` | integration tests ([[Tests integration]]) |
| `NODE_ENV` | set by Next | production guards below |

Template: `.env.local.example` (the only `.env*` file not git-ignored).

## Behaviour when env is missing
`hasSupabaseEnv()` (`lib/supabase/env.ts`) needs URL + service-role key.
| Place | Dev | Production |
|---|---|---|
| `lib/store.ts:83` | [[Store memory fallback]] | throws |
| `lib/catalog-db.ts:37-39` | static seed catalog ([[Catalog static]]) | throws |
| `lib/customer/memberships.ts:23` | in-memory | throws |
| `proxy.ts:31` | skips refresh | skips refresh (no throw) |

## Deployment wiring
- Hosting: Vercel (`.vercel` is git-ignored). No `vercel.json`; env vars must be set in the Vercel project (unverified).
- Backend: one Supabase project (Postgres, RLS, Auth); schema in `supabase/schema.sql` ([[Schema history and seed data]]). `.mcp.json` exposes it to AI tools as MCP server `supabase`.
- Build uses `next build` ([[Tooling and config]]).

## Security notes
Never prefix the service-role key with `NEXT_PUBLIC_`. See [[Security Model]], [[Supabase clients]], [[Row Level Security]].

## Failure modes
Prod without env: pages error ("Supabase env is missing in production"). Dev without env: data vanishes on restart (in-memory).

## Known gaps
`proxy.ts` and `lib/supabase/server.ts` need the anon key, but `hasSupabaseEnv()` does not check it, so a missing anon key is not caught by the production guards.
