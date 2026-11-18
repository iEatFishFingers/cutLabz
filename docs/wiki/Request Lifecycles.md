---
area: overview
source: [app/book/page.tsx, app/book/actions.ts, lib/booking-server.ts, lib/store.ts, components/account/auth/actions.ts, app/auth/callback/route.ts, app/account/bookings/actions.ts, lib/customer/bookings.ts, app/account/membership/actions.ts, lib/customer/memberships.ts, app/admin/(panel)/bookings/actions.ts, lib/admin/bookings.ts]
commit: 14ba133
updated: 2026-11-18
---
# Request Lifecycles

**In plain English:** step-by-step walk-throughs of the five things people do most, showing which file handles each step. Follow the links for details; the numbers here are the order things actually happen in the code.

## Book a cut
1. `/book` -> [[Proxy request gate]] refreshes cookies (matcher includes `/book`).
2. [[Route book]]: inside `<Suspense>`, `getViewer()`; signed out -> `redirect("/login?next=/book")` (`app/book/page.tsx:21`). Draft survives in sessionStorage.
3. Cached `BookingLoader` sends the `ClientCatalog` ([[Cache Components]], [[Catalog loader]]).
4. [[Booking steps]]: service -> barber -> date/time -> details -> review ([[Booking flow shell]]).
5. Date/time step calls `getSlotsAction` -> `getSlots` ([[Actions book]], [[Slot computation]]).
6. Confirm calls `createBookingAction` -> `createBooking` (`lib/booking-server.ts:163-287`): viewer required -> parse ids + `quote()` -> contact validation -> integer start -> [[Member cut]] gate -> [[Upcoming booking limits]] -> [[Booking window]] + open day -> legal start -> still free -> `insertBooking` per candidate barber.
7. `insertBooking` ([[Store Supabase]], [[Service-role key]]): DB `no_overlap` may reject -> next barber or `slot_taken` ([[Double-booking guard]]).
8. Member-cut race guard, then `ConfirmedBooking` with [[Booking reference]] -> `ConfirmedStep`.

## Sign in
1. `/login` ([[Routes customer auth]]) renders `LoginForm` ([[Auth forms and actions]]).
2. `signIn` server action -> `signInWithPassword` via [[Anon key]] client; Supabase SSR writes `sb-*-auth-token` cookies.
3. `redirect(safeNext(next))` ([[requireCustomer]]).
4. Next navigations: proxy refreshes the token; pages call `getUser()` ([[Viewer and session]]).
Sign-up / reset: email link -> [[Route auth-callback]] -> `exchangeCodeForSession` -> `next`.

## Cancel or reschedule
1. [[Route account]] lists bookings with a `canSelfServe` flag ([[Customer bookings lib]]).
2. Cancel: `cancelBookingAction` -> `requireCustomerAction` -> `cancelMyBooking`: own booking? active? [[24-hour rule]] -> `cancelBooking` (`UPDATE ... status='cancelled'` scoped by `user_id`, `lib/store.ts:231-249`) -> `revalidatePath("/account")` ([[Actions account-bookings]]).
3. Reschedule: [[Route account-reschedule]] -> `getRescheduleSlotsAction` -> `rescheduleBookingAction` -> `rescheduleMyBooking`: 24 h rule on the *old* time, `membershipBlock` for the new date, slot check -> atomic `rescheduleBookingRow` (23P01 -> conflict).

## Join membership
1. [[Route account-membership]] shows plans (`PlanCards`).
2. `joinPlanAction` -> `requireCustomerAction` -> plan id check -> `subscribeToPlan` ([[Actions account-membership]], [[Customer memberships lib]]).
3. Insert 30-day row with service role; overlap -> "already a member" ([[Membership period]]). No payment ([[Placeholder membership]]).
4. `revalidatePath` `/account`, `/account/membership`, `/book`.

## Admin status change
1. `/admin` -> proxy (cookie present?) -> [[Admin panel shell]] `requireAdmin()`.
2. [[Route admin-dashboard]] -> click booking -> `BookingDetail` ([[Admin board components]]).
3. `setBookingStatusAction` -> `requireAdminAction` -> `changeBookingStatus` (status whitelist, any-to-any) via the admin's RLS session ([[Admin bookings lib]], [[Actions admin-bookings]]).
4. Reopen onto a taken slot -> 23P01 -> friendly error. Success -> `revalidatePath("/admin")`.

[[Architecture Overview]] | [[Security Model]] | [[00 Index]]
