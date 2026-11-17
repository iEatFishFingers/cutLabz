"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const field =
  "w-full bg-[#111] border border-white/10 px-4 h-12 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-white/40";
const label = "block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {
    error: initialError,
  });
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
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
