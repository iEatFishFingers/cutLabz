---
area: customer-ui
source: [components/Nav.tsx, lib/links.ts]
commit: 14ba133
updated: 2026-11-18
---
# Site nav and links
**In plain English:** `Nav` is the fixed top bar on the home and booking pages (logo, Membership, Book, Account). `lib/links.ts` holds four URL constants. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `components/Nav.tsx` | client component; scroll-aware bar |
| `lib/links.ts` | URL constants |

## Public API
| Export | Value |
|---|---|
| `BOOK_URL` | `/book` |
| `ACCOUNT_URL` | `/account` |
| `MEMBERSHIP_URL` | `/account/membership` |
| `LOGIN_BOOK_URL` | `/login?next=/book` |
| `Nav({homeHref="/", membershipHref="/#pricing", bookCurrent=false})` | default export |

## Behaviour
- Client because of a passive `scroll` listener: background `bg-black/30` becomes `bg-black/80` past 10px (`Nav.tsx:25-31`).
- On Home it gets `#hero` / `#pricing` (plain `<a>` for native smooth hash scroll); elsewhere `Link`. `isAnchor` chooses.
- `bookCurrent` sets `aria-current="page"` on Book (used by [[Route book]]).
- Account pill is hard-coded `/account`.
- The account area has its own bar: [[Account shell and nav]].

## Depends on / Used by
Uses `BOOK_URL`. Used by [[Route home and terms]] (via `Home`) and [[Route book]]. `BOOK_URL` also used in [[Route account]] and `app/terms/page.tsx`. Gating of `/account` and `/book`: [[Auth gating]], [[Proxy request gate]].

## Failure modes
None at runtime. A signed-out click on Account is redirected to login ([[Routes customer auth]]).

## Known gaps
- `ACCOUNT_URL`, `MEMBERSHIP_URL`, `LOGIN_BOOK_URL` are unused: grep of `app/`, `components/`, `lib/` finds no import (the literals are inlined instead, e.g. `app/book/page.tsx`, `BookingFlow.tsx`).
- Comment in `links.ts` refers to the old Vagaro widget.
