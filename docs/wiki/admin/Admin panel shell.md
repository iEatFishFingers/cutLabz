---
area: admin
source: [app/admin/(panel)/layout.tsx, components/admin/AdminShell.tsx, components/admin/AdminNav.tsx, app/admin/error.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Admin panel shell
**In plain English:** the frame around every admin page: black header with the signed-in email and a Sign out button, a tab bar (Calendar, Hours, Time off, Services, Barbers), and an error screen offering "Sign in again" or "Try again".

## Files
| path | role |
|---|---|
| `app/admin/(panel)/layout.tsx` | sets `noindex` metadata, wraps children in `<Suspense>` + `AdminShell` |
| `components/admin/AdminShell.tsx` | async server component: `requireAdmin()`, header, `signOut` form, `<AdminNav/>`, `<main>` |
| `components/admin/AdminNav.tsx` | client; `usePathname` highlights active tab (`/admin` exact, others prefix) |
| `app/admin/error.tsx` | client error boundary for all of `/admin/**` |

## Rules & invariants
- Shell reads the session, so it must sit inside Suspense ([[Cache Components]] rules): layout.tsx:15-17, fallback `AdminShellFallback`.
- "New booking" is not in the nav; it is a button in `DateNav` ([[Admin board components]]).
- `error.tsx` uses the `retry` prop (stable since Next 16.3 per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:331`), not the older `reset`.

## Security notes
- The layout's `requireAdmin()` guards the shell render only. Each page and action calls its own guard because layouts do not protect server actions: [[Admin auth]], [[requireAdmin]], [[Trust boundary]].
- Non-admin or expired session: redirect to `/admin/login`; the error screen text mentions "session expired".

## Failure modes
Loader/DB throws bubble to `error.tsx` (generic message; logs `error` to the browser console).

## Depends on / Used by
Depends on [[Route admin-login]] (`signOut`), [[Admin auth]]. Wraps [[Route admin-dashboard]], [[Route admin-catalog]], [[Route admin-schedule]], [[Route admin-new-booking]]. Hub [[Admin hub]], [[00 Index]].

## Changing this safely
Add a nav tab by editing `LINKS` in AdminNav.tsx:6-12 and creating the page under `(panel)`.

## Known gaps
None found.
