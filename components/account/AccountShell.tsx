import type { ReactNode } from "react";
import Link from "next/link";
import { requireCustomer } from "@/lib/customer/viewer";
import { signOut } from "@/components/account/auth/actions";
import { secondaryBtn } from "@/components/account/auth/styles";
import AccountNav from "./AccountNav";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1] ?? ""}`;
};

// Async server component: reads the session, so it must sit inside <Suspense>.
export default async function AccountShell({ children }: { children: ReactNode }) {
  const v = await requireCustomer("/account");
  const m = v.membership;
  return (
    <>
      <header className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 min-h-14">
          <Link
            href="/"
            className="text-[14px] tracking-[0.38em] text-white/70 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            CUT LABZ
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/book" className={secondaryBtn}>
              Book a cut
            </Link>
            <form action={signOut}>
              <button type="submit" className={secondaryBtn}>
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <span className="truncate text-sm text-white/70">{v.name || v.email}</span>
          {v.name && <span className="truncate text-xs text-white/40">{v.email}</span>}
          {m && (
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/70 border border-white/20 px-2 py-1">
              {m.plan} member · {m.cancelledAt ? "cancelled, active until" : "until"} {shortDate(m.endsOn)}
            </span>
          )}
        </div>
      </header>
      <AccountNav />
      <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-4xl mx-auto min-w-0">{children}</main>
    </>
  );
}

export function AccountShellFallback() {
  return (
    <div aria-busy="true" role="status">
      <div className="border-b border-white/10 bg-[#0a0a0a] min-h-[88px] px-4 sm:px-6 flex items-center">
        <span className="text-[14px] tracking-[0.38em] text-white/70">CUT LABZ</span>
      </div>
      <div className="border-b border-white/10 bg-[#0b0b0b] min-h-11" />
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-3">
        <div className="h-6 w-40 bg-[#141414] motion-safe:animate-pulse" />
        <div className="h-24 bg-[#141414] motion-safe:animate-pulse" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
