---
area: accounts
source: [app/auth/callback/route.ts]
commit: 14ba133
updated: 2026-11-18
---
# Route auth-callback

**In plain English:** when someone clicks the link in a confirm-your-email or reset-your-password email, they land here. The route swaps the one-time code in the link for a real login session, then sends them on (to their account, or the password-change screen). Hub: [[Accounts hub]]; [[00 Index]].

## Files
`app/auth/callback/route.ts`: a Route Handler, `GET` only (19 lines).

## Flow (`:5-18`)
1. Read `code` and `next` query params; `next = safeNext(...)` ([[Viewer and session]]).
2. Missing code or longer than 2000 chars -> redirect `/login?error=link`.
3. `createSupabaseServerClient()` then `auth.exchangeCodeForSession(code)` ([[Supabase clients]]). Cookies are set here (route handlers may write cookies).
4. Error or exception -> `/login?error=link`.
5. Success -> redirect to `new URL(next, origin)`.

## Reads / Writes
| | |
|---|---|
| Reads | `code`, `next` |
| Writes | Supabase auth cookies (`sb-*-auth-token*`), see [[Auth gating]] |

## Who sends people here
| Flow | `next` |
|---|---|
| sign-up confirm | the page they started from (`signUp` in [[Auth forms and actions]]) |
| password reset | `/account/settings?reset=1` (`requestReset`), landing on [[Route account-settings]] |

## Security notes
- Open redirect closed: `next` is same-site-relative only; redirect base is `request.nextUrl.origin`.
- The code is single-use and PKCE-bound to the browser that requested it (Supabase SSR behaviour; unverified in this repo), so opening the email on a different device can fail and show `?error=link` (shown on [[Routes customer auth]] `/login`).
- Not in the proxy matcher ([[Auth gating]]): no session needed to arrive.

## Failure modes
Expired/used link, other-browser PKCE mismatch, missing env (caught by try/catch): all collapse to one generic `error=link` message.

## Depends on / Used by
Depends: [[Supabase clients]], [[Viewer and session]]. Used by: emails from Supabase ([[Auth forms and actions]]). Concepts: [[Server action]], [[Trust boundary]].

## Tests covering it
None found ([[Tests unit]]).

## Changing this safely
Supabase dashboard must list `<origin>/auth/callback` as an allowed redirect URL (unverified; see [[Environment and deployment]]). Keep `safeNext`.

## Known gaps
No distinction between failure causes (by design, but hard to debug).
