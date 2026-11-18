---
area: platform
source: [package.json, next.config.ts, tsconfig.json, eslint.config.mjs, .gitignore, AGENTS.md, README.md, .mcp.json]
commit: 14ba133
updated: 2026-11-18
---
# Tooling and config

**In plain English:** the config files that decide how the project builds, type-checks, lints and runs tests. Nothing here is business logic, but two flags (`cacheComponents`, `partialPrefetching`) change how every page renders. Hub: [[Platform hub]]; up: [[00 Index]].

## Files
| Path | Role |
|---|---|
| `package.json` | scripts + deps (Next 16.4.6, React 19.3.0, Supabase SDKs, framer-motion, Tailwind 4.3.3, tsx) |
| `next.config.ts` | `cacheComponents: true`, `partialPrefetching: true`, Turbopack rule sending `*.css` through `@tailwindcss/turbopack` |
| `tsconfig.json` | `strict`, `moduleResolution: bundler`, alias `@/*` -> repo root, includes `**/*.ts(x)` (so `tests/` and `scripts/` are type-checked) |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals + typescript; ignores `.next`, `out`, `build`, `next-env.d.ts`, `_reference/` |
| `.gitignore` | ignores `.env*` except `!.env.local.example`, `.next`, `.vercel`, `_reference/`, `*.tsbuildinfo` |
| `AGENTS.md` | warns this Next has breaking changes; read `node_modules/next/dist/docs/` first (re-added by `next dev`) |
| `README.md` | unchanged create-next-app boilerplate |
| `.mcp.json` | one MCP server named `supabase` (HTTP, scoped to the project); no tokens in file |

## npm scripts (`package.json:5-13`)
| Script | Runs |
|---|---|
| `dev` `build` `start` `lint` | `next dev/build/start`, `eslint` |
| `test` | `tsx --conditions=react-server --import ./tests/setup.ts --test tests/*.test.ts` |
| `test:integration` | same runner, `--test-concurrency=1`, `tests/integration/*.integration.test.ts` |
| `seed:mock` / `seed:mock:remove` | `tsx scripts/seed-mock.ts [--remove]` |

## Rules & invariants
- `cacheComponents` turns on [[Cache Components]] (`'use cache'`, PPR); pages touching cookies must sit behind Suspense.
- `server-only` is a dependency; tests use the `react-server` condition so it imports cleanly ([[Test suite overview]]).

## Depends on / Used by
Used by every note in [[Platform hub]]; relates to [[Proxy request gate]], [[Environment and deployment]], [[Root layout and styles]], [[Seed mock script]].

## Changing this safely
Changing `cacheComponents` affects all routes ([[Customer UI hub]]). Next docs live in `node_modules/next/dist/docs/` (verify there, not memory).

## Known gaps
- No CI config and no `vercel.json` found (Vercel project settings are unverified).
- `README.md` is stale boilerplate.
- Why `@tailwindcss/turbopack` is used (vs the usual PostCSS plugin): unverified.
