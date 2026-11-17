"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Calendar" },
  { href: "/admin/hours", label: "Hours" },
  { href: "/admin/time-off", label: "Time off" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/barbers", label: "Barbers" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="border-b border-white/10 bg-[#0b0b0b]">
      <ul className="flex overflow-x-auto px-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center min-h-11 px-4 text-[11px] uppercase tracking-[0.2em] border-b-2 ${
                  active
                    ? "text-white border-white"
                    : "text-white/50 border-transparent hover:text-white"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
