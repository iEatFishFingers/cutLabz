import type { Metadata } from "next";
import Link from "next/link";
import { BOOK_URL } from "@/lib/links";
import Year from "@/components/Year";

export const metadata: Metadata = {
  title: "Privacy Policy | Cut Labz",
};

const navBtn =
  "text-xs px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition";
const a = "underline underline-offset-4 hover:text-white";

export default function Privacy() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <header className="w-full border-b border-white/10 px-6 md:px-20 py-4 flex items-center justify-between">
        <Link href="/" className="text-[14px] tracking-[0.38em] text-white/70">
          CUT LABZ
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/#pricing" className={navBtn}>
            Membership
          </Link>
          <Link href={BOOK_URL} className={navBtn}>
            Book
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-16 md:px-20">
        <div className="max-w-4xl mx-auto space-y-10">
          <h1 className="text-4xl md:text-5xl font-semibold">Privacy Policy</h1>

          <section>
            <h2 className="text-xl font-semibold mb-2">1. Who we are</h2>
            <p className="text-white/70">
              This policy explains how Cut Labz handles personal information when you use this
              website to create an account, book an appointment or take out a membership. You can
              reach us at{" "}
              <a href="mailto:contact@cutlabz.co.uk" className={a}>
                contact@cutlabz.co.uk
              </a>{" "}
              or on{" "}
              <a href="tel:+447913784603" className={a}>
                +44 7913 784603
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. What we collect</h2>
            <ul className="list-disc pl-5 text-white/70 space-y-2">
              <li>Your name, email address and phone number, when you create an account.</li>
              <li>
                Your password. It is handled by our sign-in provider and stored in hashed form. We
                cannot read it.
              </li>
              <li>
                Your bookings: the service, barber, date and time, and any note you add.
              </li>
              <li>Your membership: the plan and its start and end dates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Why we use it</h2>
            <p className="text-white/70">
              We use this information to run your account, manage your bookings and memberships,
              and contact you about them. We do not use it for anything else.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Who handles it for us</h2>
            <ul className="list-disc pl-5 text-white/70 space-y-2">
              <li>Supabase provides our database and sign-in service.</li>
              <li>Vercel hosts the website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Cookies and third-party content</h2>
            <p className="text-white/70">
              When you sign in, we set a cookie that keeps you signed in. It is strictly necessary
              for the account to work. This site does not run its own analytics or advertising.
              Our homepage embeds a YouTube video and a Google Map. Those services can set their
              own cookies when the page loads, under their own policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. How long we keep it</h2>
            <p className="text-white/70">
              We keep your account details until you delete your account. When you do, your login
              and membership are removed, your upcoming appointments are cancelled, and past
              appointment records are kept without your name, email or phone number.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Your rights</h2>
            <p className="text-white/70">
              You can ask to see the information we hold about you, ask us to correct it, or ask
              us to delete it. You can update your name and phone number and delete your account
              yourself under{" "}
              <Link href="/account/settings" className={a}>
                Settings
              </Link>
              , or contact us using the details above. If you are unhappy with how we handle your
              information, you can complain to the Information Commissioner&apos;s Office (ICO) at{" "}
              <a href="https://ico.org.uk" className={a}>
                ico.org.uk
              </a>
              .
            </p>
          </section>

          <div className="pt-10 space-y-2 text-sm text-white/40">
            <p>Last updated: 18 November 2026</p>
            <p>Note for the owner: please review this page before relying on it.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 md:px-20 py-8 text-sm text-white/60">
        <div className="text-center text-white/60 space-y-4 text-xs tracking-[0.2em]">
          <Link href="/">
            © <Year /> CUT LABZ. ALL RIGHTS RESERVED.
          </Link>
        </div>
      </footer>
    </div>
  );
}
