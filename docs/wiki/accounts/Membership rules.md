---
area: accounts
source: [lib/membership.ts]
commit: 14ba133
updated: 2026-11-18
---
# Membership rules

**In plain English:** one small file holds every membership number and date rule: how long a membership lasts, how many free cuts a member can hold, how many bookings anyone can hold, and the "no changes within 24 hours" rule. It does no database or clock access, so it is easy to test. Hub: [[Accounts hub]]; [[00 Index]].

## Constants (`lib/membership.ts`)
| const | value | line | meaning |
|---|---|---|---|
| `MEMBERSHIP_DAYS` | 30 | 14 | placeholder period, start day included ([[Placeholder membership]]) |
| `MAX_UPCOMING_MEMBER_CUTS` | 1 | 16 | free member cuts held at once ([[Member cut]]) |
| `MAX_UPCOMING_BOOKINGS` | 3 | 18 | any active upcoming bookings ([[Upcoming booking limits]]) |
| `SELF_SERVE_NOTICE_MIN` | 24*60 | 20 | cancel/reschedule cutoff ([[24-hour rule]]) |

## Functions
| fn | line | rule |
|---|---|---|
| `membershipPeriod(today)` | 22 | `{startsOn: today, endsOn: today+29d}` (inclusive, via `addDays` in [[Booking shared]]) |
| `isActiveOn(m,date)` | 26 | `startsOn <= date <= endsOn` |
| `memberCanBookOn(m,today,date)` | 30 | active today AND `today <= date <= endsOn`: a free cut cannot be booked after the plan ends |
| `minutesUntil(date,startMin,now)` | 40 | whole-day diff*1440 + startMin - now.min |
| `canSelfServe` | 49 | `minutesUntil >= 1440` (exactly 24h is allowed) |
| `hasStarted` | 56 | `minutesUntil <= 0` |
| `MEMBERSHIP_PLANS` | 63 | core 29.99, plus 39.99, premium 69.99 GBP: display only until payments exist |

Dates are shop-local `YYYY-MM-DD`, times minutes from midnight ([[Time model]]).

## Where enforced
| Rule | Enforced in |
|---|---|
| member-cut/date check | `membershipBlock` ([[Booking server]] `lib/booking-server.ts:111-119`) and [[Customer bookings lib]] |
| 1 member cut, 3 bookings | `lib/booking-server.ts:204,210`, re-checked after insert `:263` |
| 24h | [[Customer bookings lib]] `:126,145` |
| overlap of periods | DB `memberships_no_overlap` ([[Table memberships]], [[Membership period]]) |

## Used by
[[Viewer and session]], [[Customer memberships lib]], [[Actions account-membership]] (plan ids), [[Route account-membership]] (plan cards).

## Failure modes / Changing safely
Changing a constant changes behaviour everywhere at once; UI copy that quotes "24 hours" is hard-coded text ([[Customer bookings lib]] messages). Tests: [[Tests unit]].

## Known gaps
- Plan ids in `MEMBERSHIP_PLANS` and `services.kind = 'membership'` rows are two sources of truth; [[Actions account-membership]] checks the former, [[Customer memberships lib]] the latter.
