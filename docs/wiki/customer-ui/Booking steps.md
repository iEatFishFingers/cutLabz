---
area: customer-ui
source: [components/booking/ServiceStep.tsx, BarberStep.tsx, DateTimeStep.tsx, DetailsStep.tsx, ReviewStep.tsx, ConfirmedStep.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Booking steps
**In plain English:** each screen of the booking wizard is one component. They are dumb: they show choices from the catalog and report picks back to [[Booking flow shell]] through an `update(patch)` callback. Only the time step talks to the server (to ask for free times). Hub: [[Customer UI hub]]; back to [[00 Index]].

## Components
| Component | Step | What it does | Server call |
|---|---|---|---|
| `ServiceStep` | 0 | radio cards for services (membership vs one-off) + add-on toggles; exports `StepHeader`, `radioKeyDown`, `FOCUS_RING`, card classes | none |
| `BarberStep` | 1 | "any" + barber cards with monogram; `hideHeader` prop reused by reschedule | none |
| `DateTimeStep` | 2 | month grid of the bookable window (Monday-first), closed days greyed, then time slots | `getSlotsAction` ([[Actions book]]) |
| `DetailsStep` | 3 | name, email, phone, notes; errors after blur or `showErrors` | none |
| `ReviewStep` | 4 | summary sections with edit links, price `quote`, error + action link, terms link | none (submit is in the shell) |
| `ConfirmedStep` | done | focuses heading, shows booking rows and links to `/account` and `/` | none |

## Behaviour notes
- Membership gating: `canUseService` (in [[Booking flow shell]]) lets one-offs through to everyone and a membership cut only to the plan holder. Non-members see "JOIN TO UNLOCK" linking `/account/membership?plan=<id>` ([[Route account-membership]]) (`ServiceStep.tsx:142`). Concept: [[Member cut]].
- `DateTimeStep` fetches whenever date/service/barber/add-ons change, keyed by `requestKey`; stale responses ignored via an `active` flag; a selected time no longer returned is cleared. Props `fetchSlots`, `hideHeader`, `refreshKey` let [[Account booking components|RescheduleForm]] reuse it with `getRescheduleSlotsAction`. Slot logic itself: [[Slot computation]], [[Availability engine]].
- Membership cuts cannot be picked after plan `endsOn` (`DateTimeStep.tsx:136-139`); copy "Your membership runs until ...".
- `DetailsStep` limits come from `LIMITS` (name 80, email 254, phone 20, notes 500; `lib/booking-shared.ts:181`) via `maxLength`; the real validation is `validateDetails` ([[Booking shared]]).
- `ConfirmedStep` shows `£0 · Covered by your membership` when total is 0 and kind is membership (`ConfirmedStep.tsx:40`). Booking id shown: [[Booking reference]].
- All are `"use client"`; cards use framer-motion with staggered delay (`0.04 * order`), see [[Visual style rules]].

## Depends on / Used by
Depend on [[Catalog static]] types, [[Booking shared]], [[Availability engine]] (`formatTime`, `dayOfWeek`). Used only by `BookingFlow` and (Barber/DateTime) `RescheduleForm`.

## Security notes
None of these enforce rules; the server re-checks ([[Booking server]], [[Trust boundary]]).

## Failure modes
Slot fetch error renders "Couldn't load times. Check your connection." with a retry (`attempt` counter).

## Known gaps
- `StepHeader index` values are 1..5 across files (`ServiceStep:155`, `BarberStep:46`, `DateTimeStep:117`, `DetailsStep:72`, `ReviewStep:65`); renumbering one step requires editing each.
- Step helpers are exported from `ServiceStep` and imported by siblings, an odd coupling.
