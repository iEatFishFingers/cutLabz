---
area: accounts
source: [app/account/layout.tsx, app/account/settings/page.tsx, components/account/settings/SettingsForms.tsx, components/account/settings/actions.ts]
commit: 14ba133
updated: 2026-11-18
---
# Route account-settings

**In plain English:** `/account/settings` lets a signed-in customer change their name, phone and password. The same page is where a password-reset email lands, with the new-password box highlighted. The shared `/account` layout (black page + shell) is also described here. Hub: [[Accounts hub]]; [[00 Index]].

## Files
| path | role |
|---|---|
| `app/account/layout.tsx` | wraps all `/account/**` in `AccountShell` inside `<Suspense>`; `noindex` metadata |
| `app/account/settings/page.tsx` | calls `requireCustomer("/account/settings")`; `?reset=1` puts `PasswordForm highlight` first |
| `settings/SettingsForms.tsx` | client `ProfileForm`, `PasswordForm` (`useActionState`) |
| `settings/actions.ts` | `"use server"`: `updateProfile`, `changePassword` |

Shell/nav UI: [[Account shell and nav]] (S5). Suspense/PPR: [[Cache Components]].

## Actions
| action | line | rules |
|---|---|---|
| `updateProfile` | 16 | name <=200, phone <=100, validated by `validateDetails` ([[Booking shared]]); then `viewer.db.auth.updateUser({data:{full_name,phone}})`; `revalidatePath("/account","layout")` |
| `changePassword` | 37 | 8-72 chars, must equal `confirm` (`:41-43`); `updateUser({password})`; maps `same_password`, `weak_password` |

Email is shown read-only (`SettingsForms.tsx:29`); it cannot be changed here.

## Reads / Writes
Name/phone are stored in Supabase Auth `user_metadata` (not a table), read back in [[Viewer and session]] (`full_name`, `phone`). No database row is touched.

## Security notes
Actions use `requireCustomerAction()` ([[Viewer and session]]); expired session returns "Your session expired. Sign in again." The password change happens through the user's own session client ([[Supabase clients]]). Reset-link sessions are created by [[Route auth-callback]]. Note `/account/**` is gated by [[Auth gating]] first. [[Server action]], [[Trust boundary]].

## Failure modes
Signed-out visit: proxy then `requireCustomer` redirect to `/login?next=/account/settings`. Update error -> generic retry text.

## Depends on / Used by
Depends: [[Viewer and session]], [[Auth forms and actions]] (`Field`, styles). Used by: [[Account shell and nav]] (nav link), [[Route auth-callback]] (reset target).

## Tests covering it
None found ([[Tests unit]]).

## Changing this safely
Keep password limits aligned with [[Auth forms and actions]] (8-72).

## Known gaps
- `changePassword` does not require the current password (relies on being signed in); no `revalidatePath` needed there.
- `updateProfile` passes dummy email `a@b.co` to `validateDetails` (`actions.ts:19`) just to reuse it.
