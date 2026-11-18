---
area: accounts
source: [app/login/page.tsx, app/signup/page.tsx, app/forgot-password/page.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Routes customer auth

**In plain English:** three public pages: `/login`, `/signup`, `/forgot-password`. If you are already signed in, login and signup send you on to where you were heading. Hub: [[Accounts hub]]; [[00 Index]].

## Files
| route | file | form |
|---|---|---|
| `/login` | `app/login/page.tsx` | `LoginForm` |
| `/signup` | `app/signup/page.tsx` | `SignupForm` |
| `/forgot-password` | `app/forgot-password/page.tsx` | `ForgotForm` |

All wrap in `AuthCard` and set `robots: noindex` (see [[Auth forms and actions]]).

## Structure (Cache Components pattern)
The page shell is static; the part reading `searchParams` and cookies sits in a `<Suspense>` child `Gate` (`login:18-19`, `signup:18-19`) with the form as fallback. Gate: `safeNext(sp.next)` ([[Viewer and session]]), `if (await getViewer()) redirect(next)`, else render the form with `next`. See [[Cache Components]].

| Page | Extras |
|---|---|
| login | `?error=link` shows "That link has expired..." (`:32`), set by [[Route auth-callback]] |
| signup | none |
| forgot-password | no Gate: static, no redirect for signed-in users |

## Reads / Writes
Query `next` (sanitised by `safeNext`, default `/account`) and `error`. Writes nothing itself; forms call actions.

## Security notes
Open-redirect protection via `safeNext`. `/forgot-password` is not in the proxy matcher ([[Auth gating]]). Admin sign-in is separate: [[Route admin-login]].

## Failure modes
Fallback form renders `next="/account"` briefly during Suspense; the hidden `next` field then comes from the real form, so no mismatch on submit (the Gate form replaces it).

## Depends on / Used by
Depends: [[Auth forms and actions]], [[Viewer and session]]. Used by: [[Auth gating]] (redirect target), [[Site nav and links]], [[Route book]] (sign-in prompts, unverified).

## Tests covering it
None found ([[Tests unit]]).

## Changing this safely
Keep `getViewer()` inside Suspense: calling it in the page body breaks static rendering.

## Known gaps
None found.
