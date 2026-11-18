---
area: platform
source: [app/layout.tsx, app/globals.css, app/favicon.ico, public/]
commit: 14ba133
updated: 2026-11-18
---
# Root layout and styles

**In plain English:** `app/layout.tsx` is the outer HTML shell wrapping every page: it loads fonts, sets the page title and phone viewport. `globals.css` holds the base Tailwind setup. The photos on the home page live in `public/`. Hub: [[Platform hub]]; [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/layout.tsx` | root `<html>/<body>`, Geist + Geist Mono via `next/font/google`, `metadata`, `viewport` |
| `app/globals.css` | `@import "tailwindcss"`, theme tokens, smooth scroll |
| `app/favicon.ico` | tab icon |
| `public/cuts/` | 6 images (`1.png`, `2-6.JPG`); `public/shop.JPG` |

## Details
| Item | Fact |
|---|---|
| Title / description | "Cut Labz \| Membership Barber"; "Unlimited trims from £29.99 / mo." (`layout.tsx:15-18`) |
| Viewport | `viewportFit: "cover"` so `env(safe-area-inset-*)` works on iOS booking bar (`:20-25`) |
| Fonts | CSS vars `--font-geist-sans/mono` on `<html>`, mapped in `@theme inline` |
| Props type | `LayoutProps<"/">` (Next generated global type) |
| Body | `min-h-full flex flex-col`; `lang="en"` |
| Images | referenced from `components/Home.tsx` ([[Route home and terms]]) |

## Depends on / Used by
Wraps all routes ([[Customer UI hub]], [[Admin hub]], [[Accounts hub]]). Visual design rules: [[Visual style rules]]. Tailwind wiring: [[Tooling and config]]. Cache semantics: [[Cache Components]].

## Rules & invariants
No auth or data in the layout; it is purely static.

## Failure modes
`next/font/google` fetches fonts at build time; offline builds likely fail (unverified).

## Changing this safely
Changing `metadata` changes the title everywhere. Keep `viewportFit: "cover"` or the mobile summary bar loses safe-area padding.

## Known gaps
- `globals.css` is the create-next-app default: white background in light mode, `body` font is Arial (`globals.css:29`), so Geist only applies where classes use `font-sans`. Components apparently supply the black theme themselves ([[Visual style rules]]).
