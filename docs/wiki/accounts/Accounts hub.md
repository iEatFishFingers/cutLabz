---
area: accounts
source: [proxy.ts, lib/supabase, lib/customer, lib/membership.ts, lib/admin/auth.ts, app/login, app/signup, app/forgot-password, app/auth/callback, app/account]
commit: 14ba133
updated: 2026-11-18
---
# Accounts hub

**In plain English:** customers can create an account, sign in, reset a forgotten password, change their details, cancel/reschedule their own bookings (up to 24 hours before) and "join" a membership that is free for now (no payment). Sign-in is handled by Supabase Auth; the site just wraps it with forms, session cookies and guards. Back to [[00 Index]].

## Notes in this area
| Note | What |
|---|---|
| [[Supabase clients]] | the three ways code talks to Supabase (which key, which cookies) |
| [[Auth gating]] | which URLs need a login, and why proxy is not the real guard |
| [[Viewer and session]] | `getViewer`, [[requireCustomer]], `safeNext` |
| [[Admin auth]] | [[requireAdmin]] |
| [[Membership rules]] | the pure numbers: 30 days, 1 member cut, 3 bookings, 24h |
| [[Customer bookings lib]] / [[Customer memberships lib]] | self-service logic |
| [[Actions account-bookings]] / [[Actions account-membership]] | [[Server action]] wrappers |
| [[Auth forms and actions]] | sign-up/in/reset forms + actions |
| [[Routes customer auth]] / [[Route auth-callback]] / [[Route account-settings]] | pages and routes |

## Flows at a glance
| Flow | Steps |
|---|---|
| Sign up | `/signup` form -> `signUp` action -> Supabase emails confirm link -> [[Route auth-callback]] exchanges code -> cookie set -> redirect to `next` |
| Sign in | `/login` -> `signIn` -> `signInWithPassword` -> cookies set by the [[Supabase clients|server client]] -> `redirect(next)` |
| Reset | `/forgot-password` -> `requestReset` -> email link -> callback -> `/account/settings?reset=1` -> change password |
| Sign out | `signOut` action -> clears session -> `/` |
| Join membership | [[Actions account-membership]] -> [[Customer memberships lib]] (service-role insert) |

Session = Supabase cookies named `sb-*-auth-token*`; see [[Auth gating]]. Concepts: [[Trust boundary]], [[Row Level Security]], [[Service-role key]], [[Anon key]], [[Placeholder membership]], [[24-hour rule]], [[Security Model]], [[Request Lifecycles]].

## Pages for the signed-in area (other notes)
[[Route account]], [[Route account-reschedule]], [[Route account-membership]] (S5). Admin sign-in is in [[Admin hub]].

## Known gaps
- No membership "cancel" exists in code despite the lib being described as subscribe/cancel: see [[Customer memberships lib#Known gaps]].
