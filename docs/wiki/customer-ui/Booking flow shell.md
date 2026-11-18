---
area: customer-ui
source: [components/booking/BookingFlow.tsx, ProgressSteps.tsx, Summary.tsx, catalog-context.tsx, viewer-context.tsx, useShopToday.ts]
commit: 14ba133
updated: 2026-11-18
---
# Booking flow shell
**In plain English:** `BookingFlow` is the wizard controller. It keeps the customer's choices (the "draft"), decides which step to show, saves progress in the browser tab, and submits the booking. The five numbered steps plus a confirmation screen are in [[Booking steps]]. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `BookingFlow.tsx` (512 lines) | state machine, persistence, submit |
| `ProgressSteps.tsx` | step bar; `STEP_LABELS = SERVICE, BARBER, TIME, DETAILS, CONFIRM` |
| `Summary.tsx` | "Your booking" panel (`lg+`, sticky) and mobile bottom bar |
| `catalog-context.tsx` | `CatalogProvider`, `useCatalog`, `findService`, `pickAddons` |
| `viewer-context.tsx` | `ViewerProvider`, `useViewer`, `canUseService` |
| `useShopToday.ts` | shop-local "today" via `useSyncExternalStore` |

## State machine
Steps are indices 0..4 (`LAST = 4`); `confirmed` is a separate terminal view.

| Step | Valid when (`stepValid`, `BookingFlow.tsx:41`) |
|---|---|
| 0 service | `serviceId != null` |
| 1 barber | `barberId != null` (`"any"` allowed) |
| 2 time | `date` and `startMin` set |
| 3 details | `validateDetails(draft)` has no errors ([[Booking shared]]) |
| 4 review | always; CONTINUE becomes CONFIRM BOOKING and calls `submit()` |

- `step = min(rawStep, firstInvalid(draft))` (line ~170): never shows a step whose prerequisites broke. `reachable = min(maxReached, firstInvalid)` gates jumping via `ProgressSteps`.
- `draft` is derived with `useMemo`: viewer's email is forced, name/phone prefilled; a service the viewer cannot use (`canUseService`) or a date outside `isInWindow` / past membership `endsOn` is cleared.
- `update(patch)`: changing `serviceId/addonIds/barberId/date` clears `startMin` (`SLOT_KEYS`).
- Persistence: `sessionStorage` key `cutlabz:booking:v1` holds `{draft, step, maxReached}`; read only after mount (no hydration mismatch), sanitised against the catalog and `LIMITS`, written on every change, cleared on confirm. All storage access in try/catch.
- Today: `useShopToday` server snapshot `null` (UI shows "Loading dates…"); client refreshes at shop-local midnight and on tab focus ([[Time model]]).
- Window: 28 days via `BOOKING_WINDOW_DAYS` (`lib/catalog.ts:66`), see [[Booking window]].

## Submit outcomes (`submit`, from [[Actions book]])
| `res.code` | UI |
|---|---|
| ok | `confirmed` set, storage cleared |
| `auth` | error + SIGN IN link `/login?next=/book` |
| `membership` | error + VIEW MEMBERSHIP |
| `limit` | error + MANAGE APPOINTMENTS ([[Upcoming booking limits]]) |
| `slot_taken` | clear `startMin`, notice, back to step 2 ([[Double-booking guard]]) |
| `invalid` with field errors | back to step 3, focus first invalid |
| `invalid` with stale-menu messages | "menu changed" + RELOAD (`reloadMenu` clears choices, `router.refresh()`) |
| other / thrown | error text on review |

A `submittingRef` blocks double submits. Accessibility: step container gets focus on change; `aria-label` "Step n of 5".

## Security notes
All checks here are UX only; [[Booking server]] re-validates everything ([[Trust boundary]]). Viewer props are non-secret subset ([[Route book]]).

## Known gaps
- Hub/registry says "six steps": there are five wizard steps plus `ConfirmedStep`.
- `STALE_MESSAGES` matches server error strings literally (`BookingFlow.tsx:~107`); changing the wording in [[Booking server]] silently breaks stale-menu handling.
- `STEP` headers number 1..5 while `ProgressSteps` is 0-based internally; consistent only by convention.
