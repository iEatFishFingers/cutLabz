---
area: customer-ui
source: [app/page.tsx, components/Home.tsx, components/Year.tsx, app/terms/page.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route home and terms
**In plain English:** `/` is the marketing page (hero video, services, membership prices, gallery, location). `/terms` is a static legal page. Neither touches the database. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/page.tsx` | server page, only renders `<Home/>` |
| `components/Home.tsx` (630 lines) | client component, all sections |
| `components/Year.tsx` | footer-year helper |
| `app/terms/page.tsx` | server page, static JSX, `metadata` title |

## Home structure
`Home` is `"use client"` (`Home.tsx:1`) for `useState` (cuts slider, `useState(2)` at line 39) and framer-motion. Sections: hero (`#hero`: image plus muted autoplay YouTube iframe on `md+`), intro, services, `#pricing` (Core/Plus/Premium cards), more content, gallery, location, footer. Motion and look: [[Visual style rules]].

| Link target | From |
|---|---|
| `BOOK_URL` (`/book`) | hero and CTA buttons ([[Site nav and links]]) |
| `/account/membership?plan=core\|plus\|premium` | JOIN buttons (`Home.tsx:237,266,292`); opens [[Route account-membership]] with that plan highlighted |
| `/terms` | footer |
| `mailto:`, `tel:`, Google Maps, Instagram, TikTok | footer / location (external) |

## Year
`Year` uses `useSyncExternalStore` with server snapshot `2026` and client `new Date().getFullYear()`. Its comment: Next 16 disallows `new Date()` during prerender ([[Cache Components]]).

## Terms
Own header (not the shared [[Site nav and links|Nav]]) with Membership and Book pills. Linked from [[Booking steps|ReviewStep]], [[Account booking components|BookingCard]] and [[Route account-reschedule]] for the within-24-hours message ([[24-hour rule]]).

## Security notes
Public, no auth, no server data. Embeds a third-party YouTube iframe.

## Known gaps
- Plan prices/perks on Home are hard-coded text (e.g. Core £29.99/mo), separate from `MEMBERSHIP_PLANS` in `lib/membership.ts` used by [[Route account-membership]] ([[Membership rules]]). Whether they match today is unverified; edits to one will not update the other.
- Home uses plain `<img>` (eslint-disabled) instead of `next/image`.
- Terms header has no Account link, unlike Nav.
