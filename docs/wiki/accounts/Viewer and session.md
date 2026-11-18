---
area: accounts
source: [lib/customer/viewer.ts]
commit: 14ba133
updated: 2026-11-18
---
# Viewer and session

**In plain English:** "the viewer" is the signed-in customer as a small object (id, email, name, phone, current membership, and a database handle that can only see their own rows). Pages ask for it; if nobody is signed in they get sent to the login page. See [[requireCustomer]] for the concept; hub [[Accounts hub]]; [[00 Index]].

## Public API / exports (`lib/customer/viewer.ts`)
| export | line | behaviour |
|---|---|---|
| `Viewer` type | 11 | `userId,email,name,phone,membership,db` |
| `toMembership(row)` | 23 | snake_case row -> [[Membership rules|Membership]] |
| `getViewer()` | 63 | viewer or `null`; request-cached |
| `requireCustomer(next)` | 66 | pages: `redirect('/login?next=...')` |
| `requireCustomerAction()` | 73 | actions: throws `Error("Unauthorized")`, not cached |
| `safeNext(next)` | 80 | open-redirect guard |

## Reads
| What | Source |
|---|---|
| user | `db.auth.getUser()` (verifies JWT with Auth server, `:34`) via the [[Supabase clients|server client]] |
| name/phone | `user_metadata.full_name` / `.phone` (`:53-54`) |
| membership | `memberships` where `starts_on <= today <= ends_on`, newest `ends_on`, limit 1 (`:40-47`); `today = shopNow().date` ([[Time model]]) |
| env | `hasSupabaseEnv()` false -> `null` (`:31`) |

`load` is wrapped in React `cache` (`:60`) so layout + page share one lookup per request. Reading cookies makes it dynamic: callers sit under Suspense ([[Cache Components]]).

## Rules & invariants
- `safeNext`: non-string, not starting `/`, starting `//`, or containing `\` all fall back to `/account` (`:80-83`).
- Membership is only attached if `isActiveOn` (`:55`), see [[Membership rules]].
- `viewer.db` is RLS-bound: it is the user's own client ([[Row Level Security]]).

## Security notes
Uses `getUser()` not `getSession()`, so a forged cookie fails. Actions must use `requireCustomerAction` (never the cached one) so each call re-verifies. See [[Trust boundary]].

## Depends on / Used by
Depends: [[Supabase clients]], [[Membership rules]]. Used by: [[Actions account-bookings]], [[Actions account-membership]], [[Route auth-callback]], [[Routes customer auth]], [[Route account-settings]], [[Auth forms and actions]], [[Customer bookings lib]] (as `BookingViewer`).

## Failure modes
Supabase down/invalid token -> treated as signed out. Membership query error is ignored (`rows` undefined -> no membership), so a DB error silently shows a non-member.

## Changing this safely
Keep `safeNext` strict: it protects sign-in/callback redirects. Duplicate `toMembership` exists in [[Customer memberships lib]].

## Known gaps
- `toMembership`/`MembershipRow` are duplicated in `lib/customer/memberships.ts:8-14`.
- Membership query errors are swallowed (`viewer.ts:40-48`).
