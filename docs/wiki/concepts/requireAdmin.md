---
area: concepts
source: [lib/admin/auth.ts, app/admin/(panel)/layout.tsx]
commit: 14ba133
updated: 2026-11-18
---
# requireAdmin

**In plain English:** the server-side gatekeeper for the admin panel. It asks Supabase "who is this?", then checks the person is listed in the `admins` table. Non-admins are sent to the admin login page; server actions get an "Unauthorized" error instead.

| Function | Used in | On failure | Code |
|---|---|---|---|
| `requireAdmin()` | pages/layouts | `redirect("/admin/login")` or `?error=not-admin` | `lib/admin/auth.ts:40-46` |
| `requireAdminAction()` | [[Server action|server actions]] | `throw new Error("Unauthorized")` | `lib/admin/auth.ts:49-53` |

Steps (`check()`, `lib/admin/auth.ts:13-34`):
1. `auth.getUser()` verifies the JWT with Supabase Auth (not just the cookie).
2. Select own row from [[Table admins]] (allowed by RLS policy "admin reads self").
3. Not found -> **signs the user out** (best effort) and fails.
4. Returns `{userId, email, db}`; `db` is the user's RLS-scoped client, so admin queries are authorised again by `private.is_admin()` ([[DB functions]]).

Page variant is wrapped in React `cache()` (per request); action variant is not.

Side effect worth knowing: a signed-in **customer** who opens `/admin` is signed out of their customer session (step 3). See [[Open issues]].

Details: [[Admin auth]]. Related: [[requireCustomer]], [[Proxy request gate]], [[Admin panel shell]], [[Row Level Security]], [[Security Model]], [[00 Index]].
