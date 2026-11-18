"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BTN_SECONDARY } from "./ui";

const BTN_DANGER =
  "min-h-11 px-5 py-3 border border-red-400/60 text-xs uppercase tracking-[0.2em] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition";

/** Red Delete button with an inline "are you sure" step and the server's error shown on failure. */
export default function ConfirmDelete({
  id,
  noun,
  onDelete,
}: {
  id: string;
  noun: string;
  onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setError(null);
      try {
        const r = await onDelete(id);
        if (r.ok) router.refresh();
        else setError(r.error);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });

  if (!confirming) {
    return (
      <button type="button" className={BTN_DANGER} onClick={() => setConfirming(true)}>
        Delete {noun}
      </button>
    );
  }
  return (
    <div className="border border-red-400/30 bg-[#0a0a0a] p-3">
      <p className="text-sm text-white/70">Delete this {noun} for good? This cannot be undone.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} className={BTN_DANGER} onClick={run}>
          {pending ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          type="button"
          disabled={pending}
          className={BTN_SECONDARY}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          Keep
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
