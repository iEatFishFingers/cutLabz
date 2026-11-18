---
area: concepts
source: [lib/supabase/server.ts, proxy.ts, .env.local.example]
commit: 14ba133
updated: 2026-11-18
---
# Anon key

**In plain English:** the public Supabase key (env var `NEXT_PUBLIC_SUPABASE_ANON_KEY`). It is safe to expose because on its own it only grants what RLS allows; combined with a user's login cookie it acts as that user.

| Used in | How | Code |
|---|---|---|
| `createSupabaseServerClient()` | anon key + visitor cookies via `@supabase/ssr`; RLS applies | `lib/supabase/server.ts:7-33` |
| [[Proxy request gate]] | refreshes session cookies with `auth.getClaims()` | `proxy.ts:28-48` |
| [[Viewer and session]] | `auth.getUser()` then reads own memberships | `lib/customer/viewer.ts:32-47` |
| [[Admin auth]] | `auth.getUser()` + `admins` lookup; admin pages query with this client | `lib/admin/auth.ts:14-24` |

No browser-side Supabase client was found (grep for `createBrowserClient`: none); auth forms post to [[Server action|server actions]] instead ([[Auth forms and actions]]).

Gap: `hasSupabaseEnv()` does not check this key, so a missing anon key throws instead of "signed out" (see [[Open issues]]).

Related: [[Service-role key]], [[Row Level Security]], [[Supabase clients]], [[Environment and deployment]], [[Security Model]], [[00 Index]].
