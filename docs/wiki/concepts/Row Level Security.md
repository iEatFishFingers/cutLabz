---
area: concepts
source: [supabase/schema.sql, lib/supabase/server.ts, lib/supabase/admin.ts]
commit: 14ba133
updated: 2026-11-18
---
# Row Level Security

**In plain English:** RLS is a Postgres feature that filters every query by "who is asking". With it on, a signed-in customer's database connection can only see their own bookings, and only admins can change the catalog, even if the app code had a bug.

| Who connects | Key | RLS? | Gets |
|---|---|---|---|
| Visitor / customer session | [[Anon key]] + auth cookie | yes | catalog read; own bookings + memberships read |
| Admin session | [[Anon key]] + auth cookie | yes | everything via `private.is_admin()` policies |
| Next.js server | [[Service-role key]] | **bypassed** | everything: code must scope by `user_id` itself |

Key facts (`supabase/schema.sql`):
- RLS enabled on all 8 app tables (lines 106-112, 177).
- Catalog tables have public read `using (true)` (115-118); `time_off` deliberately has none (45-46).
- `bookings` has no public read/insert; customers read own rows only (132-136).
- Admin policies all call `private.is_admin()` ([[DB functions]]), which lives in a non-exposed schema (93-103).

Full table x role grid: [[RLS matrix]]. Why the server still uses the service-role key for customer bookings: [[Security Model]].

Related: [[Table bookings]], [[Table admins]], [[Supabase clients]], [[requireAdmin]], [[Trust boundary]], [[Database hub]], [[00 Index]].
