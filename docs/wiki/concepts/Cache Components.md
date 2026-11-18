---
area: concepts
source: [next.config.ts, app/book/BookingLoader.tsx, app/book/page.tsx, components/admin/settings/revalidate.ts, lib/customer/viewer.ts]
commit: 14ba133
updated: 2026-11-18
---
# Cache Components

**In plain English:** Next.js 16 can pre-build the static parts of a page and stream the personal parts in later. Code opts into caching explicitly with `'use cache'`; anything that reads cookies or the clock must sit inside a `<Suspense>` boundary. In this site only the booking catalog is cached.

Verified against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/` (cacheLife.md, revalidateTag.md, updateTag.md).

| Setting / API | Where | Meaning |
|---|---|---|
| `cacheComponents: true`, `partialPrefetching: true` | `next.config.ts` | enables `'use cache'` + partial prerendering |
| `'use cache'` + `cacheLife("minutes")` + `cacheTag("catalog")` | `app/book/BookingLoader.tsx:7-11` | the only cached component; `minutes` profile = stale 5 min, revalidate 1 min, expire 1 h (cacheLife.md:143) |
| `revalidateTag("catalog", "max")` | `components/admin/settings/revalidate.ts:8` | after admin catalog edits: marks stale, next visitor gets old data while fresh loads (stale-while-revalidate, revalidateTag.md:23) |
| `revalidatePath(...)` | customer + admin actions | re-render those routes |
| React `cache()` | `lib/customer/viewer.ts:60`, `lib/admin/auth.ts:37` | per-request de-duplication only, **not** cross-request caching |

Rules that matter here:
- No user data may enter a `'use cache'` scope (`app/book/page.tsx:17` comment); viewer-specific data is passed via context ([[Booking flow shell]]).
- `shopNow()` (the clock) must not run during prerender ([[Time model]]).
- `updateTag` (read-your-own-writes in server actions, updateTag.md:16) is **not** used; admins may briefly see the old catalog on /book after an edit.
- `loadCatalog()` itself is uncached; `getSlots`/`createBooking` read fresh data every call ([[Catalog loader]]).

Related: [[Route book]], [[Customer UI hub]], [[Admin settings components]], [[Server action]], [[Architecture Overview]], [[00 Index]].
