---
area: meta
source: []
commit: 14ba133
updated: 2026-11-18
---
# Note Registry

**In plain English:** the master list of every note in this wiki: its exact title, which folder it lives in and who writes it. If a title is here you may link to it with `[[Title]]` even before it exists. Back to [[00 Index]]. Hubs: [[Platform hub]], [[Database hub]], [[Booking engine hub]], [[Accounts hub]], [[Customer UI hub]], [[Admin hub]]. Decisions: [[Rulings]]; findings: [[Open issues]].

## Naming and stamp rules
- Filename == title (`docs/wiki/<folder>/<Title>.md`). Titles unique across the vault. Never use `/ \ : # ^ [ ] |` in a title.
- Name by purpose or route, never by filename (`Route account-membership`, `Actions account-bookings`).
- Frontmatter on every note:
```yaml
---
area: booking-engine        # platform | database | booking-engine | accounts | customer-ui | admin | concepts | overview | meta
source: [lib/availability.ts, lib/catalog.ts]
commit: 14ba133             # git rev-parse --short HEAD
updated: 2026-11-18
---
```

## Link rules
- Every note has **>= 8 wikilinks**: its dependencies, its "Used by", relevant concept notes, its area hub, and `[[00 Index]]`.
- Link to concept notes (list below) instead of re-explaining a concept. Link, don't repeat.
- Forms: `[[Title]]`, `[[Title#Heading]]`, `[[Title|alias]]`. Only link titles in this registry (ask O for a new one).
- Cite code as `path:line` where it matters.

## Note template (workers)
```
frontmatter
# <Title>
**In plain English:** 2-3 sentences.
## Files            (table: path | role)
## Public API / exports   (signature, 1 line each)
## Reads / Writes   (tables, endpoints, cookies)
## Depends on / Used by   (wikilinks)
## Rules & invariants     (exact numbers verified in code, with path:line)
## Security notes   (who may call it, validation, RLS)
## Failure modes
## Tests covering it  (link the test note)
## Changing this safely
## Known gaps
```
Omit a section only if truly empty (write "None found"). Target 150-400 words; tables over prose; code excerpts <= 10 lines.

## Concept notes (O writes, folder `concepts/`; link freely)
| Title | Scope |
|---|---|
| Time model | how dates/times are stored and compared; Europe/London shop-local time |
| Booking window | how far ahead / minimum notice a customer can book |
| Slot computation | how free start times are derived from hours, time off, bookings |
| Double-booking guard | `no_overlap` exclusion constraint + app checks |
| Member cut | a free cut covered by membership (`membership_id` on booking) |
| 24-hour rule | cancel/reschedule cutoff |
| Membership period | dated membership rows, `memberships_no_overlap`, no stacking |
| Placeholder membership | membership granted without payment (no billing yet) |
| Upcoming booking limits | caps on how many future bookings a customer/member may hold |
| Booking reference | the human-facing booking id/code |
| Row Level Security | Postgres RLS, how policies gate anon/authenticated |
| Service-role key | server-only admin client that bypasses RLS |
| Anon key | public/publishable key used by browser and SSR clients |
| Cache Components | Next 16 `'use cache'`, cacheTag/revalidateTag, PPR + Suspense |
| Server action | `'use server'` functions, how forms call them |
| requireAdmin | admin guard (`lib/admin/auth.ts`) |
| requireCustomer | customer guard (`lib/customer/viewer.ts`) |
| Trust boundary | what the browser may claim vs what the server re-checks |

## Root / overview / meta notes (O)
| Title | Folder | Scope |
|---|---|---|
| 00 Index | (root) | hub: every area hub and every note |
| Architecture Overview | (root) | layers, diagram, stack, deployment |
| Security Model | (root) | trust boundaries, auth, keys, RLS summary, server re-validation |
| Request Lifecycles | (root) | book, sign in, cancel/reschedule, join membership, admin status change |
| Glossary | (root) | terms |
| Note Registry | _meta | this note |
| Open issues | _meta | aggregated bugs / inconsistencies |
| Rulings | _meta | clash rulings log |

## S1 platform (`platform/`)
| Title | Scope | Sources |
|---|---|---|
| Platform hub | area hub: links all S1 notes, how to run things | - |
| Tooling and config | npm scripts, Next/TS/ESLint config, deps | package.json, next.config.ts, tsconfig.json, eslint.config.mjs, .gitignore, AGENTS.md, README.md, .mcp.json (names only) |
| Proxy request gate | proxy.ts mechanics: matcher, session refresh, redirects (auth meaning lives in [[Auth gating]]) | proxy.ts |
| Environment and deployment | env var NAMES, where each is read, Vercel + Supabase wiring | .env.local.example (names only), grep of process.env |
| Root layout and styles | app/layout.tsx, fonts, metadata, globals.css, static assets | app/layout.tsx, app/globals.css, app/favicon.ico, public/** |
| Seed mock script | what it seeds/removes (no user data detail) | scripts/seed-mock.ts |
| Test suite overview | how `npm test` runs, setup.ts DB isolation, helpers | tests/setup.ts, tests/helpers.ts |
| Tests unit | what each unit suite proves | tests/availability.test.ts, availability-rules, booking-shared, booking-server, store, customer |
| Tests integration | opt-in integration suites, prerequisites | tests/integration/*.ts |

## S2 database (`database/`)
| Title | Scope | Sources |
|---|---|---|
| Database hub | area hub + small mermaid ER diagram; one line on knowledge_chunks | supabase/schema.sql |
| Table barbers | columns, constraints, policies | schema.sql |
| Table services and addons | services + addons tables | schema.sql |
| Table availability | weekly hours table | schema.sql |
| Table time_off | time off table | schema.sql |
| Table bookings | columns, `no_overlap`, indexes, policies | schema.sql |
| Table memberships | columns, `memberships_no_overlap`, policies | schema.sql |
| Table admins | admin allow-list | schema.sql |
| DB functions | `private.is_admin()`, `public.replace_availability()` | schema.sql |
| RLS matrix | table x role (anon, authenticated customer, admin, service role) | schema.sql |
| Schema history and seed data | migration order/history in file, seed rows, how to apply | schema.sql |

## S3 booking-engine (`booking-engine/`)
| Title | Scope | Sources |
|---|---|---|
| Booking engine hub | area hub; data flow catalog -> availability -> createBooking | - |
| Catalog static | static catalog types/data | lib/catalog.ts |
| Catalog loader | DB catalog loading + caching | lib/catalog-db.ts |
| Availability engine | slot rules | lib/availability.ts |
| Booking shared | client+server shared booking helpers/validation | lib/booking-shared.ts |
| Booking server | createBooking step order, server checks | lib/booking-server.ts |
| Store Supabase | store/Supabase boundary | lib/store.ts |
| Store memory fallback | in-memory store, when it is used | lib/store-memory.ts |
| Actions book | booking server actions | app/book/actions.ts |

## S4 accounts (`accounts/`)
| Title | Scope | Sources |
|---|---|---|
| Accounts hub | area hub; sign-up/in/reset overview | - |
| Supabase clients | server/admin clients, env helper, cookies | lib/supabase/admin.ts, env.ts, server.ts |
| Auth gating | auth view of proxy.ts (which routes need what) | proxy.ts |
| Viewer and session | viewer, requireCustomer | lib/customer/viewer.ts |
| Admin auth | requireAdmin and admin checks | lib/admin/auth.ts |
| Membership rules | pure membership rules | lib/membership.ts |
| Customer bookings lib | cancel/reschedule/list logic | lib/customer/bookings.ts |
| Customer memberships lib | subscribe/cancel logic | lib/customer/memberships.ts |
| Actions account-bookings | cancel/reschedule actions | app/account/bookings/actions.ts |
| Actions account-membership | membership actions | app/account/membership/actions.ts |
| Auth forms and actions | sign-in/up/forgot forms, auth server actions, origin helper | components/account/AuthCard.tsx, components/account/auth/* |
| Routes customer auth | /login, /signup, /forgot-password pages | app/login/page.tsx, app/signup/page.tsx, app/forgot-password/page.tsx |
| Route auth-callback | code exchange route | app/auth/callback/route.ts |
| Route account-settings | account layout + settings page, forms, actions | app/account/layout.tsx, app/account/settings/page.tsx, components/account/settings/* |

## S5 customer-ui (`customer-ui/`)
| Title | Scope | Sources |
|---|---|---|
| Customer UI hub | area hub; client/server boundaries; Suspense/PPR use | - |
| Visual style rules | black theme, square buttons, type, motion | app/globals.css (visual view), components |
| Route home and terms | home + terms pages | app/page.tsx, components/Home.tsx, components/Year.tsx, app/terms/page.tsx |
| Site nav and links | nav + link constants | components/Nav.tsx, lib/links.ts |
| Route book | /book page, loader, error boundary | app/book/page.tsx, BookingLoader.tsx, error.tsx |
| Booking flow shell | flow state machine, contexts, summary, progress | components/booking/BookingFlow.tsx, ProgressSteps, Summary, catalog-context, viewer-context, useShopToday |
| Booking steps | the six step components | components/booking/ServiceStep, BarberStep, DateTimeStep, DetailsStep, ReviewStep, ConfirmedStep |
| Route account | /account overview page | app/account/page.tsx |
| Account shell and nav | AccountShell, AccountNav | components/account/AccountShell.tsx, AccountNav.tsx |
| Account booking components | cards, cancel, confirm, flash, reschedule form | components/account/bookings/* |
| Route account-reschedule | reschedule page | app/account/bookings/[id]/reschedule/page.tsx |
| Route account-membership | membership page + plan cards | app/account/membership/page.tsx, components/account/membership/PlanCards.tsx |

## S6 admin (`admin/`)
| Title | Scope | Sources |
|---|---|---|
| Admin hub | area hub | - |
| Route admin-login | admin login page, form, action | app/admin/login/* |
| Admin panel shell | panel layout, shell, nav, error boundary | app/admin/(panel)/layout.tsx, components/admin/AdminShell.tsx, AdminNav.tsx, app/admin/error.tsx |
| Route admin-dashboard | day/week board page | app/admin/(panel)/page.tsx |
| Admin board components | DayBoard, WeekView, DateNav, NextUp, BookingDetail | components/admin/bookings/* (except NewBookingForm) |
| Route admin-new-booking | walk-in/new booking page + form | app/admin/(panel)/bookings/new/page.tsx, components/admin/bookings/NewBookingForm.tsx |
| Actions admin-bookings | status change / create / cancel actions | app/admin/(panel)/bookings/actions.ts |
| Admin bookings lib | queries + shared helpers | lib/admin/bookings.ts, lib/admin/bookings-shared.ts |
| Admin catalog lib | catalog CRUD | lib/admin/catalog-admin.ts |
| Route admin-catalog | barbers + services pages and actions | app/admin/(panel)/barbers/*, services/* |
| Route admin-schedule | hours + time-off pages and actions | app/admin/(panel)/hours/*, time-off/* |
| Admin settings components | forms/editors/helpers | components/admin/settings/* |

Out of scope (do not document): knowledge/, evals/, docs/rag-* (RAG work on hold). `knowledge_chunks` gets one line in [[Database hub]] only.
