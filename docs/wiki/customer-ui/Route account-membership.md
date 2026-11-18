---
area: customer-ui
source: [app/account/membership/page.tsx, components/account/membership/PlanCards.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route account-membership
**In plain English:** `/account/membership` shows your current plan (with days left) or, if you have none, the three plans with a JOIN button. There is no payment yet: joining just starts a free trial membership. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/account/membership/page.tsx` | async server page (+ local `PastPlans`, `daysLeftLabel`) |
| `components/account/membership/PlanCards.tsx` | client plan cards + JOIN |

## Page flow
1. `await searchParams`; `requireCustomer("/account/membership")` ([[requireCustomer]]).
2. `getMembershipOverview(viewer, today)` returns `{current, past}` ([[Customer memberships lib]]); `today = shopNow().date` ([[Time model]]).
3. `?joined=1` only counts if `current` exists; shows "You're in" and a Book link.
4. `?plan=` is honoured only if it is in `MEMBERSHIP_PLANS` (`page.tsx:~64`), used to highlight a card (links come from Home and `ServiceStep`: [[Route home and terms]], [[Booking steps]]).
5. Has `current`: plan name, "Active until ...", `daysLeftLabel` (today counts; `n <= 1` shows "Last day today"), note "one upcoming member cut at a time" ([[Upcoming booking limits]]). Else: `PlanCards` plus banner "Payments aren't set up yet — joining starts a free 30-day trial membership." ([[Placeholder membership]]; 30 = `MEMBERSHIP_DAYS`, `lib/membership.ts:14`, [[Membership rules]]).
6. `PastPlans` lists earlier periods ([[Membership period]]).

## PlanCards (client)
- Renders `MEMBERSHIP_PLANS` (name, `formatGBP(priceGBP)`/mo, perks); the highlighted plan is inverted white.
- `join(id)` calls `joinPlanAction(id)` ([[Actions account-membership]]) inside `useTransition`.

| Result | UI |
|---|---|
| ok | `router.replace("/account/membership?joined=1")` |
| `auth` | `router.push("/login?next=/account/membership")` |
| `already_member` | show error, `router.refresh()` |
| other / throw | red error in `aria-live="assertive"` |

All buttons disabled while pending; the busy one reads "JOINING…".

## Security notes
`noindex`. Page trusts only server values; `plan` query param is whitelisted and the action re-validates the id ([[Trust boundary]]).

## Failure modes
Double click or second tab: `already_member` path; refresh shows the active plan.

## Known gaps
- Home page prices are separate hard-coded text ([[Route home and terms]]).
- `PlanCards` redefines `FOCUS` instead of importing it from `ui.ts` ([[Visual style rules]]).
