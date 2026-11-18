---
area: concepts
source: [lib/membership.ts, lib/customer/bookings.ts]
commit: 14ba133
updated: 2026-11-18
---
# 24-hour rule

**In plain English:** a customer can cancel or move their own booking online only while it is at least 24 hours away. Inside 24 hours they must contact the shop; the admin panel is not bound by this rule.

| Item | Value / code |
|---|---|
| Constant | `SELF_SERVE_NOTICE_MIN = 24 * 60` (1440 min), `lib/membership.ts:20` |
| Check | `canSelfServe(date, startMin, now)` = `minutesUntil(...) >= 1440`, `lib/membership.ts:49-53` |
| Enforced on cancel | `lib/customer/bookings.ts:126` |
| Enforced on reschedule | `lib/customer/bookings.ts:145` |
| UI flag | `canSelfServe` on listed bookings, `lib/customer/bookings.ts:82` (hides buttons in [[Account booking components]]) |

The UI flag is cosmetic; the server re-checks inside the action ([[Trust boundary]]). Exactly 24h00 before is still allowed (`>=`). Admin status changes go through [[Actions admin-bookings]] and never call `canSelfServe` (grep: only `lib/customer/bookings.ts` uses it).

Related: [[Time model]], [[Membership rules]], [[Actions account-bookings]], [[Route account-reschedule]], [[Request Lifecycles]], [[00 Index]].
