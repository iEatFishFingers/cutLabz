"use client";

import { useActionState, useState } from "react";
import { signIn, type LoginState } from "./actions";

const field =
  "w-full bg-[#111] border border-white/10 px-4 h-12 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-white/40";
const label = "block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2";

export default function LoginForm({
  initialError,
  idPrefix = "login",
  inert = false,
}: {
  initialError?: string;
  /** Distinct per rendered copy so the Suspense fallback never duplicates ids. */
  idPrefix?: string;
  /** The fallback copy is non-interactive and hidden from assistive tech. */
  inert?: boolean;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {
    error: initialError,
  });
  // Controlled so the email survives the form reset after a failed attempt.
  const [email, setEmail] = useState("");
  return (
    <form
      action={action}
      className="space-y-5"
      aria-hidden={inert || undefined}
      inert={inert || undefined}
    >
      <div>
        <label htmlFor={`${idPrefix}-email`} className={label}>
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-password`} className={label}>
          Password
        </label>
        <input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={field}
        />
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-400">
        {state.error ?? ""}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium disabled:opacity-50"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
