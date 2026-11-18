---
area: overview
source: [lib/, supabase/schema.sql]
commit: 14ba133
updated: 2026-11-18
---
# Glossary

**In plain English:** short definitions of words used across this wiki and the code. Each points to the note that explains it properly.

| Term | Meaning | See |
|---|---|---|
| Add-on | optional extra on a service (hot towel etc.), £5, 0 extra min in seed | [[Table services and addons]] |
| Anon key | public Supabase key; acts as the user when combined with their cookie | [[Anon key]] |
| `"any"` barber | let the server pick the least-busy free barber | [[Slot computation]] |
| App Router | Next.js routing by folders under `app/` | [[Architecture Overview]] |
| Cache Components / `'use cache'` | Next 16 opt-in caching + partial prerendering | [[Cache Components]] |
| `cacheTag("catalog")` | label on the cached catalog; cleared by admin edits | [[Admin settings components]] |
| ClientCatalog / ServerCatalog | catalog without / with private `time_off` | [[Catalog static]] |
| Exclusion constraint | Postgres rule forbidding overlapping rows (`no_overlap`, `memberships_no_overlap`) | [[Double-booking guard]] |
| Member cut | £0 booking of a membership service | [[Member cut]] |
| Membership period | 30-day dated membership row | [[Membership period]] |
| `minutes from midnight` | how times are stored (870 = 14:30) | [[Time model]] |
| Placeholder membership | free membership, no payment yet | [[Placeholder membership]] |
| PPR | partial prerendering: static shell + streamed dynamic parts | [[Cache Components]] |
| Proxy (`proxy.ts`) | Next 16's request middleware | [[Proxy request gate]] |
| Reference | `CL-XXXXXX` booking code | [[Booking reference]] |
| RLS | Postgres Row Level Security | [[Row Level Security]] |
| Server action | `'use server'` function callable from the browser | [[Server action]] |
| Service-role key | server-only key that bypasses RLS | [[Service-role key]] |
| `shopNow()` | current Europe/London date + minute | [[Time model]] |
| Slot | `{startMin, barberIds}` free start time | [[Availability engine]] |
| Status | `pending`, `confirmed` (active), `cancelled`, `completed`, `no_show` | [[Table bookings]] |
| Store | data-access layer, Supabase or in-memory | [[Store Supabase]], [[Store memory fallback]] |
| Time off | barber leave, inclusive date range, reason private | [[Table time_off]] |
| Viewer | the signed-in customer object | [[Viewer and session]] |
| Walk-in | admin-made booking without a customer account | [[Route admin-new-booking]] |
| 23P01 | Postgres "exclusion violation" error code | [[Double-booking guard]] |

[[00 Index]]
