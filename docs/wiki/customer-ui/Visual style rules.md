---
area: customer-ui
source: [app/globals.css, components/*]
commit: 14ba133
updated: 2026-11-18
---
# Visual style rules
**In plain English:** the public site is a black, minimal look with white text, thin borders and uppercase spaced-out button labels. Pages hard-code `bg-black text-white`; there is no light mode in use. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Rules observed in code
| Topic | Rule | Evidence |
|---|---|---|
| Page background | `bg-black text-white font-sans tracking-tight` on page roots | `app/book/page.tsx`, `app/account/layout.tsx`, `Home.tsx` |
| Panels | `bg-[#111]` / `#0d0d0d` / `#0a0a0a` + `border border-white/10`, usually `rounded-xl` | `Home.tsx`, `BookingCard`, `PlanCards` |
| Buttons | square corners, `text-xs tracking-[0.2em]`, uppercase; primary = filled white, secondary = `border-white/20`; hover inverts | `components/account/bookings/ui.ts` (`BTN_PRIMARY`, `BTN_SECONDARY`), `BookingFlow.tsx:28-31` |
| Exception | nav links are `rounded-full` pills | `Nav.tsx:6`, `app/terms/page.tsx:11` |
| Touch size | `min-h-11` (44px) on account controls | `ui.ts`, `AccountNav` |
| Focus | `focus-visible:outline outline-1 outline-white outline-offset-2` | `ui.ts` `FOCUS`; `FOCUS_RING` in `ServiceStep` |
| Labels | `text-xs tracking-[0.2em] uppercase text-white/40` (`LABEL`) | `ui.ts` |
| Status colours | green-400 success, red-400 error | `FlashNote`, `PlanCards` |
| Type | Geist Sans/Mono via `next/font` ([[Root layout and styles]]); headings `font-[500]`, `tracking-[-0.02em]` | `app/layout.tsx` |

## Motion
- `framer-motion` ^14.14.0 (`package.json`). Easing `[0.16, 1, 0.3, 1]` redeclared as `ease` in `Home.tsx:8` and `BookingFlow.tsx:25`.
- Home: scroll-reveal (`whileInView`, `once`) with `fade`/`rise`/`stagger` variants ([[Route home and terms]]).
- Booking: `AnimatePresence mode="wait"` between steps, 0.6s ([[Booking flow shell]]); step cards are `motion.button` ([[Booking steps]]).
- Reduced motion: `<MotionConfig reducedMotion="user">` wraps `BookingFlow` and `RescheduleForm`; step scroll uses `auto` when `prefers-reduced-motion`; account tabs use `motion-reduce:transition-none` ([[Account shell and nav]]).

## Known gaps
- `app/globals.css` keeps create-next-app defaults (white `--background`, Arial body font, dark only via `prefers-color-scheme`). The black look comes from per-page classes, so uncovered areas could show white for light-mode users (unverified visually).
- `ease` and button class strings are duplicated (`BookingFlow.tsx`, `ui.ts`; `PlanCards` redefines `FOCUS`); no shared style module.
- Square-button rule is not universal: nav pills and Home cards are rounded.

Related: [[Site nav and links]], [[Account booking components]].
