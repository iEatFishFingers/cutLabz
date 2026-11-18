---
area: accounts
source: [proxy.ts]
commit: 14ba133
updated: 2026-11-18
---
# Auth gating

**In plain English:** a gatekeeper file (`proxy.ts`) bounces visitors who have no login cookie away from `/account` and `/admin`. It is only a convenience: the pages and actions re-check who you are themselves, so forging a cookie gets you nothing. Mechanics (matcher, refresh) are in [[Proxy request gate]]; hub [[Accounts hub]]; [[00 Index]].

## Route table (`proxy.ts:6-26`)
| Path | No `sb-*auth-token*` cookie | Has cookie |
|---|---|---|
| `/admin/login` (+sub) | pass | session refreshed |
| other `/admin/**` | redirect `/admin/login` | pass (refresh) |
| `/account/**` | redirect `/login?next=<path+query>` | pass (refresh) |
| `/book`, `/login`, `/signup` | pass | refresh only |

Matcher (`proxy.ts:52-54`): `/admin/:path*`, `/account/:path*`, `/book`, `/login`, `/signup`. `/forgot-password` and `/auth/callback` are not matched (no session work needed there).

## "Has session" test
Cookie name starts `sb-` and contains `auth-token` (`proxy.ts:11-13`). This only checks presence, not validity.

## Real guards
| Area | Guard |
|---|---|
| customer pages | [[requireCustomer]] (redirect) in [[Viewer and session]] |
| customer actions | `requireCustomerAction()` (throws) |
| admin pages/actions | [[requireAdmin]] / `requireAdminAction()` in [[Admin auth]] |
| data | [[Row Level Security]] |

Comment at `proxy.ts:4-5` states proxy is "NOT the security boundary". See [[Trust boundary]], [[Security Model]].

## Rules & invariants
- Cookie present: proxy builds an SSR client and calls `getClaims()` to refresh and rewrite cookies (`proxy.ts:48`); if env missing it returns untouched (`:31`).
- `next` is passed unsanitised from proxy but cleaned by `safeNext` later ([[Viewer and session]], `safeNext`).

## Failure modes
Expired/garbage cookie: proxy lets you through, then `requireCustomer` redirects to `/login?next=...` anyway. A logged-in non-admin hitting `/admin` is passed by proxy and rejected by [[Admin auth]] (signs them out).

## Changing this safely
New protected route? add to matcher and to the `isAccount/isAdmin` logic, and still call a `require*` guard in the page. See [[Route account-settings]], [[Routes customer auth]].

## Known gaps
- `/login` and `/signup` are in the matcher but with no cookie just `next()`; with a cookie they only refresh. Redirecting signed-in users is done in the pages (`getViewer`), not here.
