---
area: customer-ui
source: [app/book/page.tsx, app/book/BookingLoader.tsx, app/book/error.tsx]
commit: 14ba133
updated: 2026-11-18
---
# Route book
**In plain English:** `/book` only works for signed-in customers. The page checks who you are, loads the shop menu (services, barbers, hours) from a short-lived cache, and shows the booking wizard. While that loads you see a grey skeleton. Hub: [[Customer UI hub]]; back to [[00 Index]].

## Files
| Path | Role |
|---|---|
| `app/book/page.tsx` | server page; `Suspense` + `BookAccess` |
| `app/book/BookingLoader.tsx` | `'use cache'` loader + `BookingSkeleton` |
| `app/book/error.tsx` | client error boundary |
| `app/book/actions.ts` | server actions, see [[Actions book]] |

## Render chain
```
Book (static shell: Nav + <main>)
 └ <Suspense fallback=BookingSkeleton>
    └ BookAccess (async, getViewer() reads cookies)
       └ <ViewerProvider viewer={subset}>
          └ BookingLoader ('use cache', cacheLife("minutes"), cacheTag("catalog"))
             └ <BookingFlow catalog/>   (client)
```
- `BookAccess` calls `getViewer()`; no viewer: `redirect("/login?next=/book")` (`page.tsx:20-21`). See [[Viewer and session]], [[Routes customer auth]].
- Only `name, email, phone, membership{plan,endsOn}` pass to the browser (`page.tsx:23-29`), see [[Booking flow shell]] viewer context.
- `BookingLoader` is passed as a child so user data never enters the cached component (comment `page.tsx:13-16`). Cache: `cacheLife("minutes")`, tag `catalog` (`BookingLoader.tsx:9-11`); invalidated by `revalidateTag("catalog")` from admin catalog edits ([[Catalog loader]], [[Cache Components]]).
- `Nav` gets `bookCurrent` ([[Site nav and links]]).

## Error boundary
`error.tsx` is `"use client"`, logs the error and shows "Couldn't load booking right now." with a TRY AGAIN button calling `retry()`. In this Next version `retry` is a documented prop of error components (verified: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:117`).

## Security notes
Auth also enforced by [[Proxy request gate]]/[[Auth gating]] (unverified which routes it covers) and re-checked in [[Actions book]] ([[Trust boundary]]). `BookAccess` redirect is a UX guard, not the only one.

## Failure modes
| Case | Result |
|---|---|
| Signed out | redirect to login with `next=/book` |
| DB/catalog throws | `error.tsx` |
| Cache stale up to minutes | submit may fail "menu changed"; flow shows a reload prompt ([[Booking flow shell]]) |

## Changing this safely
Keep `getViewer()` outside `'use cache'` (cookies are not allowed there). Keep the Suspense boundary or the route becomes blocking.

## Known gaps
- Page `<Nav>`/`<main>` markup duplicated with other pages; `BookError` renders its own full-screen shell without Nav.
