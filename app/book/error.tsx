"use client";

import { useEffect } from "react";

export default function BookError({
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
        <p className="text-xs tracking-[0.25em] text-white/40">BOOKING</p>
        <h1 className="mt-4 text-2xl md:text-3xl font-[500] tracking-[-0.02em]">
          Couldn&apos;t load booking right now.
        </h1>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-8 px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-2"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
