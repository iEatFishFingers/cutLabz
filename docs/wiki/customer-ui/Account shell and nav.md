---
area: customer-ui
source: [components/account/AccountShell.tsx, components/account/AccountNav.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Account shell and nav
**In plain English:** every `/account/*` page sits inside a shared frame: a header with the logo, a "Book a cut" button, Sign out, the customer's name/email and membership badge, then a tab bar (Appointments, Membership, Settings). Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `components/account/AccountShell.tsx` | async server component + `AccountShellFallback` |
| `components/account/AccountNav.tsx` | client tab bar using `usePathname` |
| `app/account/layout.tsx` | mounts shell inside `<Suspense fallback={<AccountShellFallback/>}>` ([[Route account-settings]]) |

## AccountShell
- Server component: calls `requireCustomer("/account")` ([[requireCustomer]], [[Viewer and session]]). Because it reads cookies it must be under Suspense; its own comment says so ([[Cache Components]]).
- Shows `v.name || v.email`, email, and a badge `"{plan} member · until {d Mon}"` from `viewer.membership` ([[Membership rules]]).
- Sign out: `<form action={signOut}>` (a [[Server action]] from [[Auth forms and actions]]), styled with `secondaryBtn` from `components/account/auth/styles`.
- `AccountShellFallback` is a static skeleton with `animate-pulse` guarded by `motion-safe`.

## AccountNav
Client-only for `usePathname`. `TABS`: `/account`, `/account/membership`, `/account/settings`. "Appointments" is active for `/account` and any `/account/bookings*` path; other tabs by `startsWith` (`AccountNav.tsx:12-14`). Active tab: `aria-current="page"`, `border-white`. Tab strip scrolls horizontally on small screens. Style: [[Visual style rules]].

## Security notes
Every account page is double-guarded: [[Proxy request gate]]/[[Auth gating]] and `requireCustomer` here. Pages also call `requireCustomer` themselves with their own `next` path ([[Route account]], [[Route account-membership]]), so the redirect target is correct per page.

## Failure modes
Signed-out: redirect to login. The shell's `next` is always `/account` (it cannot know the deeper path), so only the page-level call restores the exact URL.

## Known gaps
- Shell passes a fixed `/account` as `next`; deep links rely on the per-page guard or proxy.
- Note `AccountNav` tab "Settings" has no matching booking/membership logic here; owned by [[Route account-settings]].
