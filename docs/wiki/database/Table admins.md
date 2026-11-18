---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table admins

**In plain English:** a short allow-list of user ids. If your id is in this table you are an admin. Rows are added by hand after the person exists in Supabase Auth; there is no sign-up path. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:87-91 | table |
| supabase/schema.sql:112 | RLS on |
| supabase/schema.sql:129-130 | `admin reads self` policy |

## Columns
| Column | Type |
|---|---|
| user_id | uuid PK, FK `auth.users(id)` `on delete cascade` |

## Reads / Writes
| Code | Client |
|---|---|
| lib/admin/auth.ts:21 ([[Admin auth]], [[requireAdmin]]) | user session; select own row |
| app/admin/login/page.tsx:36, actions.ts:32 ([[Route admin-login]]) | user session; select own row |
| [[DB functions#private.is_admin]] | reads it as definer (bypasses RLS) |

Nothing in the app inserts into it.

## Rules & invariants
- A user can only see their own row (`user_id = (select auth.uid())`), enough to answer "am I an admin?" without exposing the list ([[RLS matrix]]).
- Deleting the auth user removes the admin row (cascade).

## Security notes
No insert/update/delete policy for anyone but service role / SQL editor: nobody can self-promote through the API ([[Security Model]], [[Row Level Security]]). Admin checks in the app use two layers: the `admins` row lookup and the `is_admin()` function inside every admin policy.

## Failure modes
Row missing: [[Admin auth]] signs the user out and redirects to `/admin/login?error=not-admin` (lib/admin/auth.ts:25-43).

## Changing this safely
To add an admin: create the Auth user, then `insert into public.admins (user_id) values (...)` as owner. Do not add a write policy.

## Known gaps
None found.
