"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ClockIcon, PlaneIcon, ScissorsIcon, UserIcon } from "./icons";

const LINKS = [
  { href: "/admin", label: "Calendar", Icon: CalendarIcon },
  { href: "/admin/hours", label: "Hours", Icon: ClockIcon },
  { href: "/admin/time-off", label: "Time off", Icon: PlaneIcon },
  { href: "/admin/services", label: "Services", Icon: ScissorsIcon },
  { href: "/admin/barbers", label: "Barbers", Icon: UserIcon },
];

export default function AdminNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  // Make sure the current tab is visible when it sits off-screen on a narrow phone.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav aria-label="Admin" className="relative border-b border-white/10 bg-[#0b0b0b]">
      <ul className="flex overflow-x-auto px-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                ref={active ? activeRef : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 min-h-11 px-4 text-[11px] uppercase tracking-[0.2em] border-b-4 ${
                  active
                    ? "text-white border-white bg-white/[0.06] font-semibold"
                    : "text-white/50 border-transparent hover:text-white"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* Edge fade: hints that more tabs are clipped off-screen on narrow phones. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0b0b0b] to-transparent sm:hidden"
      />
    </nav>
  );
}
