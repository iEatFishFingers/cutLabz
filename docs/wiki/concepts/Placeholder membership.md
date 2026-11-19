---
area: concepts
source: [lib/customer/memberships.ts, lib/membership.ts, app/account/membership/actions.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Placeholder membership

**In plain English:** there is no payment system yet. Clicking "join" on a plan immediately creates a free 30-day membership. The prices shown are for display only until Stripe (or similar) is added.

| Fact | Code |
|---|---|
| "Placeholder (unpaid) self-serve memberships" | `lib/customer/memberships.ts:2` |
| Prices £29.99 / £39.99 / £69.99 are display-only "until Stripe exists" | `lib/membership.ts:62-72` |
| `subscribeToPlan` validates the plan is a `membership`-kind service, then inserts with the service-role key | `lib/customer/memberships.ts:68-108` |
| Unused payment columns on bookings: `payment_status`, `stripe_payment_intent` | `supabase/schema.sql:71-72` |

Risk: any account can become a member for free, again every 30 days. Recorded in [[Open issues]].

Related: [[Membership period]], [[Member cut]], [[Actions account-membership]], [[Route account-membership]], [[Customer memberships lib]], [[Service-role key]], [[00 Index]].

## Changes since this note was written (2026-11-19)
Still a placeholder: memberships are free and self-serve. What changed is that members can now cancel (end of period) and resume. Payments remain the top open product item.
