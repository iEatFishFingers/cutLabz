"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { BOOK_URL } from "@/lib/links";
import Year from "@/components/Year";
import Nav from "@/components/Nav";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.1, ease } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 1.4, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
};

const VIDEO_ID = "28MS5QknP_o";

const gallery = [
  "/cuts/3.JPG",
  "/cuts/1.png",
  "/cuts/2.JPG",
  "/cuts/4.JPG",
  "/cuts/5.JPG",
  "/cuts/6.JPG",
];

export default function Home() {
  const [cuts, setCuts] = useState(2);

  return (
    <div className="bg-black text-white font-sans tracking-tight pb-20 md:pb-0">
      <Nav homeHref="#hero" membershipHref="#pricing" />

      <section
        id="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cuts/1.png"
            className="absolute inset-0 w-full h-full object-cover brightness-85"
            alt="Cut Labz"
          />
          <iframe
            className="hidden md:block absolute top-1/2 left-1/2 w-[160vw] h-[160vh] -translate-x-1/2 -translate-y-1/2"
            src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}&playsinline=1`}
            frameBorder="0"
            allow="autoplay; fullscreen"
          />
          <div className="absolute inset-0 bg-black/65 md:bg-black/55" />
        </div>
        <div className="relative z-10 text-center max-w-2xl px-6">
          <h1 className="text-4xl md:text-7xl font-[500] leading-[1.05] tracking-[-0.02em] px-2">
            Unlimited Trims.
            <br />
            £29.99 / Month.
          </h1>
          <p className="mt-5 text-sm md:text-xl text-white/60 leading-relaxed max-w-lg mx-auto px-4">
            Stay sharp. Stay consistent. Manchester&apos;s membership-based
            barbershop built around you.
          </p>
          <div className="mt-9 flex gap-4 justify-center">
            <a
              href="#pricing"
              className="px-6 py-4 text-xs tracking-[0.2em] bg-white text-black border border-white hover:bg-transparent hover:text-white transition"
            >
              JOIN MEMBERSHIP
            </a>
            <Link
              href={BOOK_URL}
              className="px-6 py-4 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition"
            >
              BOOK APPOINTMENT
            </Link>
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35, margin: "-80px" }}
        variants={rise}
        className="py-24 bg-[#0b0b0b] text-center px-6"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-[500] tracking-[-0.02em] leading-[1.05]">
            Stay fresh without the splurge.
          </h2>
          <p className="mt-6 text-white/50 text-base md:text-lg leading-[1.7] max-w-xl mx-auto">
            A membership that keeps you consistently fresh — without thinking
            about your next haircut.
          </p>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={fade}
        className="relative h-[85vh] bg-black flex items-end"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shop.JPG"
            alt="Cut Labz Shop"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 px-6 pb-16 max-w-6xl mx-auto">
          <h3 className="text-2xl md:text-4xl font-[500] max-w-md">
            Built for those who don&apos;t miss.
          </h3>
          <a
            href="#pricing"
            className="mt-5 inline-block px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition"
          >
            JOIN MEMBERSHIP
          </a>
        </div>
      </motion.section>

      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 bg-[#141414] rounded-2xl px-8 md:px-12 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-[500] mb-6 tracking-[-0.02em] leading-[1.1]">
              Always sharp.
            </h2>
            <p className="text-white/50 text-base leading-[1.7] mb-8 max-w-md">
              A membership that removes the friction between you and a clean
              cut.
            </p>
            <div className="space-y-5 text-white/60 text-sm leading-relaxed">
              <div>
                <span className="text-white/80">Unlimited trims</span> — come
                as often as you need
              </div>
              <div>
                <span className="text-white/80">No walk-in queues</span> — book
                when it suits you
              </div>
              <div>
                <span className="text-white/80">Flexible access</span> — cancel
                anytime
              </div>
              <div>
                <span className="text-white/80">Consistent availability</span>{" "}
                — slots always open
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-4"
          >
            {[
              ["FLOW", "Get in, get sorted, get back to your day."],
              [
                "CONSISTENCY",
                "Always the same standard. Always ready when you are.",
              ],
              ["CONTROL", "You decide when. Everything else is handled."],
            ].map(([title, body]) => (
              <div
                key={title}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
              >
                <h3 className="text-xs tracking-[0.2em] mb-2 text-white/80">
                  {title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={stagger}
        id="pricing"
        className="py-24 bg-[#0d0d0d] text-center px-6"
      >
        <h2 className="text-3xl md:text-5xl font-[500] mb-6 tracking-tight">
          Choose your membership
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mb-12 text-[11px] tracking-[0.2em] text-white/40">
          <span>25-60 MIN SESSIONS</span>
          <span>•</span>
          <span>UNLIMITED HAIRCUTS</span>
          <span>•</span>
          <span>CANCEL ANYTIME</span>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          <div className="p-8 border border-white/10 bg-[#111] rounded-xl text-left hover:border-white/30 hover:scale-[1.02] transition">
            <h3 className="text-lg font-[500]">Core</h3>
            <p className="text-2xl font-[500] mt-3">
              £29.99<span className="text-sm text-white/50">/mo</span>
            </p>
            <p className="text-xs text-white/40 mt-3">
              For those who keep it clean.
            </p>
            <ul className="space-y-3 text-sm text-white/60 mb-6 mt-6">
              <li>✓ Unlimited haircuts</li>
              <li>✓ 25 min appointment</li>
              <li>✕ Beard trims</li>
              <li>✕ Add-ons included</li>
            </ul>
            <div className="text-[11px] text-white/40 mb-6">
              Add-ons available: steam facial, hot towel shave, hair wash &amp;
              dry, face mask, hairline filler spray
            </div>
            <Link
              href="/account/membership?plan=core"
              className="block text-center w-full text-xs tracking-[0.2em] px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition"
            >
              JOIN
            </Link>
          </div>

          <div className="p-8 border border-white bg-white text-black rounded-xl text-left relative hover:scale-[1.03] transition shadow-lg">
            <div className="absolute top-4 right-4 text-[10px] tracking-[0.2em]">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-[500]">Plus</h3>
            <p className="text-2xl font-[500] mt-3">
              £39.99<span className="text-sm text-black/60">/mo</span>
            </p>
            <p className="text-xs text-black/60 mt-3">
              For those who stay ready.
            </p>
            <ul className="space-y-3 text-sm text-black/70 mb-6 mt-6">
              <li>✓ Unlimited haircuts</li>
              <li>✓ Beard trims included</li>
              <li>✓ 35 min appointment</li>
              <li>✕ Add-ons included</li>
            </ul>
            <div className="text-[11px] text-black/50 mb-6">
              Add-ons available: steam facial, hot towel shave, hair wash &amp;
              dry, face mask, hairline filler spray
            </div>
            <Link
              href="/account/membership?plan=plus"
              className="block text-center w-full text-xs tracking-[0.2em] px-6 py-3 border border-black hover:bg-black hover:text-white transition"
            >
              JOIN
            </Link>
          </div>

          <div className="p-8 border border-white/10 bg-[#111] rounded-xl text-left hover:border-white/30 hover:scale-[1.02] transition">
            <h3 className="text-lg font-[500]">Premium</h3>
            <p className="text-2xl font-[500] mt-3">
              £69.99<span className="text-sm text-white/50">/mo</span>
            </p>
            <p className="text-xs text-white/40 mt-3">
              For those who don&apos;t compromise.
            </p>
            <ul className="space-y-3 text-sm text-white/60 mb-6 mt-6">
              <li>✓ Unlimited haircuts</li>
              <li>✓ Beard trims included</li>
              <li>✓ 60 min appointment</li>
              <li>✓ Free add-ons included</li>
            </ul>
            <div className="text-[11px] text-white/40 mb-6">
              Includes add-ons: steam facial, hot towel shave, hair wash &amp;
              dry, face mask, hairline filler spray
            </div>
            <Link
              href="/account/membership?plan=premium"
              className="block text-center w-full text-xs tracking-[0.2em] px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition"
            >
              JOIN
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35, margin: "-80px" }}
        variants={rise}
        className="py-24 bg-black text-center px-6"
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-[500] tracking-[-0.02em] leading-[1.05]">
            See your monthly cost with membership vs pay-per-cut.
          </h2>
          <div className="mt-12 bg-[#141414] border border-white/10 rounded-xl p-8 text-left">
            <label className="text-sm text-white/60">
              Haircuts per month: <span className="text-white">{cuts}</span>
            </label>
            <input
              type="range"
              min="0"
              max="12"
              value={cuts}
              onChange={(e) => setCuts(Number(e.target.value))}
              className="w-full mt-4"
            />
            <div className="mt-8 space-y-3 text-sm text-white/60">
              <div>
                Pay-per-cut (£20 x {cuts}):{" "}
                <span className="text-white">£{(20 * cuts).toFixed(2)}</span>
              </div>
              <div>
                Core Membership:{" "}
                <span className="text-white">£29.99 / mo</span>
              </div>
            </div>
            <div className="mt-8 text-lg font-[500]">
              {20 * cuts > 29.99 ? (
                <span className="text-green-400">
                  You save £{(20 * cuts - 29.99).toFixed(2)} per month with
                  membership
                </span>
              ) : (
                <span className="text-white/60">
                  Pay-per-cut is currently cheaper at this usage
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={rise}
        className="py-28 bg-[#0a0a0a] px-6"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-[500] tracking-tight">
              Not ready for membership?
            </h2>
            <p className="mt-6 text-white/55 text-sm leading-relaxed max-w-md">
              Try a one-off appointment first and experience the Cut Labz
              standard.
            </p>
            <p className="mt-4 text-xs text-white/40">
              Most clients switch to membership after their first visit.
            </p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-xl p-8">
            <h3 className="text-xs tracking-[0.2em] text-white/40 mb-6">
              ONE-OFF PRICING
            </h3>
            <div className="space-y-4 text-sm">
              {[
                ["Haircut", "£20"],
                ["Haircut + Beard", "£25"],
                ["Hot Towel Treatment", "£5"],
                ["Hair Wash & Dry", "£5"],
                ["Face Mask / Steam", "£5"],
                ["Hairline Filler Spray", "£5"],
              ].map(([name, price]) => (
                <div key={name} className="flex justify-between text-white/60">
                  <span>{name}</span>
                  <span className="text-white">{price}</span>
                </div>
              ))}
            </div>
            <Link
              href={BOOK_URL}
              className="mt-8 inline-block w-full text-center px-6 py-3 text-xs tracking-[0.2em] border border-white/20 hover:bg-white hover:text-black transition"
            >
              BOOK ONE-OFF
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={stagger}
        className="py-28 bg-black px-6"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-[500] tracking-tight text-center mb-12">
            The standard speaks for itself.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((src, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg max-h-[260px] md:max-h-[300px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Cut Labz work"
                  className="w-full h-full object-cover hover:scale-[1.02] transition duration-1000 ease-out"
                />
              </div>
            ))}
          </div>
          <div className="text-center py-10 border-t border-white/10 bg-black">
            <p className="text-xs tracking-[0.25em] text-white/50">
              5.0 ★ RATED ON GOOGLE • TRUSTED BY 100+ CLIENTS
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={fade}
        className="py-28 bg-[#0b0b0b] px-6"
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-[500] tracking-[-0.02em] leading-[1.1]">
            Simple by design.
          </h2>
          <p className="mt-5 text-white/50 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            No complexity. No waiting lists. Just consistent grooming when it
            matters.
          </p>
          <div className="mt-14 grid md:grid-cols-3 gap-6 text-left">
            {[
              ["STEP 01", "Join", "Pick a membership and get started instantly."],
              [
                "STEP 02",
                "Book",
                "Choose a time that works. Same-week availability, always.",
              ],
              [
                "STEP 03",
                "Stay sharp",
                "Turn up, get cleaned up, leave sharp. Every time.",
              ],
            ].map(([step, title, body]) => (
              <div
                key={step}
                className="bg-[#111] border border-white/10 rounded-xl p-8 hover:border-white/20 transition"
              >
                <p className="text-xs tracking-[0.25em] text-white/40 mb-4">
                  {step}
                </p>
                <h3 className="text-lg font-[500] mb-3 tracking-[-0.01em]">
                  {title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, ease }}
        className="py-40 bg-black text-white text-center px-6"
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.3em] text-white/40 mb-6">
            CUT LABZ MEMBERSHIP
          </p>
          <h2 className="text-4xl md:text-6xl font-[500] tracking-[-0.02em] leading-[1.05]">
            Your next cut shouldn&apos;t be a decision.
          </h2>
          <p className="mt-6 text-xs text-white/40 tracking-[0.2em]">
            NO CONTRACTS • NO QUEUES • UNLIMITED CUTS
          </p>
          <div className="mt-12 flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link
              href={BOOK_URL}
              className="px-8 py-3 text-xs tracking-[0.25em] bg-white text-black hover:bg-transparent hover:text-white border border-white transition duration-300"
            >
              JOIN MEMBERSHIP
            </Link>
            <Link
              href={BOOK_URL}
              className="px-8 py-3 text-xs tracking-[0.25em] border border-white/20 hover:bg-white hover:text-black transition duration-300"
            >
              BOOK FIRST VISIT
            </Link>
          </div>
          <p className="mt-12 text-xs text-white/30">
            Built in Manchester. Designed for consistency.
          </p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 1, ease }}
        className="py-28 bg-[#0b0b0b] px-6"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div className="rounded-2xl overflow-hidden border border-white/10 h-[360px] md:h-[420px]">
            <iframe
              title="Cut Labz Location"
              src="https://www.google.com/maps?q=Cut+Labz+Phenix+Salon+Suites,+1+Deansgate,+Manchester+M3+1AZ&output=embed"
              className="w-full h-full"
              loading="lazy"
            />
          </div>
          <div className="text-left">
            <p className="text-xs tracking-[0.3em] text-white/40 mb-4">
              LOCATION
            </p>
            <h2 className="text-3xl md:text-4xl font-[500] tracking-tight">
              Phenix Salon Suites
            </h2>
            <p className="mt-2 text-white/40 text-sm">
              1 Deansgate, Manchester City Centre, M3 1AZ
            </p>
            <p className="mt-5 text-white/60 text-sm">
              2 mins from Manchester Arndale • Prime city centre access •
              Excellent transport links
            </p>
            <div className="mt-8 border-t border-white/10 pt-6 space-y-3 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Tue - Sat</span>
                <span className="text-white">11:00 - 21:00</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Sun - Mon</span>
                <span className="text-white">Closed</span>
              </div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-sm text-white/60 leading-relaxed">
                <span className="text-white">Parking:</span> Multiple secure
                paid car parks within 2-3 minutes walk. Easy access from
                Deansgate and surrounding streets.
              </p>
            </div>
            <a
              href="https://www.google.com/maps?q=Cut+Labz+Phenix+Salon+Suites,+1+Deansgate,+Manchester+M3+1AZ"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block px-6 py-3 text-xs tracking-[0.25em] border border-white/20 hover:bg-white hover:text-black transition"
            >
              GET DIRECTIONS
            </a>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.9, ease }}
        className="py-20 bg-black border-t border-white/10 px-6"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex gap-6 items-center text-white/60">
            <a
              href="https://instagram.com/cutlabz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition text-xs tracking-[0.2em]"
            >
              INSTAGRAM
            </a>
            <a
              href="https://tiktok.com/@cutlabz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition text-xs tracking-[0.2em]"
            >
              TIKTOK
            </a>
          </div>
          <div className="text-center md:text-center text-white/60 space-y-2">
            <Link href="/terms" className="block text-xs tracking-[0.2em]">
              © <Year /> CUT LABZ
            </Link>
            <Link
              href="/terms"
              className="block hover:text-white transition text-xs tracking-[0.2em]"
            >
              TERMS &amp; CONDITIONS
            </Link>
          </div>
          <div className="text-center md:text-right text-white/60 space-y-2">
            <a
              href="mailto:contact@cutlabz.co.uk"
              className="block hover:text-white transition text-xs tracking-[0.2em]"
            >
              CONTACT@CUTLABZ.CO.UK
            </a>
            <a
              href="tel:+447913784603"
              className="block hover:text-white transition text-xs tracking-[0.2em]"
            >
              +44 7913 784603
            </a>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
