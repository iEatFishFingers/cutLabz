---
area: accounts
source: [components/account/AuthCard.tsx, components/account/auth/actions.ts, components/account/auth/origin.ts, components/account/auth/LoginForm.tsx, components/account/auth/SignupForm.tsx, components/account/auth/ForgotForm.tsx, components/account/auth/Fields.tsx, components/account/auth/styles.ts]
commit: 14ba133
updated: 2026-11-18
---
# Auth forms and actions

**In plain English:** the sign-up, sign-in and forgot-password forms, plus the server code they call. Errors are deliberately vague so nobody can discover which emails have accounts. Hub: [[Accounts hub]]; [[00 Index]].

## Files
| path | role |
|---|---|
| `AuthCard.tsx` | server component: black card + [[Site nav and links|Nav]] wrapper |
| `auth/actions.ts` | `"use server"`: `signUp, signIn, requestReset, signOut` |
| `auth/origin.ts` | `requestOrigin()` from `x-forwarded-host`/`host` headers |
| `auth/LoginForm, SignupForm, ForgotForm` | client forms using `useActionState` |
| `auth/Fields.tsx`, `styles.ts` | `Field`, `FormError`, shared classes |

## Actions (`auth/actions.ts`)
| action | line | what |
|---|---|---|
| `signUp` | 19 | validate -> `auth.signUp` with `data:{full_name,phone}`, `emailRedirectTo` = origin + `/auth/callback?next=` |
| `signIn` | 57 | `signInWithPassword`, then `redirect(next)` |
| `requestReset` | 73 | `resetPasswordForEmail`, redirectTo callback `?next=/account/settings?reset=1` |
| `signOut` | 87 | `auth.signOut()` then `redirect("/")` |

## Rules & invariants
- Password 8-72 chars (`:31-32`; 72 = bcrypt limit); name/phone/email via `validateDetails` ([[Booking shared]]); input length caps 200/100/400 (`:20-23`).
- `next` always through `safeNext` ([[Viewer and session]]).
- Anti-enumeration: `user_already_exists` returns the same "check your email" state (`:47`); sign-in failure is always "Incorrect email or password." except `email_not_confirmed` (`:67`, which does reveal that the email exists and is unconfirmed); reset ignores the result (`:80`).
- Sign-up with an immediate session (email confirmation off in Supabase) redirects at once (`:53`).
- Origin comes from request headers, never client input (`origin.ts:4`); it forces `http` only for `proto==="http"` else https.

## Security notes
All are [[Server action]]s using the [[Supabase clients|server client]] ([[Anon key]]); cookies are set by Supabase SSR on success. See [[Trust boundary]], [[Security Model]].

## Depends on / Used by
Used by [[Routes customer auth]], [[Route auth-callback]] (the emailed link target), [[Account shell and nav]] (sign-out, unverified exact caller). Styles: [[Visual style rules]].

## Failure modes
Supabase unreachable on sign-in: the `error` path returns the generic message. `createSupabaseServerClient` throws if env is missing (uncaught: 500).

## Tests covering it
None found in [[Tests unit]] (unverified).

## Changing this safely
Keep messages identical across "exists/doesn't exist" branches. Update both the form `maxLength` and server caps together.

## Known gaps
- `email_not_confirmed` leaks account existence (`actions.ts:67`).
- Email regex in `requestReset` (`:75`) differs from `validateDetails`.
- No rate limiting in app code (relies on Supabase; unverified).
