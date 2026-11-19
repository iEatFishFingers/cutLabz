---
area: concepts
source: [lib/membership.ts, lib/booking-server.ts]
commit: 14ba133
updated: 2026-11-18
---
# Upcoming booking limits

**In plain English:** one account may hold at most 3 future bookings at once, and at most 1 of them may be a free member cut. This stops one person hoarding slots.

| Limit | Value | Code |
|---|---|---|
| Any upcoming active bookings | `MAX_UPCOMING_BOOKINGS = 3` | `lib/membership.ts:18` |
| Upcoming member cuts | `MAX_UPCOMING_MEMBER_CUTS = 1` | `lib/membership.ts:16` |

Counting (`lib/booking-server.ts:199-215`): the user's `pending`/`confirmed` rows from yesterday onward, minus those already started (`hasStarted`). A row counts as a member cut if it has `membership_id` or its service is membership-kind. Error code `limit`.

Race guard (member cuts only, `lib/booking-server.ts:255-271`): after insert, if more than 1 upcoming member cut exists and older ones fill the quota, the new row is cancelled. **The 3-booking cap has no race guard**, so parallel requests could exceed it ([[Open issues]]).

Only rows with the customer's `user_id` count; admin walk-in bookings without a `user_id` do not.

Related: [[Booking server]], [[Request Lifecycles#Book a cut]], [[Member cut]], [[Membership rules]], [[Store Supabase]], [[Tests unit]], [[00 Index]].

## Changes since this note was written (2026-11-19)
The 3-upcoming-booking cap now has a database guard (see [[DB functions]]), so concurrent requests cannot exceed it. Issue 10 in [[Open issues]] is closed.
