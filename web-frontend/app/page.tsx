"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Clock,
  Split,
  Zap,
  Wallet,
  Lock,
  Settings,
  Unlock,
  ArrowRight,
  Github,
  Twitter,
  Globe,
  Store,
  Shield,
  CreditCard,
  BarChart3,
  Users,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                             CountUp Component                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                           Animation Variants                               */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                   Data                                     */
/* -------------------------------------------------------------------------- */

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
    diagram: {
      from: "Employer",
      action: "Locks 3-month salary",
      to: "Employee receives monthly",
    },
  },
  {
    icon: Split,
    title: "Auto Split",
    description:
      "Split incoming payments across wallets instantly. Route revenue to partners, taxes, and savings in one transaction.",
    diagram: {
      from: "Client pays $10k",
      action: "Vault auto-splits",
      to: "60% team · 25% treasury · 15% tax",
    },
  },
  {
    icon: Zap,
    title: "Oracle Trigger",
    description:
      "Release funds when real-world conditions are met — price feeds, delivery confirmation, or custom API signals.",
    diagram: {
      from: "Buyer deposits $50k",
      action: "Oracle confirms delivery",
      to: "Seller receives payment",
    },
  },
];

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Link your Solana wallet in one click. Phantom, Solflare, and more.",
  },
  {
    icon: Lock,
    title: "Create Vault",
    description: "Deposit USDC and define recipients, amounts, and release schedules.",
  },
  {
    icon: Settings,
    title: "Set Conditions",
    description: "Choose time locks, multi-sig, oracle triggers, or auto-split rules.",
  },
  {
    icon: Unlock,
    title: "Auto-Release",
    description: "Funds release automatically when conditions are met. Zero manual work.",
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
      "Multi-business management under one merchant account",
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

/* -------------------------------------------------------------------------- */
/*                              Section Heading                               */
/* -------------------------------------------------------------------------- */

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
      className="mx-auto mb-14 max-w-2xl text-center"
    >
      <span className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
        {tag}
      </span>
      <h2 className="font-cabinet text-3xl font-bold text-gray-900 md:text-4xl">{title}</h2>
      <p className="mt-4 text-gray-500">{subtitle}</p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Navbar                                     */
/* -------------------------------------------------------------------------- */

function Navbar(): ReactNode {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-gray-200/60 bg-white/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
            P
          </div>
          <span className="font-cabinet text-lg font-bold text-gray-900">PowerMoney</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-gray-500 transition hover:text-gray-900">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-500 transition hover:text-gray-900">How it Works</a>
          <a href="#use-cases" className="text-sm text-gray-500 transition hover:text-gray-900">Use Cases</a>
          <a href="#portals" className="text-sm text-gray-500 transition hover:text-gray-900">Get Started</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 md:block"
          >
            Client Login
          </Link>
          <Link
            href="/merchant"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Merchant Portal
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Landing Page                                  */
/* -------------------------------------------------------------------------- */

export default function LandingPage(): ReactNode {
  const [activeTab, setActiveTab] = useState("freelancers");
  const activeCase = useCaseTabs.find((t) => t.id === activeTab)!;

  return (
    <main className="min-h-screen bg-white" style={{ overflow: "auto", height: "100vh" }}>
      <Navbar />

      {/* ------------------------------------------------------------------ */}
      {/*  HERO                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 pt-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 h-[600px] w-[600px] -translate-y-1/2 rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }}
        />

        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-500 shadow-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Built on Solana &middot; Powered by smart vaults
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-cabinet text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 md:text-7xl"
        >
          Money with rules.
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Finally.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-gray-500"
        >
          Lock USDC in programmable on-chain vaults and release it automatically
          when real-world conditions are met. No middlemen, no trust required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center gap-3"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition hover:bg-gray-800"
          >
            Launch App
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/merchant"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Merchant Portal
            <Store size={16} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-xs text-gray-400"
        >
          <span>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="h-6 w-4 rounded-full border border-gray-300"
          >
            <div className="mx-auto mt-1 h-1.5 w-1 rounded-full bg-gray-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  LIVE STATS BAR                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={slideUp} className="text-center md:text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
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

      {/* ------------------------------------------------------------------ */}
      {/*  FEATURES                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          tag="Core Features"
          title="Programmable vaults for every use case"
          subtitle="Three powerful primitives that let you encode any financial logic directly on-chain."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 md:grid-cols-3"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                variants={slideUp}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Icon size={20} className="text-indigo-600" />
                </div>
                <h3 className="font-cabinet text-xl font-bold text-gray-900">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {feat.description}
                </p>
                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col items-center gap-2 text-xs">
                    <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm">
                      {feat.diagram.from}
                    </span>
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-px bg-gray-300" />
                      <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                        {feat.diagram.action}
                      </span>
                      <div className="h-4 w-px bg-gray-300" />
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                      {feat.diagram.to}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  HOW IT WORKS                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="border-y border-gray-100 bg-gray-50/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            tag="How It Works"
            title="Four steps to programmable payments"
            subtitle="From wallet connection to automatic fund release — it takes minutes, not days."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="relative grid gap-8 md:grid-cols-4"
          >
            <div
              aria-hidden
              className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent md:block"
            />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={slideUp}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <Icon size={24} className="text-indigo-600" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-cabinet text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 max-w-[220px] text-sm text-gray-500">{step.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  USE CASES                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section id="use-cases" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          tag="Use Cases"
          title="Built for everyone who moves money"
          subtitle="Whether you are a solo freelancer or a growing business, PowerMoney adapts to your workflow."
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
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
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
            className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
          >
            <ul className="space-y-4">
              {activeCase.points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                    {idx + 1}
                  </span>
                  <span className="text-gray-600">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  TWO PORTALS                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section id="portals" className="border-t border-gray-100 bg-gray-50/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            tag="Get Started"
            title="Choose your portal"
            subtitle="Same wallet, two experiences. Send payments as a client or accept them as a merchant."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
          >
            {/* Client Portal */}
            <motion.div variants={slideUp}>
              <Link href="/dashboard" className="group block">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-indigo-200 hover:shadow-lg">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                    <CreditCard size={28} className="text-indigo-600" />
                  </div>
                  <h3 className="font-cabinet text-2xl font-bold text-gray-900">Send Payments</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Create programmable vaults, lock USDC with conditions, and track releases.
                    Perfect for clients, employers, and individuals.
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <Lock size={14} className="text-gray-500" />
                      </div>
                      Create escrow vaults with conditions
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <BarChart3 size={14} className="text-gray-500" />
                      </div>
                      Real-time analytics and tracking
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <Shield size={14} className="text-gray-500" />
                      </div>
                      Full transaction receipts
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-2 font-medium text-indigo-600 transition group-hover:gap-3">
                    Open Client Dashboard <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Merchant Portal */}
            <motion.div variants={slideUp}>
              <Link href="/merchant" className="group block">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-emerald-200 hover:shadow-lg">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                    <Store size={28} className="text-emerald-600" />
                  </div>
                  <h3 className="font-cabinet text-2xl font-bold text-gray-900">Accept Payments</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Register your business, manage multiple storefronts, and accept USDC payments
                    with built-in escrow protection.
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <Store size={14} className="text-gray-500" />
                      </div>
                      Register multiple businesses
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <Users size={14} className="text-gray-500" />
                      </div>
                      Manage wallets and payments
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                        <BarChart3 size={14} className="text-gray-500" />
                      </div>
                      Business analytics and receipts
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-2 font-medium text-emerald-600 transition group-hover:gap-3">
                    Open Merchant Portal <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  CTA BANNER                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-6 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900 p-10 text-center md:p-16"
        >
          <h2 className="font-cabinet text-3xl font-bold text-white md:text-4xl">
            Start building vaults today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            Join thousands of users who trust PowerMoney to move funds on their
            terms. No sign-up required — just connect your wallet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              Launch App
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/merchant"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Merchant Portal
              <Store size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FOOTER                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
                P
              </div>
              <span className="font-cabinet text-lg font-bold text-gray-900">PowerMoney</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Programmable decentralized payments on Solana. Lock, split, and
              auto-release USDC with on-chain vaults.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <h4 className="mb-3 font-medium text-gray-900">Product</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link href="/dashboard" className="transition hover:text-gray-900">Client Dashboard</Link></li>
                <li><Link href="/merchant" className="transition hover:text-gray-900">Merchant Portal</Link></li>
                <li><Link href="/dashboard/create" className="transition hover:text-gray-900">Create Vault</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium text-gray-900">Resources</h4>
              <ul className="space-y-2 text-gray-500">
                <li><a href="#" className="transition hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="transition hover:text-gray-900">API Reference</a></li>
                <li><a href="#" className="transition hover:text-gray-900">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium text-gray-900">Legal</h4>
              <ul className="space-y-2 text-gray-500">
                <li><a href="#" className="transition hover:text-gray-900">Privacy Policy</a></li>
                <li><a href="#" className="transition hover:text-gray-900">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-gray-400 md:flex-row">
            <span>&copy; 2026 PowerMoney. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="transition hover:text-gray-600">
                <Twitter size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="transition hover:text-gray-600">
                <Github size={16} />
              </a>
              <a href="#" aria-label="Website" className="transition hover:text-gray-600">
                <Globe size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
