"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Clock,
  Zap,
  ArrowRight,
  Github,
  Twitter,
  Globe,
  Shield,
  ChevronDown,
  TrendingUp,
  Eye,
  Linkedin,
  Layers,
  Target,
  Lightbulb,
  Sparkles,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CountUp                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function CountUp({
  end,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2000,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}): ReactNode {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Animation Variants                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 48 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
const stats = [
  { label: "Total Locked", end: 12.4, prefix: "$", suffix: "M", decimals: 1 },
  { label: "Vaults Created", end: 42980, prefix: "", suffix: "", decimals: 0 },
  { label: "Countries", end: 71, prefix: "", suffix: "", decimals: 0 },
  { label: "Success Rate", end: 99.4, prefix: "", suffix: "%", decimals: 1 },
];

const features = [
  {
    icon: Clock,
    title: "Time Lock",
    description:
      "Schedule USDC releases for any future date. Payroll, vesting, or subscription — funds unlock on your terms.",
    metric: "5-min sessions",
    metricLabel: "Average checkout time",
  },
  {
    icon: Layers,
    title: "Auto Split",
    description:
      "Split incoming payments across wallets instantly. Route revenue to partners, taxes, and savings in one transaction.",
    metric: "∞ splits",
    metricLabel: "Per transaction",
  },
  {
    icon: Zap,
    title: "Oracle Trigger",
    description:
      "Release funds when real-world conditions are met — price feeds, delivery confirmation, or custom API signals.",
    metric: "< 400ms",
    metricLabel: "Confirmation speed",
  },
  {
    icon: TrendingUp,
    title: "Maximum Return on ROI",
    description:
      "Zero middlemen, minimal fees. Keep more of your money with on-chain settlement and transparent fee structures.",
    metric: "0.5%",
    metricLabel: "Platform fee only",
  },
];

const steps = [
  {
    icon: Eye,
    title: "Share Your Vision",
    description: "Connect your Solana wallet and define how your money should move — time locks, splits, or conditions.",
  },
  {
    icon: Layers,
    title: "We Design It",
    description: "Create programmable vaults with USDC. Set recipients, amounts, release schedules, and escrow rules.",
  },
  {
    icon: Zap,
    title: "Ready to Launch",
    description: "Funds release automatically when conditions are met. Monitor everything in real-time from your dashboard.",
  },
];

const useCaseTabs = [
  {
    id: "freelancers",
    label: "Freelancers",
    points: [
      "Milestone-based escrow — get paid when deliverables are approved on-chain",
      "Auto-invoice with scheduled vault releases for retainer clients",
      "Split incoming payments: 70% take-home, 20% tax reserve, 10% savings",
      "Build client trust with transparent, tamper-proof payment timelines",
    ],
  },
  {
    id: "daos",
    label: "DAOs",
    points: [
      "Treasury vesting schedules for core contributors with cliff periods",
      "Proposal-gated releases: funds unlock only after governance vote passes",
      "Multi-sig vaults requiring 3-of-5 signers for large disbursements",
      "Automated grant payouts tied to milestone oracle confirmations",
    ],
  },
  {
    id: "merchants",
    label: "Merchants",
    points: [
      "Accept USDC payments with built-in buyer protection via time-locked escrow",
      "Automatic fee splitting between platform, merchant, and tax reserves",
      "Payment links, invoices, and QR codes — all with 5-minute checkout sessions",
      "Real-time payment tracking and downloadable receipts for compliance",
    ],
  },
  {
    id: "families",
    label: "Families",
    points: [
      "Trust funds that release on birthdays or education milestones",
      "Allowance vaults with weekly auto-release for dependents",
      "Emergency funds locked until a multi-sig family vote unlocks them",
      "Inheritance planning with time-delayed, condition-based transfers",
    ],
  },
];

const faqs = [
  {
    q: "How does Umon keep my funds safe?",
    a: "All funds are held in non-custodial smart vaults on Solana. Only you and the programmed conditions control releases. Umon never has access to your funds.",
  },
  {
    q: "What currencies does Umon support?",
    a: "Currently USDC on Solana Devnet. Mainnet support with additional SPL tokens is on our roadmap.",
  },
  {
    q: "Can I request a refund on a failed payment?",
    a: "Yes. Our PaymentMonitorService automatically detects failed sessions and triggers refunds. Merchants can also initiate manual refunds.",
  },
  {
    q: "Do you support recurring payments?",
    a: "The schema is ready for recurring payments with daily, weekly, monthly, and yearly frequencies. Full automation is coming soon.",
  },
  {
    q: "Is development included in the pricing?",
    a: "Umon is open-source and free to integrate. We only charge a small platform fee (0.5%) on successful transactions.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Section Heading                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function SectionHeading({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}): ReactNode {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="mx-auto mb-16 max-w-2xl text-center"
    >
      <span className="mb-4 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-400">
        {tag}
      </span>
      <h2 className="font-cabinet text-3xl font-bold text-white md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-gray-400">{subtitle}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FAQ Item                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left transition"
      >
        <span className="pr-4 text-sm font-medium text-white">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-gray-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Glow Bar (orange radial glow divider)                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
function GlowBar(): ReactNode {
  return (
    <div className="relative h-px w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      <div
        className="absolute left-1/2 top-1/2 h-32 w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[80px]"
        style={{ background: "radial-gradient(ellipse, #f97316, transparent 70%)" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Navbar                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
function Navbar(): ReactNode {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div
        className={`pointer-events-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-2xl px-5 transition-all duration-500 ${
          scrolled
            ? "border border-white/[0.08] bg-[#0e0e14]/90 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            : "border border-transparent bg-[#0e0e14]/60 backdrop-blur-md"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-orange-500/20">
            U
          </div>
          <span className="font-cabinet text-lg font-bold text-white">Umon</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#features" className="text-sm text-gray-400 transition hover:text-white">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-400 transition hover:text-white">How it Works</a>
          <a href="#use-cases" className="text-sm text-gray-400 transition hover:text-white">Use Cases</a>
          <a href="#pricing" className="text-sm text-gray-400 transition hover:text-white">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/[0.06] hover:text-white md:block"
          >
            Dashboard
          </Link>
          <Link
            href="/merchant"
            className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/30"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  LANDING PAGE                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function LandingPage(): ReactNode {
  const [activeTab, setActiveTab] = useState("freelancers");
  const activeCase = useCaseTabs.find((t) => t.id === activeTab)!;

  return (
    <main
      className="min-h-screen text-white"
      style={{
        overflow: "auto",
        height: "100vh",
        background: "radial-gradient(1400px circle at 50% 0%, #1a1020, #0a0a0f 50%)",
      }}
    >
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 pt-16 text-center">
        {/* Glow behind hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[30%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #f97316, transparent 60%)" }}
        />

        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-300"
        >
          <Sparkles size={12} />
          Introducing Umon — Programmable Payments on Solana
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-cabinet text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl"
        >
          Money with rules.
          <br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            Programmable.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400"
        >
          Lock USDC in programmable on-chain vaults. Release it automatically when
          real-world conditions are met. No middlemen, no trust required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center gap-4"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:shadow-orange-500/40"
          >
            Get Started Now
            <ArrowRight size={16} />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            See Features
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <p className="text-xs text-gray-500">Trusted by 100+ builders and teams</p>
          <div className="flex items-center gap-8 opacity-40">
            {["Solana", "Phantom", "Helius", "Jupiter", "Tensor"].map((name) => (
              <span key={name} className="text-sm font-semibold tracking-wider text-gray-500">{name}</span>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-xs text-gray-500"
        >
          <span>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="h-6 w-4 rounded-full border border-gray-600"
          >
            <div className="mx-auto mt-1.5 h-1.5 w-1 rounded-full bg-gray-500" />
          </motion.div>
        </motion.div>
      </section>

      <GlowBar />

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.04] bg-white/[0.02]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={slideUp} className="text-center md:text-left">
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white md:text-4xl">
                <CountUp
                  end={stat.end}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-24 md:py-32">
        <SectionHeading
          tag="Core Features"
          title="Why PowerMoney?"
          subtitle="We combine clarity, trust, and high-performing vaults to deliver results that actually matter."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 md:grid-cols-2"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                variants={slideUp}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111118] p-6 transition-all hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5"
              >
                {/* Subtle corner glow on hover */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/0 blur-[60px] transition-all duration-500 group-hover:bg-orange-500/10" />

                <div className="relative z-10">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    <Icon size={20} className="text-orange-400" />
                  </div>
                  <h3 className="font-cabinet text-xl font-bold text-white">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {feat.description}
                  </p>

                  {/* Metric */}
                  <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
                    <div>
                      <p className="text-2xl font-bold text-white">{feat.metric}</p>
                      <p className="text-xs text-gray-500">{feat.metricLabel}</p>
                    </div>
                    <div className="flex h-10 w-16 items-end gap-0.5">
                      {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-gradient-to-t from-orange-500/30 to-orange-500/60"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <GlowBar />

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative scroll-mt-24 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            tag="How It Works"
            title="The Process: Fast, Clear, Done"
            subtitle="No endless revisions. No messy handoffs. Just a process that works."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 md:grid-cols-3"
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={slideUp}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111118] p-7 text-center"
                >
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-500/[0.03] to-transparent" />
                  <div className="relative z-10">
                    <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-400">
                      {i + 1}
                    </span>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                      <Icon size={28} className="text-orange-400" />
                    </div>
                    <h3 className="font-cabinet text-lg font-bold text-white">{step.title}</h3>
                    <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-gray-400">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── DON'T SETTLE (asymmetric split) ───────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="mb-4 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-medium text-orange-400">
              Why Umon?
            </span>
            <h2 className="font-cabinet text-3xl font-bold leading-tight text-white md:text-4xl">
              Don&apos;t settle for<br />
              <span className="text-gray-500">template payments</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
              We design programmable vaults to match your exact use case — your rules,
              your conditions, your goals. Smart escrow doesn&apos;t have to feel complicated.
            </p>
            <Link
              href="/dashboard/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/30"
            >
              Start Building
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="relative"
          >
            {/* Dark mockup card */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118]">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-gray-500">umon.app/dashboard</span>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="h-5 w-32 rounded bg-white/[0.06]" />
                <div className="h-4 w-48 rounded bg-white/[0.04]" />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-20 rounded-xl bg-white/[0.04] p-3">
                      <div className="h-2 w-8 rounded bg-orange-500/30" />
                      <div className="mt-3 h-5 w-12 rounded bg-white/[0.08]" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-32 rounded-xl bg-white/[0.04]" />
              </div>
            </div>
            {/* Glow behind mockup */}
            <div
              className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[80%] -translate-x-1/2 opacity-30 blur-[60px]"
              style={{ background: "radial-gradient(ellipse, #f97316, transparent 70%)" }}
            />
          </motion.div>
        </div>
      </section>

      <GlowBar />

      {/* ── DEEP THINKING (reversed split) ────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="order-2 md:order-1"
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118]">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                  <span className="ml-3 text-xs text-gray-500">Smart Vault Designer</span>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-orange-500/40" />
                    <div className="h-3 w-32 rounded bg-white/[0.08]" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-orange-500/30" />
                    <div className="h-3 w-40 rounded bg-white/[0.06]" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-orange-500/20" />
                    <div className="h-3 w-36 rounded bg-white/[0.04]" />
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={14} className="text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">Smart Condition Active</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
                  </div>
                </div>
              </div>
            </div>
            <div
              className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[80%] -translate-x-1/2 opacity-20 blur-[60px]"
              style={{ background: "radial-gradient(ellipse, #f97316, transparent 70%)" }}
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="order-1 md:order-2"
          >
            <h2 className="font-cabinet text-3xl font-bold leading-tight text-white md:text-4xl">
              We think deeply
              <br />
              <span className="text-gray-500">before we build</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
              Smart contracts aren&apos;t just code — they&apos;re trust infrastructure.
              We use first-principles thinking, behavioral psychology, and battle-tested
              patterns to build what people actually need.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { icon: Target, text: "Condition-first vault design" },
                { icon: Shield, text: "On-chain safety guarantees" },
                { icon: Zap, text: "Sub-second Solana settlement" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                    <Icon size={14} className="text-orange-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────────────────────────── */}
      <section id="use-cases" className="relative scroll-mt-24 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            tag="Use Cases"
            title="Built for everyone who moves money"
            subtitle="Whether you are a solo freelancer or a growing DAO, Umon adapts to your workflow."
          />

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mx-auto max-w-3xl"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {useCaseTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                      : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-8 rounded-2xl border border-white/[0.06] bg-[#111118] p-6 md:p-8"
            >
              <ul className="space-y-4">
                {activeCase.points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-400">
                      {idx + 1}
                    </span>
                    <span className="text-gray-300">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <GlowBar />

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-24 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            tag="Pricing"
            title="Straightforward pricing that fits"
            subtitle="Whether you're starting out or scaling up, pick the plan that fits your pace."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3"
          >
            {[
              {
                name: "Starter",
                price: "Free",
                description: "For individuals and small projects getting started with programmable payments.",
                features: [
                  "Up to 50 vaults/month",
                  "Basic time-lock conditions",
                  "Solana Devnet",
                  "Community support",
                ],
                cta: "Get Started",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "0.5%",
                priceNote: "per transaction",
                description: "For businesses and teams that need advanced vault conditions and analytics.",
                features: [
                  "Unlimited vaults",
                  "Oracle triggers & multi-sig",
                  "Auto-split payments",
                  "API access & webhooks",
                  "Priority support",
                ],
                cta: "Start Building",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For organizations that need dedicated infrastructure and SLA guarantees.",
                features: [
                  "Everything in Pro",
                  "Custom integrations",
                  "Dedicated support",
                  "SLA guarantees",
                  "White-label options",
                ],
                cta: "Contact Us",
                highlighted: false,
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                variants={slideUp}
                className={`relative overflow-hidden rounded-2xl border p-7 ${
                  plan.highlighted
                    ? "border-orange-500/30 bg-gradient-to-b from-[#111118] to-[#0e0e14] shadow-xl shadow-orange-500/10"
                    : "border-white/[0.06] bg-[#111118]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                )}
                <p className="text-sm font-medium text-gray-400">{plan.name}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.priceNote && <span className="text-sm text-gray-500">{plan.priceNote}</span>}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/20">
                        <svg className="h-2.5 w-2.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`mt-7 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                      : "border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            tag="FAQ"
            title="Questions? We've got answers."
            subtitle="If you're curious about how Umon works, just reach out for a chat."
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.06] bg-[#111118] px-6"
          >
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </section>

      <GlowBar />

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(ellipse, #f97316, transparent 60%)" }}
        />
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative z-10 mx-auto max-w-2xl text-center"
        >
          <h2 className="font-cabinet text-3xl font-bold text-white md:text-5xl">
            Ready to launch something<br />that actually works?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            No endless complexity. The tooling, design, and infrastructure you need to move money
            on-chain — starting today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:shadow-orange-500/40"
            >
              Get Started Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-gradient-to-t from-orange-500/[0.03] to-transparent">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white">
                U
              </div>
              <span className="font-cabinet text-lg font-bold text-white">Umon</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Helping builders launch faster with programmable, on-chain payment infrastructure on Solana.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <h4 className="mb-3 font-medium text-white">Menu</h4>
              <ul className="space-y-2.5 text-gray-500">
                <li><a href="#features" className="transition hover:text-white">Features</a></li>
                <li><a href="#how-it-works" className="transition hover:text-white">How it Works</a></li>
                <li><a href="#pricing" className="transition hover:text-white">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium text-white">Explore Umon</h4>
              <ul className="space-y-2.5 text-gray-500">
                <li><Link href="/dashboard" className="transition hover:text-white">Client Dashboard</Link></li>
                <li><Link href="/merchant" className="transition hover:text-white">Merchant Portal</Link></li>
                <li><Link href="/dashboard/create" className="transition hover:text-white">Create Vault</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium text-white">Links</h4>
              <ul className="space-y-2.5 text-gray-500">
                <li><a href="#" className="transition hover:text-white">Documentation</a></li>
                <li><a href="#" className="transition hover:text-white">API Reference</a></li>
                <li><a href="#" className="transition hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-gray-500 md:flex-row">
            <span>&copy; 2026 Umon. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <a href="#" aria-label="Twitter" className="transition hover:text-orange-400"><Twitter size={16} /></a>
              <a href="#" aria-label="GitHub" className="transition hover:text-orange-400"><Github size={16} /></a>
              <a href="#" aria-label="LinkedIn" className="transition hover:text-orange-400"><Linkedin size={16} /></a>
              <a href="#" aria-label="Website" className="transition hover:text-orange-400"><Globe size={16} /></a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
