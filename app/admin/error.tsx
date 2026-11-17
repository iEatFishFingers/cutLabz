"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen flex items-center justify-center px-4">
      <div role="alert" className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin</p>
        <h1 className="mt-4 text-xl md:text-2xl font-[500] tracking-[-0.02em]">
          Something went wrong, or your session expired.
        </h1>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/login"
            className="min-h-11 px-6 inline-flex items-center justify-center bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium"
          >
            Sign in again
          </Link>
          <button
            type="button"
            onClick={() => retry()}
            className="min-h-11 px-6 border border-white/20 text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
