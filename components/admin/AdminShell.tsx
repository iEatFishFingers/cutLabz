import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/login/actions";
import AdminNav from "./AdminNav";

// Async server component: reads the session, so it must sit inside <Suspense>.
export default async function AdminShell({ children }: { children: ReactNode }) {
  const { email } = await requireAdmin();
  return (
    <>
      <header className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 min-h-14">
          <div className="flex items-baseline gap-3 shrink-0">
            <span className="text-lg font-semibold">Cut Labz</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin</span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:block truncate text-sm text-white/50">{email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-11 px-4 border border-white/20 text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-black"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <p className="sm:hidden truncate px-4 pb-2 text-xs text-white/50">{email}</p>
      </header>
      <AdminNav />
      <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
    </>
  );
}

export function AdminShellFallback() {
  return (
    <div className="px-4 sm:px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-white/50">
      Loading
    </div>
  );
}
