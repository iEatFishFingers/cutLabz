import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import AccountShell, { AccountShellFallback } from "@/components/account/AccountShell";

export const metadata: Metadata = {
  title: "Account | Cut Labz",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen flex flex-col">
      <Suspense fallback={<AccountShellFallback />}>
        <AccountShell>{children}</AccountShell>
      </Suspense>
    </div>
  );
}
