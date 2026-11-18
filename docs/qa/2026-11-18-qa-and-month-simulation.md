# Cut Labz: QA record, 2026-11-18

**Type:** persona QA (customer side and admin side), then a four-week simulation with 10 agents, then two fix rounds.
**Tier:** deep (5 personas per side, then a 10-agent month).
**Target:** production, https://cutlabz-roan.vercel.app.
**Commits tested:** `a835985` (customer round), `104cd85` (admin round), `484909d` (month), fixes landed in `104cd85`, `484909d`, `a9871d1`.

Every figure carries a provenance tag: **DATA** (computed from the system), **OWNER** (the owner said it), **ASSUMPTION** (my estimate, with a range) or **UNKNOWN** (not known). **No money volume has been given by the owner yet**, so every exposure below is a formula with ranges, not a forecast. Figures from the example data are **ILLUSTRATIVE** (synthetic) and are not business figures.

## Scope
- In scope: the booking flow, customer accounts and memberships, the admin area, the database rules.
- Off limits (read, not changed): the cloned marketing pages, the cloned terms text, the nav and footer, the YouTube and Maps embeds.
- Out of scope by owner choice: translation (everyone reads English).

## Business context
| Input | Value | Provenance |
|---|---|---|
| What is sold | One-off Haircut £20, Haircut + Beard £25, add-ons £5 each; memberships Core £29.99, Plus £39.99, Premium £69.99 a month (display prices; a free 30-day placeholder, no payment taken) | DATA |
| Member cuts | Charged £0; a member may hold one upcoming member cut at a time, with no limit on how many over time | DATA |
| Volume (bookings a month) | Not given | UNKNOWN |
| Average ticket | About £20–£25 for one-offs | DATA (list prices) |
| Capacity | Two barbers; 30-minute cuts; hours Tuesday to Saturday, 11:00–21:00 (about 20 back-to-back cuts a day each, 5 days a week) | DATA |
| Margin per cut / barber cost | Not given | UNKNOWN |
| Cost of an unhappy customer | Not given | UNKNOWN |
| How money is collected today | Nothing online; "card deposit coming soon"; collection is by hand | DATA |
| Fees in the terms (cloned) | £5 late cancellation, £5 no-show, £5 booking outside the membership cycle; none can be applied today | DATA |

## Money map
- **Charge points:** the booking total is worked out by the server from the price list when a booking is made. Nothing is collected online.
- **Giveaways:** member cuts are free (one upcoming at a time, repeated each period); Premium members' add-ons on their own cut are free.
- **Built-in losses:** no-shows and cancellations. The cloned terms promise a £5 fee for each, but nothing can charge it.
- **Recurring flows:** membership fees (display prices only; no fee is taken).
- **Controls:** a database limit of 3 upcoming bookings per customer, a database rule against double booking, server-side prices, an audit record of who changed a booking, and a stale-tab check on status changes and rescheduling.

## What the month showed (simulation, 10 agents, 4 weeks)
- **DATA:** 52 bookings at the end: 21 completed, 18 cancelled, 9 confirmed, 4 no-show; 5 memberships. 167 logged actions: 130 worked, 16 were refused by the rules, 21 flagged odd.
- **DATA:** the consistency check (overlaps, caps, member-cut limits, audit fields, completed-in-future, membership overlaps) passed in all 4 weeks and at the end. Zero double bookings and zero cap breaches in the month, including two-tab races.
- **Not captured:** the money ledger. The month's data was deleted before the money was exported. **This is the gap the new `system-simulation` skill closes (ledger before cleanup).**

## Findings
Status: Fixed = changed and pushed on the date above. Open = not changed.

| ID | Title | Severity | Evidence | Found by | Loss type | £ / month (low / likely / high) | Confidence | Status |
|---|---|---|---|---|---|---|---|---|
| F1 | 3-booking cap bypassed by parallel submits | Major | SEEN | Breaker | Revenue lost (slots held) | ~£0 after the fix | High | Fixed |
| F2 | Customers never told when the shop cancels | Must fix | SEEN | c3, c4, c7 | Revenue lost + churn | see E3 | Medium | Fixed (account notice); no email or SMS |
| F3 | "Contact the shop" with no contact details | Must fix | SEEN | c2, c3, c4 | Trust, lost rebooking | No direct figure | High | Fixed |
| F4 | Two-tab reschedule overwrote silently | Must fix | SEEN | c5 | Missed appointment | ~£0–£25 per incident | High | Fixed |
| F5 | Premium "free add-ons" had no way to use them | Must fix | SEEN | c2 | Refund exposure | see E7 | Medium | Fixed (add-ons free on the Premium cut) |
| F6 | Reopen made a customer-cancelled booking a no-show | Must fix | SEEN | c4 | Customer record harm | No direct figure | High | Fixed |
| F7 | Past bookings still read CONFIRMED | Must fix | SEEN | c3, c4, c7, c8 | Unrecorded no-shows | see E6 | High | Fixed (neutral "Past" label, staff close-out list) |
| F8 | No privacy policy, no account deletion, no way to cancel a membership | Must fix | SEEN | Skeptic | Compliance, refunds | see E8 | High | Fixed |
| F9 | Stale admin tab could overwrite a cancel; future bookings completable | Major | SEEN | Breaker | Wrong records | ~£0–£25 per incident | High | Fixed |
| F10 | No audit trail of staff changes | Major | SEEN | Skeptic | Disputes, accountability | No direct figure | High | Fixed |
| F11 | Non-admin signed out by touching an admin URL; login message revealed a valid password | Major | SEEN | Breaker | Security | No direct figure | High | Fixed |
| F12 | Time off / hours over bookings gave no lasting marker; no list of customers to phone | Major | SEEN | Skeptic, c-staff | Lost bookings | see E3 | Medium | Fixed (Needs-attention panel) |
| F13 | Forms wiped on error; dropped connection wiped the page | Major | SEEN | Breaker, Mobile | Re-do under pressure | No direct figure | High | Fixed |
| F14 | Cancel and No-show looked identical; completed looked like cancelled | Major | SEEN | Non-native | Wrong action by mistake | ~£0–£25 per incident | Medium | Fixed |
| F15 | Misleading "didn't go through?" hint on clear refusals | Should fix | SEEN | c1, c3, c5, c6 | Double-submits | No direct figure | High | Fixed |
| F16 | Cap and member-cut refusals only at the last step; late bookings under 24h can't be cancelled | Should fix | SEEN | c1, c3, c4 | Friction | No direct figure | High | Fixed (early warnings) |
| F17 | Home page never finishes loading on 3G (autoplay video) | Major | SEEN | Mobile | Lost visitors | UNKNOWN | Low | **Open: cloned page, not changeable** |
| F18 | Unconditional "unlimited haircuts", prices with no free-trial note, terms written for members only, fees that can't be applied | Major | SEEN | Skeptic, c3 | Mis-selling risk | see E8 | Medium | **Open: cloned text, owner to raise** |
| F19 | No notifications by email or SMS | Product | SEEN | c4, c7 | Churn | see E3 | Medium | **Open: owner's call** |
| F20 | Members can book and skip unlimited free cuts, with no consequence | Product | SEEN | c7 | Revenue leaked | see E1, E2 | Medium | **Open: owner's call** |
| F21 | "Any available" reschedule could silently move you to another barber | Should fix | CODE | c5 | Friction | No direct figure | Medium | Fixed (starts on your own barber) |
| F22 | Blank "Last changed by" line in the booking sheet (cause not found) | Minor | SEEN (testers) | Skeptic-owner | No direct figure | Low | Display made safe; likely a test-reading artifact |

## What if X broke? (exposure)
All ranges are formulas with ASSUMPTION inputs unless a figure is tagged DATA. They show the shape of the risk and which input matters most.

| ID | Scenario | Formula | Low | Likely | High | Provenance | What would change my mind |
|---|---|---|---|---|---|---|---|
| **E1** | **Free-cut allowance used heavily.** Members use their free cut as often as the rule allows | net per member per month = plan fee − (cuts used × list price of the cut); negative means the shop gives away more than it earns from that member | Core: 1 cut → £29.99 − £20 = **+£9.99** | Core: 2 cuts → £29.99 − £40 = **−£10.01** | Core: 5 cuts → £29.99 − £100 = **−£70.01** | Plan fees DATA; list price of a member cut ASSUMPTION (valued at the Haircut £20; Premium at Haircut + Beard £25) | How many cuts members actually use, and whether the barber would otherwise be idle (a free cut then costs only the barber's pay, not its list price) |
| **E2** | No-shows cannot be charged | bookings a month × no-show rate × ticket | 50 × 5% × £22.50 = **£56** | 100 × 10% × £22.50 = **£225** | 200 × 15% × £22.50 = **£675** | Volume and rate ASSUMPTION; ticket DATA | The real monthly volume and no-show rate |
| **E3** | Shop cancels (illness, time off) and the customer is not told or does not log in | cancels a month × (ticket + chance of losing a member × 12 × plan fee) | 4 × (£22.50 + 5% × £360) = **£162** | 8 × (£22.50 + 10% × £360) = **£468** | 16 × (£22.50 + 20% × £360) = **£1,512** | Plan fee DATA; cancel counts and churn chance ASSUMPTION | How often the shop actually cancels, and whether customers rebook |
| **E6** | No-shows left unrecorded, so the £5 fee (cloned terms) can never be applied | unrecorded no-shows a month × £5 | 5 × £5 = **£25** | 10 × £5 = **£50** | 30 × £5 = **£150** | Fee DATA (terms); counts ASSUMPTION | Whether the owner will enforce the fee |
| **E7** | Refund exposure when payments go live: a £69.99 plan that promised "free add-ons" it didn't deliver | affected Premium members × £69.99 | 1 × £69.99 = **£70** | 3 × £69.99 = **£210** | 10 × £69.99 = **£700** | Plan fee DATA; counts ASSUMPTION | Fixed on 2026-11-18, so this applies only to anyone who joined before the fix |
| **E8** | A "cancel anytime" claim with no way to cancel (fixed), no privacy policy (fixed) | refunds of a month's fee for members who could not cancel; regulator action not modelled | **£0** | **£30** (one Core fee) | **£70** (one Premium fee) | Fees DATA; counts ASSUMPTION | Fixed. Statutory maximum penalties exist but are not realistic outcomes for a small shop; not modelled |
| **E9** | Double booking, or the same slot sold twice | prevented by a database rule | **£0** | **£0** | **£0** | DATA (0 overlaps in 52 bookings across 4 weeks, and the rule is enforced in the database) | A failure of the database rule itself |
| **E10** | Outage at peak | peak bookings per hour × £22.50 × hours down | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Peak volume and the hosting plan's uptime |
| **E11** | All revenue depends on in-shop collection (no online payment) | share of revenue forgotten or disputed × monthly revenue | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Monthly revenue and how staff record payment |

### Top five by monthly exposure (likely column, ASSUMPTION inputs)
1. **E3** shop cancellations nobody hears about: about £468 a month at the likely inputs (the churn part dominates; a year of a Core fee is taken as about £360).
2. **E2** no-shows: about £225 a month.
3. **E1** the free-cut allowance: about −£10 per Core member a month at 2 cuts, rising to −£70 at 5. This is a plan-design question, not a bug.
4. **E7** refunds for the Premium promise: about £210 one-off, only for early joiners.
5. **E6** unrecorded no-show fees: about £50 a month.

These do not add up to a total: the scenarios overlap (a no-show can also be an unrecorded fee), so don't sum them.

## Simulation ledger (ILLUSTRATIVE: example data, not the month's data)
The ledger was run on the example data now in the database, to check the formulas. It is synthetic.

| Measure | Count | Amount |
|---|---|---|
| Money that moved (realised) | 208 | £4,390.00 |
| Booked, not yet realised | 29 | £620.00 |
| Lost (no-shows and cancellations) | 47 | £945.00 |
| Given away at list price (member cuts) | 20 | £430.00 |
| Recurring fees (display prices, one per membership) | 7 | £289.93 |

In the example data the value given away (£430) is about 1.5× the fee income (£289.93). That is the E1 pattern in miniature, on invented numbers. It is a prompt to check the real plan economics, not a measurement.

## What held up
- Prices, totals and member-cut rules were consistent on every screen for four weeks; existing bookings kept their price after a service price change (30 of 30).
- The server recomputes prices and refuses tampered ones.
- Account deletion works end to end (cancels upcoming bookings, anonymises records, removes the login), checked in the database.
- Stale-tab status changes are refused, twice, live.
- The 24-hour cancel lock held on the server.

## Decisions needed from the owner
- **Free-cut allowance:** how many free cuts should a member get in a period, and should missed ones count? (E1, E2, F20)
- **Notifications:** email or SMS for cancellations and changes, or rely on the account notice? (F2, F19, E3)
- **No-show and late-cancel fees:** will they be enforced once payments exist? (E2, E6)
- **Premium add-ons:** which add-ons are included? (F5; today, all of them)
- **The cloned pages:** the terms and homepage claims (F17, F18).
- **How payment is collected** (deposit, in the shop, online).

## Unknowns the owner must fill
| Question | Why it matters | Changes which number |
|---|---|---|
| How many bookings a month, and how many are members? | Sets the scale of everything | E1, E2, E3, E6 |
| How many cuts does a member typically book a month? | Decides whether a plan makes or loses money | E1 |
| What does a cut cost to deliver (barber pay)? | A free cut costs this, not its list price | E1 |
| What share of slots sell at peak? | A lost slot only costs money if it would have sold | E2, E3 |
| What share of bookings are no-shows today? | Real rate replaces the 5–15% guess | E2, E6 |
| How often does the shop cancel, and do customers rebook? | Drives churn | E3 |
| Will the £5 fees be charged? | Turns E6 from a loss into recovered income | E2, E6 |

## Caveats
- Agents followed scripts, and the time-shift (a 7-day move) left some bookings still in the future in week 2, so a couple of planned tests (a second member cut after a cut had "happened") could not run until later. Simulation artifact, not a product bug.
- Memberships joined after a shift were not shifted, so their dates looked out of step. Simulation artifact.
- Some staff marked every past booking "completed" because nobody told them who really attended. A process gap, not a code bug.
- No browser pass has been run on the final code (the Needs-attention panel, the add-on block and the tile markers were checked only by tests).
- Money inputs are mostly assumptions until the owner answers the table above.

## Cleanup record
- Created: throwaway accounts for each persona and for 10 simulation roles (customers and two staff logins), their bookings, walk-ins, memberships and one time-off block.
- Removed: all of those, scoped by account id and by creation time after the first dry run was blocked for being too broad. The Haircut price was restored to £20, and the barber login links were removed.
- Left in place: the owner's own booking and membership, and the **example data** (16 example customers, 283 bookings, two time-off blocks, changed opening hours). Remove it with `npm run seed:mock:remove` before real customers arrive.
- To do: change the temporary admin password that was shown in the chat earlier.
