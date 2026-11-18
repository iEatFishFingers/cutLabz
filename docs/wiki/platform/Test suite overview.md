---
area: platform
source: [tests/setup.ts, tests/helpers.ts, package.json]
commit: 14ba133
updated: 2026-11-18
---
# Test suite overview

**In plain English:** `npm test` runs fast unit tests that never touch the real database; they use the in-memory store and a fixed pretend "now". A separate opt-in command runs tests against the real project. Hub: [[Platform hub]]; [[00 Index]].

## Files
| Path | Role |
|---|---|
| `tests/setup.ts` | preloaded via `--import`; deletes the three Supabase env vars |
| `tests/helpers.ts` | `resetStore`, `viewer`, `member`, `booking`, `hm` |
| `tests/*.test.ts` | unit suites ([[Tests unit]]) |
| `tests/integration/*.integration.test.ts` | live DB ([[Tests integration]]) |

## How isolation works
| Mechanism | Detail |
|---|---|
| Runner | Node built-in `node:test` through `tsx` (`package.json:10`) |
| `--conditions=react-server` | lets `import "server-only"` resolve instead of throwing outside Next |
| `setup.ts` | removes `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` even if the shell exports them |
| Result | `hasSupabaseEnv()` false, so [[Store Supabase]] picks the [[Store memory fallback]] (`lib/store.ts:81-87`); [[Catalog loader]] returns the seed catalog |
| Glob | `tests/*.test.ts` does not match `tests/integration/` |

## Helpers
| Export | Use |
|---|---|
| `resetStore()` | empties `globalThis.__cutlabzBookings` / `__cutlabzMemberships`; call in `beforeEach` |
| `viewer(p)` | signed-in `BookingViewer` (`user-1`, `sam@example.com`) |
| `member(plan, p)` | membership 2026-11-10 to 2026-12-09 |
| `booking(p)` | `Booking` with defaults, auto id `test-N` |
| `hm(h, m)` | minutes since midnight ([[Time model]]) |

Time is controlled by passing a `now` object (e.g. `{date:"2026-11-17", min: hm(10)}`) into booking functions instead of mocking clocks.

## Depends on / Used by
Exercises [[Booking server]], [[Availability engine]], [[Booking shared]], [[Customer bookings lib]], [[Customer memberships lib]]. Config in [[Tooling and config]].

## Changing this safely
Keep new unit files in `tests/*.test.ts` so they inherit the env scrub.

## Known gaps
No coverage script (`/coverage` is git-ignored but nothing produces it). No tests for `proxy.ts`, server actions or components.
