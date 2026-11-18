import Link from "next/link";
import type { ActionResult } from "@/lib/admin/catalog-admin";

export const INPUT =
  "w-full min-h-11 bg-[#0a0a0a] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition";
export const LABEL = "mb-2 block text-xs uppercase tracking-[0.2em] text-white/40";
export const BTN_PRIMARY =
  "min-h-11 px-6 py-3 bg-white text-black text-xs uppercase tracking-[0.2em] font-medium hover:bg-white/90 disabled:opacity-50 transition";
export const BTN_SECONDARY =
  "min-h-11 px-5 py-3 border border-white/20 text-xs uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black disabled:opacity-50 transition";
export const CARD = "bg-[#111] border border-white/10 p-4 sm:p-6";

export function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/50">{intro}</p>
    </header>
  );
}

export function ResultMessage({
  result,
  warningLink,
}: {
  result: ActionResult | null;
  warningLink?: { href: string; label: string };
}) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <p role="alert" className="mt-3 text-sm text-red-400">
        {result.error}
      </p>
    );
  }
  return (
    <div role="status" className="mt-3 space-y-1">
      <p className="text-sm text-green-400">{result.message}</p>
      {result.warning ? (
        <p className="text-sm text-red-400">
          {result.warning}
          {warningLink ? (
            <>
              {" "}
              <Link
                href={warningLink.href}
                className="inline-flex min-h-11 items-center underline hover:text-white"
              >
                {warningLink.label}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  const msg = message;
  if (!msg) return null;
  return <p className="mt-2 text-xs text-red-400">{msg}</p>;
}

export function PanelSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div className="h-8 w-1/3 bg-white/5" />
      <div className="h-40 bg-[#111] border border-white/10" />
    </div>
  );
}
