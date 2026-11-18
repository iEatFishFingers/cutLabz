---
area: platform
source: [tests/integration/db.integration.test.ts, tests/integration/customer.integration.test.ts]
commit: 14ba133
updated: 2026-11-18
---
# Tests integration

**In plain English:** two suites that run the same booking and membership code against the real Supabase project, to prove the database itself (constraints, atomic updates) behaves. They are skipped unless you opt in, and only create and delete rows tagged as test data. Hub: [[Platform hub]]; [[00 Index]].

## Run
```
CUTLABZ_INTEGRATION=1 npm run test:integration   # PowerShell: $env:CUTLABZ_INTEGRATION="1"
```
`--test-concurrency=1` runs suites serially. Not matched by `npm test` ([[Test suite overview]]).

## Prerequisites
| Need | Detail |
|---|---|
| `CUTLABZ_INTEGRATION=1` | else both suites `skip` with a message |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from shell or `.env.local` via `process.loadEnvFile` in `before()` ([[Environment and deployment]]) |
| Schema + seed applied | [[Schema history and seed data]] |

## Suites
| File | Proves |
|---|---|
| `db.integration.test.ts` | (a) booking stored correctly; (b) overlap rejected by app and by the DB constraint ([[Double-booking guard]]); (c) back-to-back allowed; (d) closed day / past / inside notice unavailable; (e) `any` spreads two same-time bookings over two barbers; (f) `loadCatalog` returns seeded catalog and Tue-Sat hours ([[Catalog loader]]) |
| `customer.integration.test.ts` | subscribe, no stacking ([[Membership period]]); member cut free, one upcoming; non-members blocked, cross-user access refused; end date blocks later bookings; atomic reschedule; inside 24h refused ([[24-hour rule]]); cap of 3 upcoming ([[Upcoming booking limits]]) |

## Safety rules
- Test users are `integration-test+<random>@example.invalid`; cleanup deletes only that prefix/suffix (`db.integration.test.ts:15-16,22-23`), also at start to clear aborted runs.
- Slot-blocker rows use `...-blocker@example.invalid` (`customer.integration.test.ts:61`).
- Dates probed are 14 to 27 days ahead (`db.integration.test.ts:111-116`), inside the 28-day [[Booking window]].

## Security notes
Uses the [[Service-role key]] against the live project (no separate test DB known, unverified); a crash mid-run can leave tagged rows until the next run cleans them. Tag scheme differs from [[Seed mock script]].

## Depends on
[[Booking server]], [[Store Supabase]], [[Customer bookings lib]], [[Customer memberships lib]], [[Table bookings]], hub [[Platform hub]].

## Known gaps
No RLS tests: the service-role client bypasses RLS, so policies in [[RLS matrix]] are untested.
