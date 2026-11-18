---
area: platform
source: [scripts/seed-mock.ts]
commit: 14ba133
updated: 2026-11-18
---
# Seed mock script

**In plain English:** a developer-only script that fills the real Supabase project with fake customers, memberships, bookings and time off so the admin board and booking screens look busy. It tags everything it creates so it can delete exactly that again. Hub: [[Platform hub]]; [[00 Index]].

## Run
| Command | Effect |
|---|---|
| `npm run seed:mock` | removes its own old data, then creates new (re-run safe) |
| `npm run seed:mock:remove` | deletes everything it created (`--remove`) |

Loads `.env.local` itself (`process.loadEnvFile`) and needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ([[Environment and deployment]]). Uses a [[Service-role key]] client, so it bypasses [[Row Level Security]]. Reuses `addDays`, `shopNow` from [[Booking shared]].

## Tables touched
| Table | What |
|---|---|
| auth users | `mock+<name>@example.invalid`, no password |
| [[Table memberships]] | a period for some mock users |
| [[Table bookings]] | past + upcoming, inserted in batches of 100 |
| [[Table time_off]] | reasons prefixed `MOCK:` |
| [[Table availability]] | switched to varied mock hours only if still the original Tue-Sat 11:00-21:00 seed; restored on remove only if still the mock pattern |

Also reads [[Table services and addons]] for prices/durations.

## Rules & invariants
- Tag-based cleanup: email prefix `mock+` / suffix `@example.invalid`, time-off tag `MOCK:`; bookings are deleted with their users (`seed-mock.ts:7-12, 105-123`).
- Deterministic PRNG (seed `20260101`) so re-runs have the same shape.

## Security notes
Targets whatever project `.env.local` names, which is the live DB (no separate dev project configured, unverified). Mock users appear in admin lists while seeded.

## Failure modes
Missing env throws immediately (`:23`). Hours edited by hand between runs are left untouched.

## Tests covering it
None. Compare [[Tests integration]], which uses a different tag (`integration-test+`).

## Known gaps
None found.
