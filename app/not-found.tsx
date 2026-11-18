import type { Metadata } from "next";
import Link from "next/link";
import { BOOK_URL } from "@/lib/links";
import Year from "@/components/Year";

export const metadata: Metadata = {
  title: "Page not found | Cut Labz",
  robots: { index: false, follow: false },
};

const navBtn =
  "text-xs px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition";

export default function NotFound() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <header className="w-full border-b border-white/10 px-6 md:px-20 py-4 flex items-center justify-between">
        <Link href="/" className="text-[14px] tracking-[0.38em] text-white/70">
          CUT LABZ
        </Link>
      </header>
      <main className="flex-1 flex items-center px-6 py-16 md:px-20">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">404</p>
          <h1 className="text-4xl md:text-5xl font-semibold">Page not found</h1>
          <p className="text-white/70 max-w-md">
            We couldn&apos;t find that page. It may have moved, or the link may be wrong.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className={navBtn}>
              Home
            </Link>
            <Link href={BOOK_URL} className={navBtn}>
              Book
            </Link>
            <Link href="/account" className={navBtn}>
              My account
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-white/10 px-6 md:px-20 py-8 text-xs tracking-[0.2em] text-center text-white/60">
        © <Year /> CUT LABZ. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
