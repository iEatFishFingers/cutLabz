# Cut Labz

Membership barbershop site for a Manchester shop: public pages, online booking, customer accounts with memberships, and an admin panel for staff.

Live: https://cutlabz-roan.vercel.app

## Stack
Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4, framer-motion, Supabase (Postgres, auth, row level security), hosted on Vercel. This version of Next.js has breaking changes; read `AGENTS.md` and `node_modules/next/dist/docs/` before changing framework code.

## Run it
```bash
npm install
# create .env.local with the Supabase URL, anon key and service-role key (never commit this file)
npm run dev
```
Without Supabase settings the app falls back to an in-memory store for local work.

## Scripts
| Command | What |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm test` | Unit tests |
| `npm run test:integration` | Opt-in tests against the live database |
| `npm run seed:mock` | Load example customers and bookings |
| `npm run seed:mock:remove` | Remove the example data (do this before real customers) |

## Key rules
Shop time is Europe/London. Cuts are 30 minutes, bookable up to 28 days ahead with 60 minutes' notice; at most 3 upcoming bookings and 1 upcoming member cut; customers can cancel or reschedule until 24 hours before. Memberships are a free placeholder until payments are built. The server recomputes prices and durations; nothing from the client is trusted.

## Docs
| Where | What |
|---|---|
| `status.md` | Current state, open decisions, what is next |
| `docs/wiki/` | Codebase wiki (open as an Obsidian vault, start at `00 Index`) |
| `docs/qa/` | QA and month-simulation results with the money model |
| `supabase/schema.sql` | Database schema and migrations |
| `knowledge/`, `evals/` | FAQ chatbot knowledge and test questions |

The home page, terms, nav, footer, global styles and `public/` are cloned from another site and are not edited.
