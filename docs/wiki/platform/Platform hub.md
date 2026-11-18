---
area: platform
source: [package.json, scripts/seed-mock.ts, tests/]
commit: 14ba133
updated: 2026-11-18
---
# Platform hub

**In plain English:** this area is everything around the app code: how it is built and configured, how requests are gated before pages run, which secrets it needs, how the page shell looks, how to fill the DB with fake data, and how it is tested. Start here to run things. Back to [[00 Index]].

## Notes
| Note | What |
|---|---|
| [[Tooling and config]] | scripts, Next/TS/ESLint config, deps |
| [[Proxy request gate]] | `proxy.ts` matcher, cookie check, session refresh |
| [[Environment and deployment]] | env var names, Vercel + Supabase wiring |
| [[Root layout and styles]] | `app/layout.tsx`, fonts, `globals.css`, `public/` |
| [[Seed mock script]] | fake customers/bookings for local dev |
| [[Test suite overview]] | how `npm test` isolates from the DB |
| [[Tests unit]] / [[Tests integration]] | what each suite proves |

## How to run things
| Goal | Command |
|---|---|
| Dev server | `npm run dev` |
| Build / serve | `npm run build` / `npm start` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| Live-DB tests (opt-in) | `CUTLABZ_INTEGRATION=1 npm run test:integration` |
| Mock data add / remove | `npm run seed:mock` / `npm run seed:mock:remove` |

## Related areas
[[Architecture Overview]] (layers), [[Security Model]], [[Accounts hub]] (auth + [[Auth gating]]), [[Database hub]], [[Booking engine hub]], [[Customer UI hub]], [[Admin hub]]. Concepts used here: [[Cache Components]], [[Service-role key]], [[Anon key]].

## Known gaps
None specific to the hub; see each note.
