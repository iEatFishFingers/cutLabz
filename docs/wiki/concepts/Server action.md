---
area: concepts
source: [app/book/actions.ts, app/account/bookings/actions.ts, app/account/membership/actions.ts, components/account/auth/actions.ts, components/account/settings/actions.ts, app/admin/login/actions.ts, app/admin/(panel)/bookings/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Server action

**In plain English:** a function marked `'use server'` that runs on the server but can be called from a browser form or button as if it were local. Next turns each one into a public HTTP endpoint, so every action must check who is calling and validate its input itself.

Next docs (`01-app/03-api-reference/01-directives/use-server.md:154-160`): validate inputs, authenticate and authorize inside the function, read auth from cookies not parameters.

All 11 action files (`grep "use server"`):
| File | Guard | Note |
|---|---|---|
| `app/book/actions.ts` | `getViewer()`; slots are public, `createBooking` refuses without a viewer (`lib/booking-server.ts:168`) | [[Actions book]] |
| `app/account/bookings/actions.ts` | `requireCustomerAction` | [[Actions account-bookings]] |
| `app/account/membership/actions.ts` | `requireCustomerAction` | [[Actions account-membership]] |
| `components/account/auth/actions.ts` | public (sign-in/up/reset) | [[Auth forms and actions]] |
| `components/account/settings/actions.ts` | `requireCustomerAction` | [[Route account-settings]] |
| `app/admin/login/actions.ts` | public | [[Route admin-login]] |
| `app/admin/(panel)/{bookings,barbers,services,hours,time-off}/actions.ts` | `requireAdminAction` | [[Actions admin-bookings]], [[Route admin-catalog]], [[Route admin-schedule]] |

Pattern: the action is a thin wrapper (guard + `shopNow()` + call a lib function + `revalidatePath`); logic lives in plain modules (e.g. `lib/booking-server.ts:2`, "kept free of 'use server' so it can be unit tested").

Related: [[requireCustomer]], [[requireAdmin]], [[Trust boundary]], [[Cache Components]], [[Proxy request gate]], [[00 Index]].
