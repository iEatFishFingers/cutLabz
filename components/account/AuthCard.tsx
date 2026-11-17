import type { ReactNode } from "react";
import Nav from "@/components/Nav";

export default function AuthCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen">
      <Nav homeHref="/" membershipHref="/#pricing" />
      <main className="flex items-start sm:items-center justify-center px-4 pt-28 pb-10 min-h-screen">
        <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{eyebrow}</p>
          <h1 className="text-2xl font-semibold mt-1 mb-8">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
