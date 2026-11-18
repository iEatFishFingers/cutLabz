---
area: admin
source: [app/admin/login/page.tsx, app/admin/login/LoginForm.tsx, app/admin/login/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Route admin-login
**In plain English:** the staff sign-in page at `/admin/login`. It signs in with email and password through Supabase, then checks the user is in the `admins` table; if not, it signs them straight back out. It sits outside the `(panel)` route group so it never gets the admin shell and cannot redirect-loop.

## Files
| path | role |
|---|---|
| `app/admin/login/page.tsx` | server page; `LoginGate` (in Suspense) redirects already-signed-in admins to `/admin`, shows `?error=not-admin` message |
| `app/admin/login/LoginForm.tsx` | client form, `useActionState(signIn)`, `maxLength` 254 / 200 |
| `app/admin/login/actions.ts` | `signIn`, `signOut` server actions |

## Public API
- `signIn(prev, formData): Promise<LoginState>` actions.ts:10
- `signOut(): Promise<void>` actions.ts:43 (signs out, redirects `/admin/login`)

## Reads / Writes
| What | How |
|---|---|
| Auth | `signInWithPassword` via `createSupabaseServerClient()` ([[Supabase clients]]) sets session cookies |
| Admin check | `admins` select by `user_id` ([[Table admins]]) |

## Rules & invariants
- Rejects (generic error) if email empty or >254 chars, password empty or >200 (actions.ts:13-22).
- Wrong credentials: always `"Incorrect email or password."` (actions.ts:8).
- Valid login but not an admin: `signOut()` then `"This account doesn't have admin access."` (actions.ts:36-39).

## Security notes
- Anon key + RLS only; no service role. The `admins` policy lets a user read their own row ([[RLS matrix]]).
- Proxy treats `/admin/login*` as public ([[Proxy request gate]], [[Auth gating]]).
- Server-side check, not UI: [[Trust boundary]].

## Failure modes
Supabase error from `signInWithPassword` returns the generic message. `signOut` has no guard (harmless).

## Changing this safely
Keep the admin check after sign-in; [[Admin auth]] repeats it on every request, so removing one still leaves the other.

## Known gaps
- The "no admin access" message confirms to a caller that an email/password pair is a valid account (low-severity oracle). No app-level rate limiting seen (unverified whether Supabase Auth limits apply).

Links: [[Admin hub]], [[Admin panel shell]], [[Server action]], [[requireAdmin]], [[00 Index]].
