import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import AdminShell, { AdminShellFallback } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin | Cut Labz",
  robots: { index: false, follow: false },
};

// Route group: /admin/login lives outside (panel), so it never gets the shell
// and cannot redirect-loop.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen flex flex-col">
      <Suspense fallback={<AdminShellFallback />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}
