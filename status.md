# Cut Labz: project status

**Last updated:** 2026-11-19

## Last thing done
Owner demo, 2026-11-19: the in-person demo did not work, and the cause is unproven (likely a weak phone signal, possibly the heavy home page). The owner was sent the demo admin and demo customer logins by message to try it himself. Now waiting for his feedback, probably at the next meeting.

## What exists and works
The site is live on Vercel (https://cutlabz-roan.vercel.app), connected to Supabase.

- **Public site:** home page with plans and pricing, terms page, privacy page, 404 page, booking flow at `/book`. The home page, terms and footer are cloned and frozen (see conventions).
- **Customer accounts:** sign up, sign in, forgot password, settings, change password, and delete my account (bookings are anonymised, the sign-in is removed).
- **Memberships:** Core, Plus and Premium. Joining is a free placeholder 30-day period because payments are not set up. Members can cancel (ends at the end of the period) and resume. Premium includes free add-ons.
- **Booking rules:** account required; 30-minute cuts; bookable up to 28 days ahead with at least 60 minutes' notice; at most 3 upcoming bookings and 1 upcoming member cut; cap enforced in the database as well as the app. Double-clicks and retries are safe (idempotency key).
- **Manage appointments** at `/account`: cancel or reschedule until 24 hours before the start. Shop-cancelled bookings say so and show the shop's contact details.
- **Admin area** at `/admin`: day and week calendar, booking search, booking detail with status changes (checked against the current state, stamped with who and when), walk-in bookings, a "Needs attention" panel (clashes, unresolved past bookings, shop-cancelled customers to contact), hours, time off, services, barbers.
- **Tests:** 138 unit tests (`npm test`) and 25 opt-in live-database tests (`npm run test:integration`). Type check, lint and build were clean at the last commit.

## Work since the codebase wiki
| Round | Commit | What |
|---|---|---|
| Customer persona QA | `104cd85` | Fixes for booking races, account deletion, idempotency, cap guard, phone required, wording |
| Admin persona QA | `484909d` | Safer status changes, audit stamps, search, date limits, delete barber/service, walk-in idempotency |
| Simulated month (8 customers, 2 staff, 4 weekly rounds, 52 bookings) | `a9871d1` | Shop contact details, stale-reschedule protection, Needs-attention panel, resume membership, Premium add-ons |
| QA record and example data | `bf778b5` | `docs/qa/2026-11-18-qa-and-month-simulation.md` and audit stamps in the seed |

The simulation found 0 double bookings and 0 cap breaches. Most findings were communication and product-design gaps, now fixed.

Skills repo (`personal-skills`, pushed): `persona-qa` hardened with scope questions, tiers, test-account and cleanup scripts, and a business-impact method; new `system-simulation` skill with scripts for the cast, time shift, invariants, money ledger and cleanup. `system-simulation` is not linked into `~/.claude/skills/` yet.

## Money exposure (from the QA record)
Figures are formulas with ranges until the owner supplies real numbers. Biggest monthly exposures: missed or unpaid cuts by members (E3, about 468 pounds), no-show handling (E2, about 225), Core members taking more than one cut (E1, loses 10 to 70 pounds per member), E7 (about 210) and E6 (about 50). See the record for definitions and the unknowns the owner must fill in.

## Live data right now (not real customers)
- **Example data** is loaded in the live database: about 284 bookings from 2026-10-28 to 2026-12-10, 7 memberships. Remove it with `npm run seed:mock:remove` before real customers use the site.
- **Demo accounts** for the owner demo: `demo.customer@example.com` (no membership, no bookings) and `demo.admin@example.com`. Passwords are in the session scratchpad only, never in the repo. Delete both after the demo.
- **Demo calendar for 2026-11-19:** 14 extra example haircuts for Ayaan (`mock+` emails, so they are removed with the example data). Wayne has no bookings from 11:00 to 15:30; his shift has a break from 14:00 to 15:00.
- After the owner has had a look: delete or reset both demo accounts (they were sent in a message), and decide whether to resize the home-page images.
- A temporary admin password from the QA rounds still needs changing, and leftover QA test accounts may exist; list and remove them before launch.

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

## Demo outcome and performance check (2026-11-19)
- The site was not down: all pages returned 200 in 0.2 to 0.6 seconds; login took 2 to 3 seconds and `/book` about 2 seconds on a phone-sized browser, and about the same on a throttled mobile connection (1.6 Mbps, 150 ms delay).
- Runtime logs for the demo window were not available (Vercel hobby plan keeps only a short window), so the exact cause is unknown. No real bookings were made during the demo.
- **Heavy home page (cloned, frozen):** `public/cuts/2.JPG` is 11.4 MB, `public/cuts/5.JPG` is 11.8 MB, `public/cuts/1.png` is 2 MB, plus an autoplaying YouTube embed: about 25 MB in all. On a throttled connection the home page did not finish loading in 30 seconds. Resizing the images would not change how they look on a phone. This needs the owner's permission because those files are on the frozen list.
- Tips for a retry: open `/login` or `/book` directly, use Wi-Fi, log in beforehand, keep a laptop as a backup.
- The owner has the logins for `demo.admin@example.com` and `demo.customer@example.com` and can change real settings through the admin account.

## Next: demo feedback
Collect the owner's reactions and any bugs from his own try-out of the demo accounts, then triage into must fix, should fix and owner decisions. Nothing planned beyond that until the feedback is in.

## Decisions still open (owner)
- **Appointment length:** `knowledge/plans.md` says 25/35/60 minutes; the booking system and the other files say 30. Fix before ingest.
- **Embedding provider:** Supabase `gte-small` (384 numbers) or a hosted provider.
- **Free-cut allowance and missed-cut policy** for members; no-show and late-cancel fees; notice period for price changes; what Premium add-ons cover.
- **Notifications** (email or SMS reminders and cancellations) are not built.
- **Payments** (Stripe or other collection method) are not built; memberships are a free placeholder.
- **Cloned terms and home page claims** that may no longer match the product (reported, not editable by us).
- **Real barber hours and roles**, and abuse limits (rate limiting) are still placeholders.
- Whether the free trial wording in the knowledge files stays once payments launch.

## Known issues
The wiki's open-issues list (`docs/wiki/_meta/Open issues.md`) predates the QA rounds, and several items on it are now fixed (the booking cap race, admin status checks, admin-opens-customer-area wording). Still true:
- Memberships are free and self-serve and can be rejoined every 30 days.
- "Confirm your email first." reveals that an account exists.
- No browser pass has been done on the final code; the last visual check was before the third fix round.
- The cause of a blank "Last changed by" in one admin test was not found (display made safe).

## Where things are
| Path | What |
|---|---|
| `docs/wiki/` | The codebase wiki. Open as an Obsidian vault and start at `00 Index`. |
| `docs/qa/2026-11-18-qa-and-month-simulation.md` | QA and month-simulation results, money map and exposure scenarios. |
| `docs/rag-faq-bot-steps-0-1.md` | Build log for the FAQ bot steps 0 and 1, with every question asked. |
| `knowledge/` | What the chatbot is allowed to know (gets embedded). |
| `evals/` | Test questions for the chatbot (never embedded). |
| `supabase/schema.sql` | Database schema, including the QA-round migrations. `knowledge_chunks` is not recorded here yet. |
| `scripts/seed-mock.ts` | Example data seeding and removal. |

## Working conventions
- Commits have plain messages with no AI attribution trailer.
- Secrets live in `.env.local` only and are never committed.
- Nothing is pushed or committed unless asked.
- The cloned parts of the site (`app/page.tsx`, `components/Home.tsx`, `app/terms/**`, `components/Nav.tsx`, `components/Year.tsx`, `app/globals.css`, `public/**`) are never changed; problems there are reported only.
- Workers never run database write operations or touch `.env.local`.
