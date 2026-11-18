---
area: meta
source: [lib/membership.ts, lib/customer/memberships.ts, lib/admin/auth.ts, lib/admin/bookings.ts, components/booking/BookingFlow.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Rulings

**In plain English:** a log of decisions the overseer made when areas overlapped or the plan disagreed with the code. No worker sent a formal CLASH/QUESTION message; the rulings below came from reconciling final reports. Back to [[00 Index]] | [[Note Registry]].

| # | Date | Parties | Question | Ruling | Evidence |
|---|---|---|---|---|---|
| R1 | 2026-11-18 | O (brief) vs code | Is a membership 28 days? | **30 days**, start day included. 28 is the [[Booking window]]. | `lib/membership.ts:14`, `lib/catalog.ts:66` |
| R2 | 2026-11-18 | Registry vs S4 | Registry said "subscribe/cancel" for [[Customer memberships lib]] | No cancel exists; documented as a gap. | `lib/customer/memberships.ts` exports only `getMembershipOverview`, `subscribeToPlan` |
| R3 | 2026-11-18 | Registry vs S5 | "six step components"? | Five wizard steps + `ConfirmedStep`; [[Booking steps]] is right. | `components/booking/` |
| R4 | 2026-11-18 | S6 vs S4 | Who documents the sign-out side effect of the admin check? | S4 owns it in [[Admin auth]]; O summarises in [[requireAdmin]] and [[Open issues]]; S6 links. | `lib/admin/auth.ts:25-31` |
| R5 | 2026-11-18 | S2 vs O concept draft | Do admin pages use the service-role key? | No, except admin booking **insert**, which goes through `insertBooking` (service role). Fixed in [[Service-role key]]. | `lib/admin/bookings.ts:5,211`, `lib/store.ts:118` |
| R6 | 2026-11-18 | S1 vs S5 | Where does the black theme come from? | Per-page/component Tailwind classes; `app/globals.css` is still the create-next-app default. Both notes agree ([[Root layout and styles]], [[Visual style rules]]). | `app/globals.css:27-30` |
| R7 | 2026-11-18 | S1 + S4 | Proxy note split | [[Proxy request gate]] = mechanics, [[Auth gating]] = which routes need what. | `proxy.ts` |
