---
area: customer-ui
source: [app/account/bookings/[id]/reschedule/page.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route account-reschedule
**In plain English:** `/account/bookings/<id>/reschedule` lets a customer move one of their upcoming bookings. The page confirms the booking is theirs and still changeable, then shows the reschedule form. If the booking starts in under 24 hours it shows a "contact the shop" message instead. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/account/bookings/[id]/reschedule/page.tsx` | async server page |
| `components/account/bookings/RescheduleForm.tsx` | the form, see [[Account booking components]] |

## Flow
1. `await params`; `id` must match `/^[A-Za-z0-9-]{1,64}$/` else `notFound()` (line 19).
2. `requireCustomer("/account/bookings/<id>/reschedule")` ([[requireCustomer]]).
3. `listMyBookings(viewer, shopNow())`; find `id` in `upcoming`. Not found (not yours, past, cancelled): `notFound()`. Ownership therefore comes from the viewer-scoped list ([[Customer bookings lib]]).
4. `!booking.canSelfServe`: static panel "Within 24 hours" with terms link and Back button ([[24-hour rule]]).
5. Else `getClientCatalog()` (uncached here, unlike [[Route book]]; [[Catalog loader]]) and render `RescheduleForm` with a viewer subset (name, email, phone, membership plan/endsOn).

Page is dynamic (params + cookies); the account layout's Suspense covers it ([[Account shell and nav]]).

## Server actions
Used by the form, not the page: `getRescheduleSlotsAction`, `rescheduleBookingAction` ([[Actions account-bookings]]).

## Security notes
`noindex`. Id validated before use; ownership via viewer-scoped query; the actions re-check everything ([[Trust boundary]], [[Row Level Security]]).

## Failure modes
| Case | Result |
|---|---|
| bad id / foreign / past booking | 404 |
| inside 24h | read-only message |
| signed out | login redirect with exact `next` |

## Changing this safely
Keep the `canSelfServe` branch in sync with the action's own check; the page is only a guard.

## Known gaps
- No `not-found.tsx` customisation found in my scope (default 404 used; unverified).
- Catalog fetched without `'use cache'` on this route (extra DB reads per visit).
