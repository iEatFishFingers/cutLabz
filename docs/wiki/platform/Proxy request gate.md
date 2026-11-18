---
area: platform
source: [proxy.ts]
commit: 14ba133
updated: 2026-11-18
---
# Proxy request gate

**In plain English:** `proxy.ts` runs before certain pages. It checks whether the browser has a Supabase login cookie, bounces people without one away from admin/account pages, and quietly refreshes the login token for people who have one. It is a convenience layer, not the real lock: each page and action re-checks via [[requireAdmin]] / [[requireCustomer]]. Which route needs what is in [[Auth gating]]. Hub: [[Platform hub]]; [[00 Index]].

## Files
| Path | Role |
|---|---|
| `proxy.ts` | the whole gate (54 lines); Next 16 name for what used to be middleware |

## Mechanics
| Step | Code |
|---|---|
| Matcher | `/admin/:path*`, `/account/:path*`, `/book`, `/login`, `/signup` (`proxy.ts:53`). Anything else never runs it |
| Session test | any cookie named `sb-*` containing `auth-token` (`:11-13`); presence only, not validity |
| No cookie, `/admin/**` | redirect to `/admin/login` (except `/admin/login` itself passes) (`:16-19`) |
| No cookie, `/account/**` | redirect to `/login?next=<path+query>` (`:20-24`) |
| Cookie present | build SSR client with [[Anon key]], `await supabase.auth.getClaims()` refreshes token, new cookies written to request and response (`:28-49`) |
| Env missing | returns `NextResponse.next` without refreshing (`:31`) |

Verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: `middleware` is deprecated and renamed `proxy`; default runtime is Node.js; server actions are POSTs to their page route, so a matcher that skips a path skips actions too (hence per-action checks).

## Security notes
- Explicitly "NOT the security boundary" (`proxy.ts:4-5`). A forged `sb-...auth-token` cookie passes the gate but fails [[requireCustomer]]/[[requireAdmin]] on the page.
- Admin vs customer is not distinguished here: a signed-in customer reaches `/admin` past the proxy and is stopped by [[Admin auth]].
- Related: [[Supabase clients]], [[Trust boundary]], [[Security Model]].

## Failure modes
- Expired cookie: not redirected here; page guards redirect instead.
- `getClaims()` network failure: not caught in the file (unverified behaviour).

## Changing this safely
Edit `matcher` if adding gated routes; it must be a constant (analysed at build time). Never rely on it alone.

## Known gaps
- `/forgot-password`, `/auth/callback` are not in the matcher (no refresh there; likely fine, unverified).
- `/book`, `/login`, `/signup` are matched only for token refresh; signed-in users are not redirected away from login pages here.
