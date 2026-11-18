---
area: database
source: [supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Table services and addons

**In plain English:** `services` is the menu of haircuts (three membership tiers and two one-off cuts); `addons` are the paid extras you can tack on. Prices are whole pence, never decimals. Part of the [[Database hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| supabase/schema.sql:18-34 | both tables |
| supabase/schema.sql:116-117, 122-123 | policies |
| supabase/schema.sql:196-209 | seed rows |

## Columns
| services | Type / constraint |
|---|---|
| id | text PK (`core`, `plus`, `premium`, `haircut`, `haircut-beard`) |
| name, description | text; description default `''` |
| duration_min | int, check `> 0` |
| price_pence | int, check `>= 0` |
| kind | text, check in (`membership`,`one-off`) |
| active | boolean default true |

| addons | Type / constraint |
|---|---|
| id | text PK |
| name | text |
| price_pence | int, check `>= 0` |
| extra_min | int default 0 (no check) |
| active | boolean default true |

## Reads / Writes
| Code | Operation |
|---|---|
| lib/catalog-db.ts:45-46 ([[Catalog loader]]) | service role, active rows |
| lib/admin/bookings.ts:37-38 ([[Admin bookings lib]]) | names for display |
| app/admin/(panel)/services/page.tsx, actions.ts:96,138 ([[Route admin-catalog]], [[Admin catalog lib]]) | admin session; update |
| [[Table bookings]] `service_id` FK; [[Table memberships]] `plan` FK to `services.id` | |

## Rules & invariants
- Addons have no table link from bookings: `bookings.addon_ids text[]` (schema.sql:64) holds ids unchecked by the DB.
- `kind='membership'` services have `price_pence = 0` in the seed; the cut itself is free ([[Member cut]]).
- Seed durations are all 30 min and `extra_min` 0 (schema.sql:196-209).

## Security notes
Public read, admin-only write ([[RLS matrix]], [[Row Level Security]]). Prices shown in the browser are not trusted; totals are recomputed server-side ([[Booking server]], [[Trust boundary]]).

## Changing this safely
Id changes break existing bookings and memberships (FKs, no cascade). Prefer `active=false`. Mirror seed edits in [[Catalog static]].

## Known gaps
- `memberships.plan` accepts any service id, including a `one-off`; nothing in SQL enforces `kind='membership'`.
- `addons.extra_min` has no `>= 0` check; `bookings.addon_ids` has no referential integrity.
