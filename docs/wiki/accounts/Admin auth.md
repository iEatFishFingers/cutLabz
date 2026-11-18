---
area: accounts
source: [lib/admin/auth.ts]
commit: 14ba133
updated: 2026-11-18
---
# Admin auth

**In plain English:** being logged in is not enough to run the admin panel; your user id must also be on the `admins` list in the database. These helpers check both, and throw you out if the second check fails. Concept: [[requireAdmin]]. Hub: [[Accounts hub]]; [[00 Index]]. Admin UI: [[Admin hub]].

## Public API (`lib/admin/auth.ts`)
| export | line | behaviour |
|---|---|---|
| `AdminSession` | 7 | `{userId,email,db}` (db = user-session client) |
| `requireAdmin()` | 40 | pages/layouts: redirect `/admin/login` (no session) or `/admin/login?error=not-admin` |
| `requireAdminAction()` | 49 | server actions: throws `Error("Unauthorized")` |

## Flow of `check()` (`:13-34`)
1. [[Supabase clients|server client]] -> `auth.getUser()` (JWT verified with Auth server). Fail -> `no-session`.
2. Select own row from `admins` via RLS ([[Table admins]]; policy lets users see only their row; see [[RLS matrix]]). No row or error -> best-effort `auth.signOut()`, `not-admin`.
3. Else `{userId,email,db}`.

`requireAdmin` uses `cache(check)` (`:37`) so layout + page do one check; `requireAdminAction` calls `check()` fresh.

## Security notes
- Allow-list in DB, not an env var or role claim. Helper `private.is_admin()` in [[DB functions]] backs RLS for admin writes.
- Non-admin who is signed in is signed out on purpose (`:27`), which also logs out a customer who wandered to `/admin`.
- Proxy only checks cookie presence ([[Auth gating]]); this is the real gate. See [[Trust boundary]], [[Security Model]].

## Depends on / Used by
Depends: [[Supabase clients]]. Used by: [[Admin panel shell]], [[Route admin-login]], [[Actions admin-bookings]], [[Admin bookings lib]], [[Admin catalog lib]].

## Failure modes
`admins` query error is treated like "not admin" (sign-out + redirect), so a DB outage locks admins out rather than letting anyone in (fail closed).

## Changing this safely
Every new admin action must call `requireAdminAction()` first. Do not use the service-role client before this check.

## Known gaps
- Unlike [[Viewer and session]], `check()` does not guard `hasSupabaseEnv()`; missing env makes `createSupabaseServerClient` throw instead of redirecting.
- `signOut` inside `check()` runs during render and may fail silently (caught, `:26-30`).
