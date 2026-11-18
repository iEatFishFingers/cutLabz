---
area: booking-engine
source: [app/book/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Actions book
**In plain English:** the two buttons the booking page presses on the server: "load free times" and "confirm booking". They are thin [[Server action]]s that find the signed-in customer, read the shop clock, and hand off to [[Booking server]]. Any crash is turned into a friendly message.

## Files
| path | role |
|---|---|
| app/book/actions.ts | `'use server'` module (`:1`) |

## Public API / exports
| export | does |
|---|---|
| `getSlotsAction(input: GetSlotsInput): Promise<SlotsResult>` | `getSlots(input, shopNow(), viewer)` (`:22-29`) |
| `createBookingAction(input: CreateBookingInput): Promise<CreateBookingResult>` | auth check then `createBooking` (`:31-42`) |

## Reads / Writes
| step | source |
|---|---|
| viewer | `getViewer()` ([[Viewer and session]]) mapped to `{userId, email, membership}` (`:17-20`); null if signed out |
| clock | `shopNow()` ([[Booking shared]]) at request time, safe since actions never prerender with [[Cache Components]] (`:13-15`) |
| writes | indirect, via [[Booking server]] to [[Store Supabase]] |

## Rules & invariants
- `getSlotsAction` works for anonymous users (viewer null); member services then return `Members only.`.
- `createBookingAction` rejects no viewer with `code:"auth"` (`:36`), duplicating the check at `booking-server.ts:168`.
- Any thrown error: `getSlotsAction` gives `{ok:false,error:"Couldn't load times. Try again."}`; `createBookingAction` gives `code:"error"` (`:25-27,39-41`); details only in `console.error`.
- Server actions are public POST endpoints; the input type is only a hint, so [[Booking server]] re-validates ([[Trust boundary]]).

## Security notes
No explicit [[requireCustomer]] call; the viewer is read with `getViewer()` and null is handled. No rate limiting seen (unverified elsewhere).

## Failure modes
`code:"error"` is the only code produced here; all others come from [[Booking server]]. Callers: slot loading and confirmation in [[Booking steps]] / [[Booking flow shell]] (exact components unverified).

## Depends on / Used by
Depends: [[Booking server]], [[Booking shared]], [[Viewer and session]]. Used by [[Booking flow shell]], [[Booking steps]], [[Route book]]. Hub [[Booking engine hub]], [[00 Index]].

## Tests covering it
[[Tests unit]] (logic tested at [[Booking server]] level; the action wrappers themselves unverified).

## Changing this safely
Keep the wrapper free of business rules; add them in [[Booking server]] so reschedule and tests share them. Run [[Request Lifecycles]] mentally for "book".

## Known gaps
- Clock and viewer are read per call, so each slot request does a session lookup plus an uncached catalog load.
- None else found.
