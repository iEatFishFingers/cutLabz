---
area: concepts
source: [lib/customer/viewer.ts]
commit: 14ba133
updated: 2026-11-18
---
# requireCustomer

**In plain English:** the server-side gatekeeper for customer pages. It loads the signed-in "viewer" (user id, email, name, phone, active membership) or sends the visitor to `/login`, remembering where they wanted to go.

| Function | Used in | Signed out -> | Code |
|---|---|---|---|
| `getViewer()` | any server component | `null` | `lib/customer/viewer.ts:63` |
| `requireCustomer(next)` | `/account/**` pages | `redirect("/login?next=...")` | `lib/customer/viewer.ts:66-70` |
| `requireCustomerAction()` | [[Server action|server actions]] | `throw new Error("Unauthorized")` | `lib/customer/viewer.ts:73-77` |
| `safeNext(next)` | login redirects | non-relative / `//` / `\` -> `/account` (open-redirect guard) | `lib/customer/viewer.ts:80-84` |

Loading (`load()`, lines 30-58): returns `null` without Supabase env; `auth.getUser()` verifies the JWT; reads the membership active today via the RLS client; name/phone come from `user_metadata`.

Caveats: membership query errors are ignored (shows as non-member); a missing anon key throws rather than returning `null` ([[Open issues]]).

Details: [[Viewer and session]]. Related: [[requireAdmin]], [[Membership period]], [[Proxy request gate]], [[Auth gating]], [[Route account]], [[Security Model]], [[00 Index]].
