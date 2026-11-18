"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen flex items-center justify-center px-4">
      <div role="alert" className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin</p>
        <h1 className="mt-4 text-xl md:text-2xl font-[500] tracking-[-0.02em]">Something went wrong</h1>
        <p className="mt-3 text-sm text-white/60">
          Try again. If it keeps happening, sign in again.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 px-6 bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium"
          >
            Try again
          </button>
          <Link
            href="/admin/login"
            className="min-h-11 px-6 inline-flex items-center justify-center border border-white/20 text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </div>
  );
}
