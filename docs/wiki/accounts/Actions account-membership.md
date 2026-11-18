---
area: accounts
source: [app/account/membership/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Actions account-membership

**In plain English:** one server action, `joinPlanAction`, that starts a free 30-day membership on the chosen plan (Core, Plus or Premium). No payment is taken: this is a stand-in until billing exists. Hub: [[Accounts hub]]; [[00 Index]].

## Public API (`app/account/membership/actions.ts`, `"use server"`)
| action | line | returns |
|---|---|---|
| `joinPlanAction(planId)` | 15 | `JoinResult` codes `auth/invalid/already_member/error` |

## Flow
1. `planId` must be a string matching an id in `MEMBERSHIP_PLANS` (`:16`, [[Membership rules]]).
2. `requireCustomerAction()` or return `auth` (`:20-21`, [[Viewer and session]]).
3. `subscribeToPlan(viewer, planId, shopNow().date)` ([[Customer memberships lib]]).
4. `revalidatePath` on `/account`, `/account/membership`, `/book` (`:23-25`) so the new member status shows everywhere, including the booking page ([[Route book]]).

## Rules & invariants
- Two plan checks exist: the constant list here, and the catalog `kind==="membership"` check in the lib.
- Already active (or overlapping) -> `already_member` from the DB exclusion constraint ([[Membership period]]).
- [[Placeholder membership]]: no payment, no cancel action.

## Security notes
[[Server action]]: public endpoint, so the plan id is treated as untrusted and the user id comes from the session only. See [[Trust boundary]]. The actual insert uses the [[Service-role key]] inside the lib.

## Failure modes
Unexpected errors are logged and return a generic message (`:27-29`).

## Depends on / Used by
Depends: [[Customer memberships lib]], [[Viewer and session]], [[Membership rules]], [[Booking shared]]. Used by: [[Route account-membership]] (plan cards).

## Tests covering it
Lib behaviour: [[Tests unit]]; the action wrapper itself unverified.

## Changing this safely
When payments are added, do not grant membership here; do it from a verified payment event. Keep revalidating the three paths.

## Known gaps
- `/account/layout` data (member badge, if any) is not revalidated; only the three paths above (unverified whether it matters).
- No leave/cancel action.
