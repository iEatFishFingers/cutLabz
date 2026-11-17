"use client";

import { useActionState } from "react";
import { changePassword, updateProfile, type SettingsState } from "./actions";
import { Field, FormError } from "@/components/account/auth/Fields";
import { primaryBtn } from "@/components/account/auth/styles";
import { LIMITS } from "@/lib/booking-shared";

const card = "bg-[#0a0a0a] border border-white/10 p-5 sm:p-6";
const heading = "text-[11px] uppercase tracking-[0.2em] text-white/50 mb-5";

function Status({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <p role="status" aria-live="polite" className="min-h-5 text-sm text-green-400">
      {ok ? text : ""}
    </p>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  const fe = state.fieldErrors ?? {};
  return (
    <section className={card} aria-labelledby="profile-h">
      <h2 id="profile-h" className={heading}>
        Your details
      </h2>
      <form action={action} className="space-y-5 max-w-sm" noValidate>
        <Field id="email" name="email" text="Email" type="email" maxLength={254} defaultValue={email} readOnly required={false} />
        <Field id="name" name="name" text="Full name" autoComplete="name" maxLength={LIMITS.name} defaultValue={name} error={fe.name} />
        <Field id="phone" name="phone" text="Phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} defaultValue={phone} error={fe.phone} />
        <FormError message={state.error} />
        <Status ok={state.ok} text="Details saved." />
        <button type="submit" disabled={pending} className={`${primaryBtn} sm:w-auto sm:px-8`}>
          {pending ? "Saving" : "Save details"}
        </button>
      </form>
    </section>
  );
}

export function PasswordForm({ highlight }: { highlight: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <section
      id="password"
      className={`${card} ${highlight ? "border-white/40" : ""}`}
      aria-labelledby="password-h"
    >
      <h2 id="password-h" className={heading}>
        {highlight ? "Set a new password" : "Change password"}
      </h2>
      {highlight && (
        <p className="text-sm text-white mb-5">
          You&apos;re signed in from a reset link. Choose a new password below.
        </p>
      )}
      <form action={action} className="space-y-5 max-w-sm" noValidate>
        <Field id="new-password" name="password" text="New password" type="password" autoComplete="new-password" maxLength={72} error={fe.password} hint="8 to 72 characters." />
        <Field id="confirm-password" name="confirm" text="Confirm new password" type="password" autoComplete="new-password" maxLength={72} error={fe.confirm} />
        <FormError message={state.error} />
        <Status ok={state.ok} text="Password updated." />
        <button type="submit" disabled={pending} className={`${primaryBtn} sm:w-auto sm:px-8`}>
          {pending ? "Updating" : "Update password"}
        </button>
      </form>
    </section>
  );
}
