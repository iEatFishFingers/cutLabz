# Cut Labz: project status

**Last updated:** 2026-11-18

## Last thing done
Wrote the full codebase wiki in `docs/wiki/` (93 linked Obsidian-style notes: architecture, security model, request lifecycles, database, booking engine, accounts, customer UI, admin, tests) and the build log for the FAQ bot's steps 0 and 1 in `docs/rag-faq-bot-steps-0-1.md`. Documentation only; no application code changed.

## What exists and works
The site is live on Vercel, connected to Supabase, and was confirmed working end to end by the owner.

- **Public site:** home page with plans and pricing, terms page, booking flow at `/book`.
- **Customer accounts:** sign up, sign in, forgot password, settings, change password.
- **Memberships:** Core, Plus and Premium. Joining is a free placeholder 30-day period because payments are not set up. A member's cut is free; members cannot book past their membership end date.
- **Booking rules:** account required; 30-minute cuts; bookable up to 28 days ahead with at least 60 minutes' notice; at most 3 upcoming bookings and 1 upcoming member cut.
- **Manage appointments** at `/account`: cancel or reschedule until 24 hours before the start.
- **Admin area** at `/admin`: day and week calendar, walk-in bookings, hours, time off, services, barbers.
- **Tests:** unit tests (`npm test`) and opt-in live-database tests (`npm run test:integration`).
- **Mock data:** `npm run seed:mock` fills the dev database with fake customers and bookings; `npm run seed:mock:remove` clears it. Remove it before real customers use the live site.

## In progress: FAQ chatbot (RAG)
The owner is writing the code; Claude guides and reviews.

| Step | What | Status |
|---|---|---|
| 0 | Knowledge files in `knowledge/`, 26 test questions in `evals/` | Done (committed) |
| 1 | `knowledge_chunks` table in Supabase (`embedding vector(384)`, RLS on, no policies) | Table done and verified |
| 1 | Ingest script: split markdown on `##`, embed, insert rows | **Next** (owner writes; start with the chunk-splitting part, printing only) |
| 2 | Retrieval function and testing against the eval questions | To do |
| 3 | Chat endpoint calling Claude | To do |
| 4 | Safety: rate limiting, input limits, prompt-injection tests | To do |
| 5 | Chat widget | To do |
| Later | Admin assistant for managing bookings (tool use over live data) | To do |

## Decisions still open
- **Appointment length:** `knowledge/plans.md` says 25/35/60 minutes; the booking system and the other files say 30. Needs correcting before ingest.
- **Embedding provider:** Supabase `gte-small` (384 numbers, no extra account) or a hosted provider. The column is sized for `gte-small`.
- **Real barber hours and roles**, membership payments (Stripe), and abuse limits (rate limiting) are still placeholders.
- Whether the free trial wording in the knowledge files should stay once payments launch.

## Known issues
Thirty code issues were recorded while writing the wiki; see `docs/wiki/_meta/Open issues.md`. The most important:
- Memberships are free and self-serve (placeholder), and can be rejoined every 30 days.
- A signed-in customer who opens `/admin` is signed out.
- "Confirm your email first." reveals that an account exists.
- Admin status changes and admin-created bookings skip some checks.
- The 3-upcoming-bookings cap has no race guard.

## Where things are
| Path | What |
|---|---|
| `docs/wiki/` | The codebase wiki. Open as an Obsidian vault and start at `00 Index`. |
| `docs/rag-faq-bot-steps-0-1.md` | Build log for the FAQ bot steps 0 and 1, with every question asked. |
| `knowledge/` | What the chatbot is allowed to know (gets embedded). |
| `evals/` | Test questions for the chatbot (never embedded). |
| `supabase/schema.sql` | Database schema. `knowledge_chunks` is not recorded here yet. |
| `scripts/seed-mock.ts` | Mock data seeding and removal. |

## Working conventions
- Commits have plain messages with no AI attribution trailer.
- Secrets live in `.env.local` only and are never committed.
- Nothing is pushed or committed unless asked.
