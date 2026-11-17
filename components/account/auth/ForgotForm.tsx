"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestReset, type AuthState } from "./actions";
import { Field, FormError } from "./Fields";
import { linkCls, primaryBtn } from "./styles";

export default function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, {});
  if (state.sent) {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <p className="text-base">If that email has an account, we&apos;ve sent a link.</p>
        <Link href="/login" className={linkCls}>
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field id="email" name="email" text="Email" type="email" inputMode="email" autoComplete="email" maxLength={254} error={state.fieldErrors?.email} />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Sending" : "Send reset link"}
      </button>
      <Link href="/login" className={linkCls}>
        Back to sign in
      </Link>
    </form>
  );
}
