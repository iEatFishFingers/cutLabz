"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Appointments" },
  { href: "/account/membership", label: "Membership" },
  { href: "/account/settings", label: "Settings" },
] as const;

export default function AccountNav() {
  const pathname = usePathname();
  const current = (href: string) =>
    href === "/account" ? pathname === "/account" || pathname.startsWith("/account/bookings") : pathname.startsWith(href);
  return (
    <nav aria-label="Account" className="border-b border-white/10 bg-[#0b0b0b]">
      <ul className="flex overflow-x-auto px-4 sm:px-6">
        {TABS.map((t) => {
          const on = current(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center min-h-11 px-4 -mb-px border-b-2 text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                  on ? "border-white text-white" : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
