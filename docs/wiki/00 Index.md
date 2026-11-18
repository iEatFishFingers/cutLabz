---
area: overview
source: [docs/wiki/]
commit: 14ba133
updated: 2026-11-18
---
# 00 Index

**In plain English:** the front door of the Cut Labz wiki. Start with the four overview notes, then dive into an area. Every note in the vault is linked below. Notes are stamped with the commit they describe (`14ba133`); if the code has moved on, re-check before trusting a line number.

## Start here
1. [[Architecture Overview]] - what the pieces are and how they connect.
2. [[Request Lifecycles]] - five end-to-end walk-throughs.
3. [[Security Model]] - who can do what, and where it is checked.
4. [[Glossary]] - words used everywhere.

## Area hubs
| Hub | Covers |
|---|---|
| [[Platform hub]] | tooling, config, proxy, env, layout, seed script, tests |
| [[Database hub]] | tables, constraints, RLS, functions |
| [[Booking engine hub]] | catalog, slots, createBooking, store |
| [[Accounts hub]] | Supabase clients, auth flows, viewer, membership rules |
| [[Customer UI hub]] | home, booking wizard, account pages, visual rules |
| [[Admin hub]] | admin panel pages, actions, libs |

## Concepts
[[Time model]] · [[Booking window]] · [[Slot computation]] · [[Double-booking guard]] · [[Member cut]] · [[24-hour rule]] · [[Membership period]] · [[Placeholder membership]] · [[Upcoming booking limits]] · [[Booking reference]] · [[Row Level Security]] · [[Service-role key]] · [[Anon key]] · [[Cache Components]] · [[Server action]] · [[requireAdmin]] · [[requireCustomer]] · [[Trust boundary]]

## Platform
[[Tooling and config]] · [[Proxy request gate]] · [[Environment and deployment]] · [[Root layout and styles]] · [[Seed mock script]] · [[Test suite overview]] · [[Tests unit]] · [[Tests integration]]

## Database
[[Table barbers]] · [[Table services and addons]] · [[Table availability]] · [[Table time_off]] · [[Table bookings]] · [[Table memberships]] · [[Table admins]] · [[DB functions]] · [[RLS matrix]] · [[Schema history and seed data]]

## Booking engine
[[Catalog static]] · [[Catalog loader]] · [[Availability engine]] · [[Booking shared]] · [[Booking server]] · [[Store Supabase]] · [[Store memory fallback]] · [[Actions book]]

## Accounts
[[Supabase clients]] · [[Auth gating]] · [[Viewer and session]] · [[Admin auth]] · [[Membership rules]] · [[Customer bookings lib]] · [[Customer memberships lib]] · [[Actions account-bookings]] · [[Actions account-membership]] · [[Auth forms and actions]] · [[Routes customer auth]] · [[Route auth-callback]] · [[Route account-settings]]

## Customer UI
[[Visual style rules]] · [[Route home and terms]] · [[Site nav and links]] · [[Route book]] · [[Booking flow shell]] · [[Booking steps]] · [[Route account]] · [[Account shell and nav]] · [[Account booking components]] · [[Route account-reschedule]] · [[Route account-membership]]

## Admin
[[Route admin-login]] · [[Admin panel shell]] · [[Route admin-dashboard]] · [[Admin board components]] · [[Route admin-new-booking]] · [[Actions admin-bookings]] · [[Admin bookings lib]] · [[Admin catalog lib]] · [[Route admin-catalog]] · [[Route admin-schedule]] · [[Admin settings components]]

## Meta
[[Open issues]] (30 findings) · [[Rulings]] · [[Note Registry]]

Out of scope on purpose: the on-hold FAQ-bot work (`knowledge/`, `evals/`, `docs/rag-*`).
