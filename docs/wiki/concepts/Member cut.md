---
area: concepts
source: [lib/catalog.ts, lib/booking-server.ts, lib/membership.ts, lib/booking-shared.ts]
commit: 14ba133
updated: 2026-11-18
---
# Member cut

**In plain English:** members don't pay per visit. Their plan (Core, Plus or Premium) lets them book the matching "membership cut" service for £0, one at a time, on dates while the plan is active. Everyone else books a paid one-off service.

| Rule | Code |
|---|---|
| Member services are `kind: "membership"` with price 0: `core`, `plus`, `premium` | `lib/catalog.ts:41-43`, `supabase/schema.sql:197-199` |
| Plan id == service id: a Core member can only book `core` ("Members only." otherwise) | `membershipBlock`, `lib/booking-server.ts:111-124` |
| Plan must be active today and end on/after the booking date | `memberCanBookOn`, `lib/membership.ts:30-32` |
| Booking row stores `membership_id` | `lib/booking-server.ts:252`, `supabase/schema.sql:184` |
| Max 1 upcoming member cut | [[Upcoming booking limits]] |
| Premium: add-ons cost £0 (keyed on service id `premium`) | `addonPrice`, `lib/booking-shared.ts:104-106` |
| `getSlots` returns "Members only." for non-members and `[]` past the plan end | `lib/booking-server.ts:150-154` |

The same `membershipBlock` gate runs on reschedule ([[Customer bookings lib]]).

Related: [[Membership period]], [[Placeholder membership]], [[Membership rules]], [[Booking server]], [[Route account-membership]], [[Viewer and session]], [[00 Index]].
