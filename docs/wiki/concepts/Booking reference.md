---
area: concepts
source: [lib/store.ts, lib/store-memory.ts, lib/admin/bookings.ts, lib/customer/bookings.ts, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Booking reference

**In plain English:** each booking gets a short code like `CL-3F9A2C` that customers can quote to the shop. It is made from the first 6 characters of the booking's random id.

| Fact | Code |
|---|---|
| Format `CL-` + first 6 hex chars of the UUID, uppercased | `lib/store.ts:123` |
| Stored in unique column `bookings.reference` | `supabase/schema.sql:58` |
| Collision -> retry with a new UUID, up to 3 attempts | `lib/store.ts:121-162` |
| Admin bookings derive it the same way | `lib/admin/bookings.ts:225-226` |
| Fallback when a row lacks one | `lib/customer/bookings.ts:69` |

**Inconsistency:** the DB column default is 8 uppercase hex chars without `CL-` (`supabase/schema.sql:58`), so a row inserted without an explicit reference (e.g. via the SQL editor) gets a different format. See [[Open issues]].

Related: [[Table bookings]], [[Store Supabase]], [[Store memory fallback]], [[Booking server]], [[Booking steps]], [[Admin bookings lib]], [[00 Index]].
