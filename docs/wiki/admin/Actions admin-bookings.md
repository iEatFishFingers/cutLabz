---
area: admin
source: [app/admin/(panel)/bookings/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Actions admin-bookings
**In plain English:** the two server actions the calendar uses: change a booking's status, and create a booking for a customer. Both first check the caller is a signed-in admin.

## Files
`app/admin/(panel)/bookings/actions.ts` (44 lines, `"use server"`, see [[Server action]]).

## Public API
| action | line | does |
|---|---|---|
| `setBookingStatusAction(id, status)` | 9 | `requireAdminAction()`, `changeBookingStatus`, `revalidatePath("/admin")` on ok |
| `createBookingAction(prev, formData)` | 19 | `requireAdminAction()`, `createAdminBooking(..., await loadCatalog())`, `revalidatePath("/admin")` |

## Security notes
| Item | setBookingStatus | createBooking |
|---|---|---|
| Who may call | admin only (`requireAdminAction`, throws `Unauthorized`) | same |
| DB client | admin session = [[Anon key]] + [[Row Level Security]] (`admin all bookings`) | `insertBooking` in [[Store Supabase]] = [[Service-role key]] (bypasses RLS; safe only because of the guard) |
| Validation | id matches UUID regex; status one of 5 | barber/service exist in catalog, <=20 unique known add-ons, valid date, `startMin` integer 0-1439 and multiple of 15, name required (<= `LIMITS.name`), phone 7-15 digits, email regex, notes <= `LIMITS.notes` (bookings.ts:156-195), end <= 1440 |
| Cache | `revalidatePath("/admin")` only | same |

No `catalog` tag is touched: bookings are not in the cached catalog ([[Cache Components]]; tag defined at `app/book/BookingLoader.tsx:10`).

## Status transitions
Any status to any status; the server only checks the value is in `pending|confirmed|cancelled|completed|no_show` (bookings-shared.ts:7, bookings.ts:112). Setting an active status (pending/confirmed) re-triggers the [[Double-booking guard]]: Postgres error `23P01` becomes "That barber already has a booking at that time." (bookings.ts:120). Created bookings get status `confirmed` (default, store.ts:140), no `user_id`, no membership ([[Member cut]] not applied).

## Failure modes
0 rows updated gives "Booking not found." (also when RLS hides the row). Other DB errors give a generic message and log the code.

## Known gaps
- No transition rules: the server accepts e.g. cancelled to completed; only the UI hides some buttons.
- Admin cancel ignores the [[24-hour rule]] (plausibly intended for staff, but undocumented in code).
- Create does not reject past dates or apply [[Booking window]]; "override" also skips time off.

Links: [[Admin bookings lib]], [[Admin auth]], [[Admin hub]], [[Route admin-new-booking]], [[Admin board components]], [[00 Index]].
