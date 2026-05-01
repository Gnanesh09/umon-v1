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
      "Schedule USDC releases for any future date. Payroll, vesting, or subscription — funds unlock on your terms, not a middleman's.",
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
      "Split incoming payments across wallets instantly. Route revenue to partners, taxes, and savings in a single transaction.",
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
      "Release funds when real-world conditions are met — price feeds, weather data, or custom API signals. Trustless escrow for any event.",
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
    description:
      "Link your Solana wallet in one click. Phantom, Solflare, and more supported.",
  },
  {
    icon: Lock,
    title: "Create Vault",
    description:
      "Deposit USDC and define recipients, amounts, and release schedules.",
  },
  {
    icon: Settings,
    title: "Set Conditions",
    description:
      "Choose time locks, multi-sig approvals, oracle triggers, or auto-split rules.",
  },
  {
    icon: Unlock,
    title: "Auto-Release",
    description:
      "Funds release automatically when conditions are met. No manual intervention needed.",
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
    id: "governments",
    label: "Governments",
    points: [
      "Transparent public fund allocation with on-chain audit trails",
      "Conditional aid disbursement tied to verified real-world outcomes",
      "Time-locked budget cycles that prevent unauthorized early spending",
      "Cross-border remittance programs with automatic compliance splits",
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
      <span className="mb-3 inline-block rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
        {tag}
      </span>
      <h2 className="font-cabinet text-3xl font-bold md:text-4xl">{title}</h2>
      <p className="mt-4 text-[var(--text-muted)]">{subtitle}</p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Landing Page                                  */
/* -------------------------------------------------------------------------- */

export default function LandingPage(): ReactNode {
  const [activeTab, setActiveTab] = useState("freelancers");

  const activeCase = useCaseTabs.find((t) => t.id === activeTab)!;

  return (
    <main className="scroll-region h-full">
      {/* ------------------------------------------------------------------ */}
      {/*  HERO                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 h-[480px] w-[480px] -translate-y-1/2 rounded-full opacity-20 blur-[120px]"
          style={{
            background: "radial-gradient(circle, #7c5cfc 0%, transparent 70%)",
          }}
        />

        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-block rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-muted)]"
        >
          Built on Solana &middot; Powered by smart vaults
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="bg-gradient-to-r from-indigo-300 via-violet-400 to-blue-400 bg-clip-text font-cabinet text-5xl font-bold leading-tight text-transparent md:text-7xl"
        >
          Money with rules.
          <br />
          Finally.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-2xl text-lg text-[var(--text-muted)]"
        >
          Lock USDC in programmable on-chain vaults and release it automatically
          when real-world conditions are met. No middlemen, no trust required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center gap-4"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Launch App
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-xs text-[var(--text-faint)]"
        >
          <span>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="h-6 w-4 rounded-full border border-[var(--border-strong)]"
          >
            <div className="mx-auto mt-1 h-1.5 w-1 rounded-full bg-[var(--text-muted)]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  LIVE STATS BAR                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={slideUp}
              className="text-center md:text-left"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-bold md:text-3xl">
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
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
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
          className="grid gap-8 md:grid-cols-3"
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                variants={slideUp}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-subtle)]">
                  <Icon size={20} className="text-[var(--primary)]" />
                </div>
                <h3 className="font-cabinet text-xl font-bold">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {feat.description}
                </p>

                {/* Visual diagram */}
                <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="flex flex-col items-center gap-2 text-xs">
                    <span className="rounded-md bg-[var(--surface-2)] px-3 py-1.5 font-medium">
                      {feat.diagram.from}
                    </span>
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-px bg-[var(--border-strong)]" />
                      <span className="rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-[var(--primary)]">
                        {feat.diagram.action}
                      </span>
                      <div className="h-4 w-px bg-[var(--border-strong)]" />
                    </div>
                    <span className="rounded-md bg-[var(--success-subtle)] px-3 py-1.5 font-medium text-[var(--success)]">
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
      <section className="border-y border-[var(--border)] bg-[var(--surface)] px-6 py-24 md:py-32">
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
            {/* Connecting line (desktop) */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent md:block"
            />

            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={slideUp}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Number badge */}
                  <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-2)]">
                    <Icon size={24} className="text-[var(--primary)]" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-cabinet text-lg font-bold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[220px] text-sm text-[var(--text-muted)]">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  USE CASES                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          tag="Use Cases"
          title="Built for everyone who moves money"
          subtitle="Whether you are a solo freelancer or a national government, PowerMoney adapts to your workflow."
        />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {useCaseTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
          >
            <ul className="space-y-4">
              {activeCase.points.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-sm leading-relaxed"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[10px] font-bold text-[var(--primary)]">
                    {idx + 1}
                  </span>
                  <span className="text-[var(--text-muted)]">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  CTA BANNER                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-6 pb-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] p-10 text-center md:p-16"
        >
          <h2 className="font-cabinet text-3xl font-bold md:text-4xl">
            Start building vaults today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[var(--text-muted)]">
            Join thousands of users who trust PowerMoney to move funds on their
            terms. No sign-up required — just connect your wallet.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Launch App
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FOOTER                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="font-cabinet text-lg font-bold">PowerMoney</span>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Programmable decentralized payments on Solana. Lock, split, and
              auto-release USDC with on-chain vaults.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <h4 className="mb-3 font-medium">Product</h4>
              <ul className="space-y-2 text-[var(--text-muted)]">
                <li>
                  <Link
                    href="/dashboard"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Create Vault
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium">Resources</h4>
              <ul className="space-y-2 text-[var(--text-muted)]">
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-medium">Legal</h4>
              <ul className="space-y-2 text-[var(--text-muted)]">
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-[var(--text)]"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-[var(--text-muted)] md:flex-row">
            <span>&copy; 2026 PowerMoney. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="transition-colors hover:text-[var(--text)]"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="transition-colors hover:text-[var(--text)]"
              >
                <Github size={16} />
              </a>
              <a
                href="#"
                aria-label="Website"
                className="transition-colors hover:text-[var(--text)]"
              >
                <Globe size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
