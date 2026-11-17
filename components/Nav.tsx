"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BOOK_URL } from "@/lib/links";

const pill =
  "text-xs px-2.5 sm:px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition";

type NavProps = {
  /** "#hero" on the home page, "/" elsewhere. */
  homeHref?: string;
  /** "#pricing" on the home page, "/#pricing" elsewhere. */
  membershipHref?: string;
  /** Marks the Book pill as the current page. */
  bookCurrent?: boolean;
};

export default function Nav({
  homeHref = "/",
  membershipHref = "/#pricing",
  bookCurrent = false,
}: NavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // In-page anchors stay plain <a> (native smooth hash scroll); routes use Link.
  const isAnchor = (href: string) => href.startsWith("#");

  return (
    <nav
      className={`fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/10 transition-all duration-300 ${
        scrolled ? "bg-black/80" : "bg-black/30"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        {isAnchor(homeHref) ? (
          <a href={homeHref} className="text-[14px] tracking-[0.25em] sm:tracking-[0.38em] text-white/70 whitespace-nowrap">
            CUT LABZ
          </a>
        ) : (
          <Link href={homeHref} className="text-[14px] tracking-[0.25em] sm:tracking-[0.38em] text-white/70 whitespace-nowrap">
            CUT LABZ
          </Link>
        )}
        <div className="flex gap-1.5 sm:gap-4 items-center">
          {isAnchor(membershipHref) ? (
            <a href={membershipHref} className={pill}>
              Membership
            </a>
          ) : (
            <Link href={membershipHref} className={pill}>
              Membership
            </Link>
          )}
          <Link
            href={BOOK_URL}
            className={pill}
            aria-current={bookCurrent ? "page" : undefined}
          >
            Book
          </Link>
          <Link href="/account" className={pill}>
            Account
          </Link>
        </div>
      </div>
    </nav>
  );
}
