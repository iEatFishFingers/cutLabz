---
area: customer-ui
source: [app/book/page.tsx, components/booking/*, components/account/*]
commit: 14ba133
updated: 2026-11-18
---
# Customer UI hub
**In plain English:** this is everything a customer sees: the home page, the booking wizard and the signed-in account pages. Most pages are thin server files that fetch data and hand it to interactive "client" components. Back to [[00 Index]].

## Notes in this area
| Note | Covers |
|---|---|
| [[Visual style rules]] | black theme, buttons, type, motion |
| [[Route home and terms]] | `/` and `/terms` |
| [[Site nav and links]] | top nav, `lib/links.ts` |
| [[Route book]] | `/book` page, cached loader, error boundary |
| [[Booking flow shell]] | wizard state machine, contexts, summary |
| [[Booking steps]] | the six step components |
| [[Route account]] | `/account` appointments list |
| [[Account shell and nav]] | account header + tabs |
| [[Account booking components]] | cards, cancel, dialog, flash, reschedule form |
| [[Route account-reschedule]] | `/account/bookings/[id]/reschedule` |
| [[Route account-membership]] | `/account/membership`, plan cards |

## Server vs client components
| Kind | Files | Why |
|---|---|---|
| Server (default) | `app/page.tsx`, `app/terms/page.tsx`, `app/book/page.tsx`, `BookingLoader`, `app/account/**/page.tsx`, `AccountShell`, `BookingCard`, `ui.ts` | read DB/cookies, no browser state |
| Client (`"use client"`) | `Home`, `Nav`, `Year`, all of `components/booking/*`, `AccountNav`, `CancelButton`, `ConfirmDialog`, `FlashNote`, `RescheduleForm`, `PlanCards`, `app/book/error.tsx` | state, effects, framer-motion, `useRouter` |

Pattern: a server page authenticates ([[requireCustomer]]) and loads data, then passes plain props (catalog, a small viewer subset, a booking) to one client component. Client components never import server-only libs; they call a [[Server action]].

## Suspense, Cache Components, PPR
`cacheComponents: true` (`next.config.ts:5`; see [[Cache Components]], [[Tooling and config]]). With it, request-time reads (cookies, `searchParams`, uncached DB) must sit under `<Suspense>` or the build reports a blocking route; the static shell prerenders and Suspense holes stream in (verified: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`).

| Place | Pattern |
|---|---|
| `/book` | `<Suspense fallback={<BookingSkeleton/>}>` around `BookAccess` (reads cookies) which wraps the `'use cache'` `BookingLoader` ([[Route book]]) |
| `/account/*` | `app/account/layout.tsx` wraps `AccountShell` and so every page in Suspense with `AccountShellFallback` ([[Account shell and nav]], [[Route account-settings]]) |
| `Year`, `useShopToday` | `useSyncExternalStore` with a fixed server snapshot, so no `new Date()` during prerender ([[Route home and terms]], [[Booking flow shell]]) |

There are no `loading.tsx` files; fallbacks are explicit Suspense.

## Server actions called from the UI
| UI | Action note |
|---|---|
| `BookingFlow`, `DateTimeStep` | [[Actions book]] (`createBookingAction`, `getSlotsAction`) |
| `CancelButton`, `RescheduleForm` | [[Actions account-bookings]] |
| `PlanCards` | [[Actions account-membership]] |
| `AccountShell` sign-out | [[Auth forms and actions]] |

## Known gaps
Per-note; aggregated in [[Open issues]].
