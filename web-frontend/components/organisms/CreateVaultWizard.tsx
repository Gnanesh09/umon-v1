"use client";

import { ReactNode, useCallback, useRef, useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Split,
  Zap,
  ShoppingBag,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Wallet,
  BookmarkPlus,
  Search,
  Star,
  Shield,
  Eye,
  X,
  Check,
  Copy,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { ORACLE_FEEDS, MERCHANT_CATEGORIES, explorerTxUrl, calculateFee } from "@/lib/constants";
import { useSavedWallets, type SavedWallet } from "@/hooks/useSavedWallets";

/* ━━━ Schemas ━━━ */

const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("time_lock"), releaseTime: z.string().min(1, "Required"), percentage: z.coerce.number().min(1).max(100) }),
  z.object({ type: z.literal("milestone"), description: z.string().min(1, "Required"), approvers: z.array(z.string().min(32, "Invalid address")).min(1, "At least 1 approver"), percentage: z.coerce.number().min(1).max(100) }),
  z.object({ type: z.literal("auto_split"), splits: z.array(z.object({ wallet: z.string().min(32, "Invalid address"), percentage: z.coerce.number().min(1).max(100) })).min(2, "At least 2 recipients") }),
  z.object({ type: z.literal("oracle"), feed: z.string().min(1, "Required"), operator: z.enum(["lt", "gt", "eq", "lte", "gte"]), threshold: z.coerce.number(), percentage: z.coerce.number().min(1).max(100) }),
  z.object({ type: z.literal("category"), merchantRegistry: z.string().min(32, "Invalid address"), categories: z.array(z.string()).min(1, "At least 1 category"), percentage: z.coerce.number().min(1).max(100) }),
]);

const formSchema = z.object({
  description: z.string().min(1, "Required"),
  recipientWallet: z.string().min(32, "Invalid wallet address"),
  amountUsdc: z.coerce.number().positive("Must be > 0"),
  conditions: z.array(conditionSchema).min(1, "At least 1 condition"),
});

type FormData = z.infer<typeof formSchema>;
export type CreateVaultSubmitData = FormData;

/* ━━━ Condition Color System ━━━ */

const COND_COLORS: Record<string, { accent: string; bg: string; border: string; iconBg: string }> = {
  time_lock:  { accent: "#3b82f6", bg: "rgba(59,130,246,0.04)",  border: "rgba(59,130,246,0.15)", iconBg: "rgba(59,130,246,0.12)" },
  milestone:  { accent: "#10b981", bg: "rgba(16,185,129,0.04)",  border: "rgba(16,185,129,0.15)", iconBg: "rgba(16,185,129,0.12)" },
  auto_split: { accent: "#8b5cf6", bg: "rgba(139,92,246,0.04)", border: "rgba(139,92,246,0.15)", iconBg: "rgba(139,92,246,0.12)" },
  oracle:     { accent: "#f59e0b", bg: "rgba(245,158,11,0.04)", border: "rgba(245,158,11,0.15)", iconBg: "rgba(245,158,11,0.12)" },
  category:   { accent: "#f43f5e", bg: "rgba(244,63,94,0.04)",  border: "rgba(244,63,94,0.15)", iconBg: "rgba(244,63,94,0.12)" },
};

const CONDITION_TYPES = [
  { type: "time_lock" as const, label: "Time Lock", icon: Clock, desc: "Release at a specific date & time" },
  { type: "milestone" as const, label: "Milestone", icon: CheckCircle2, desc: "Require approvals before release" },
  { type: "auto_split" as const, label: "Auto Split", icon: Split, desc: "Distribute across multiple wallets" },
  { type: "oracle" as const, label: "Oracle Trigger", icon: Zap, desc: "Release when price condition met" },
  { type: "category" as const, label: "Category Lock", icon: ShoppingBag, desc: "Restrict to merchant categories" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "gt", label: "Greater than (>)" },
  { value: "lt", label: "Less than (<)" },
  { value: "gte", label: "Greater or equal (>=)" },
  { value: "lte", label: "Less or equal (<=)" },
  { value: "eq", label: "Equal (=)" },
];

const FEED_OPTIONS = Object.entries(ORACLE_FEEDS).map(([value, { label }]) => ({ value: ORACLE_FEEDS[value].address, label }));

/* ━━━ Step definitions ━━━ */

const STEPS = [
  { num: 1, label: "Details" },
  { num: 2, label: "Conditions" },
  { num: 3, label: "Review" },
  { num: 4, label: "Complete" },
];

/* ━━━ Animation tokens ━━━ */

const spring = { type: "spring" as const, stiffness: 400, damping: 28 };
const gentleSpring = { type: "spring" as const, stiffness: 260, damping: 24 };

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80, filter: "blur(4px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80, filter: "blur(4px)" }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
};

/* ━━━ Decorative: Vault Rings ━━━ */

function VaultRings({ className = "" }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 320 320" fill="none">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle
          key={i}
          cx="160" cy="160"
          r={28 + i * 22}
          stroke="currentColor"
          strokeWidth={i === 3 ? "0.8" : "0.4"}
          strokeDasharray={i % 2 === 0 ? "6 8" : undefined}
          opacity={0.12 - i * 0.012}
        />
      ))}
    </svg>
  );
}

/* ━━━ Step Progress Bar — continuous gradient pill ━━━ */

function StepBar({ current }: { current: number }) {
  const totalSteps = STEPS.length;
  const fillPercent = ((current - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="mb-10">
      {/* Pill track */}
      <div className="relative mx-auto h-12 rounded-full bg-[var(--surface-2)] p-1" style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04)" }}>
        {/* Gradient fill */}
        <motion.div
          className="absolute inset-y-1 left-1 rounded-full"
          style={{ background: "linear-gradient(90deg, #4c3299, #7c5cfc, #a78bfa, #c4b5fd)" }}
          animate={{ width: `${Math.max(fillPercent, 4)}%` }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        />

        {/* Step circles overlaid on the bar */}
        <div className="relative flex h-full items-center justify-between px-1">
          {STEPS.map((s) => {
            const done = s.num < current;
            const active = s.num === current;
            const future = s.num > current;
            const size = active ? "h-9 w-9" : "h-8 w-8";
            return (
              <div key={s.num} className="relative flex items-center justify-center">
                <motion.div
                  className={`relative z-10 flex ${size} items-center justify-center rounded-full`}
                  animate={{
                    background: done
                      ? "linear-gradient(135deg, #5b3ec9, #7c5cfc)"
                      : active
                        ? "linear-gradient(135deg, #7c5cfc, #a78bfa)"
                        : "#e5e7eb",
                    scale: active ? 1 : done ? 0.92 : 0.85,
                    boxShadow: active
                      ? "0 0 0 4px rgba(124,92,252,0.18), 0 4px 12px rgba(124,92,252,0.25)"
                      : done
                        ? "0 2px 8px rgba(124,92,252,0.15)"
                        : "none",
                  }}
                  transition={spring}
                >
                  {done ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={spring}
                    >
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </motion.div>
                  ) : active ? (
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  ) : (
                    <span className="text-[11px] font-bold text-[var(--text-faint)]">{s.num}</span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels below the bar */}
      <div className="mt-2.5 flex justify-between px-2">
        {STEPS.map((s) => {
          const done = s.num < current;
          const active = s.num === current;
          return (
            <div key={s.num} className="flex flex-col items-center" style={{ width: `${100 / totalSteps}%` }}>
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : done
                      ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                      : "bg-[var(--surface-3)] text-[var(--text-faint)]"
                }`}
              >
                {s.num}
              </span>
              <span
                className={`mt-1 text-[11px] font-semibold ${
                  active ? "text-[var(--primary)]" : done ? "text-[var(--text)]" : "text-[var(--text-faint)]"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ━━━ Gradient-border Card ━━━ */

function GCard({
  children,
  className = "",
  borderColor,
}: {
  children: ReactNode;
  className?: string;
  borderColor?: string;
}) {
  const bg = borderColor ?? "rgba(229,231,235,0.8)";
  return (
    <div className={`relative rounded-[20px] p-px ${className}`} style={{ background: `linear-gradient(135deg, ${bg}, rgba(229,231,235,0.3))` }}>
      <div className="rounded-[19px] bg-[var(--surface)]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 8px 32px rgba(0,0,0,0.04)" }}>
        {children}
      </div>
    </div>
  );
}

/* ━━━ Wallet Selector Dropdown ━━━ */

function WalletSelector({
  wallets, onSelect, onAddNew, currentValue,
}: {
  wallets: SavedWallet[];
  onSelect: (address: string) => void;
  onAddNew: () => void;
  currentValue: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, []);

  const filtered = wallets.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) || w.address.toLowerCase().includes(search.toLowerCase()),
  );

  if (wallets.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] px-3 py-1 text-[11px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/[0.08]"
      >
        <Wallet className="h-3 w-3" />
        Saved
        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9px] font-bold text-white leading-none">
          {wallets.length}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={spring}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="p-2.5 pb-2">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2">
                <Search className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search wallets..."
                  className="flex-1 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto px-1.5">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-faint)]">No wallets found</p>
              ) : (
                filtered.map((w, i) => (
                  <motion.button
                    key={w.id}
                    type="button"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => { onSelect(w.address); setOpen(false); setSearch(""); }}
                    className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-3)] ${
                      currentValue === w.address ? "bg-[var(--primary)]/[0.06]" : ""
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, #7c5cfc, #a78bfa)` }}
                    >
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--text)]">{w.name}</p>
                      <p className="truncate font-mono text-[10px] text-[var(--text-faint)]">{w.address.slice(0, 16)}...{w.address.slice(-6)}</p>
                    </div>
                    {currentValue === w.address && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                  </motion.button>
                ))
              )}
            </div>
            <div className="border-t border-[var(--border)] p-1.5">
              <button
                type="button"
                onClick={() => { onAddNew(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-3)]"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ━━━ Save/Add Wallet Modals ━━━ */

function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={spring}
        className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--surface)]"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function SaveWalletModal({ address, onSave, onClose }: { address: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)" }}>
            <BookmarkPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Save this wallet?</h3>
            <p className="text-xs text-[var(--text-muted)]">Quick access next time you create a vault</p>
          </div>
        </div>
      </div>
      <div className="space-y-3 px-6 py-4">
        <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Address</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-muted)]">{address}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Wallet Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Treasury, Vendor, Team Lead..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
          />
        </div>
      </div>
      <div className="flex gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-6 py-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-3)]">Skip</button>
        <button type="button" disabled={!name.trim()} onClick={() => name.trim() && onSave(name.trim())} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition disabled:opacity-40" style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)" }}>
          <BookmarkPlus className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </ModalBackdrop>
  );
}

function AddWalletModal({ onSave, onClose }: { onSave: (name: string, address: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)" }}>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Add New Wallet</h3>
            <p className="text-xs text-[var(--text-muted)]">Save for quick selection later</p>
          </div>
        </div>
      </div>
      <div className="space-y-3 px-6 py-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Wallet Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Treasury, Vendor..." className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Wallet Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Solana wallet address" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 font-mono text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
        </div>
      </div>
      <div className="flex gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-6 py-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-3)]">Cancel</button>
        <button type="button" disabled={!name.trim() || address.length < 32} onClick={() => name.trim() && address.length >= 32 && onSave(name.trim(), address)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition disabled:opacity-40" style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)" }}>
          <Plus className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </ModalBackdrop>
  );
}

/* ━━━ Success: Expanding Vault Rings ━━━ */

function SuccessRings() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg className="h-72 w-72" viewBox="0 0 240 240" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.circle
            key={i}
            cx="120" cy="120"
            fill="none"
            stroke="#22c55e"
            strokeWidth={0.8 - i * 0.1}
            strokeDasharray={i % 2 === 0 ? "4 6" : undefined}
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: 24 + i * 20, opacity: 0.25 - i * 0.04 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ━━━ Confetti ━━━ */

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 360;
    const r = 70 + Math.random() * 80;
    return {
      x: Math.cos((angle * Math.PI) / 180) * r,
      y: Math.sin((angle * Math.PI) / 180) * r,
      size: 3 + Math.random() * 5,
      color: ["#7c5cfc", "#22c55e", "#f59e0b", "#ec4899", "#3b82f6"][i % 5],
      delay: Math.random() * 0.15,
      dur: 0.6 + Math.random() * 0.4,
      rot: Math.random() * 360,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.2, rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }}
          style={{ width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.size > 5 ? 2 : "50%" }}
        />
      ))}
    </div>
  );
}

/* ━━━ Review: dotted leader line ━━━ */

function ReviewRow({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-3">
      <span className={`shrink-0 text-[13px] ${muted ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]"}`}>{label}</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-[var(--border-strong)]" />
      <span className="shrink-0 text-right">{children}</span>
    </div>
  );
}

/* ━━━ Main Wizard ━━━ */

type Props = { onSubmit: (data: FormData) => Promise<{ txSignature: string; vaultAddress: string }> };

export function CreateVaultWizard({ onSubmit }: Props): ReactNode {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [txResult, setTxResult] = useState<{ txSignature: string; vaultAddress: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingAddr, setPendingAddr] = useState("");
  const [copied, setCopied] = useState(false);

  const { wallets, addWallet, isAddressSaved } = useSavedWallets();

  const { register, handleSubmit, control, watch, trigger, getValues, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { conditions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });

  const amount = watch("amountUsdc") || 0;
  const conditions = watch("conditions") || [];
  const recipientWallet = watch("recipientWallet") || "";

  function pctUsed(conds: FormData["conditions"]): number {
    return conds.reduce((s, c) => {
      if (c.type === "auto_split") return s + 100;
      if ("percentage" in c) return s + (Number(c.percentage) || 0);
      return s;
    }, 0);
  }

  const percentageUsed = pctUsed(conditions);
  const percentageRemaining = 100 - percentageUsed;

  const addCondition = useCallback(
    (type: FormData["conditions"][number]["type"]) => {
      const remaining = 100 - pctUsed(getValues("conditions") || []);
      const pct = Math.max(Math.min(remaining, 100), 0);
      switch (type) {
        case "time_lock": append({ type: "time_lock", releaseTime: "", percentage: pct }); break;
        case "milestone": append({ type: "milestone", description: "", approvers: [""], percentage: pct }); break;
        case "auto_split": append({ type: "auto_split", splits: [{ wallet: "", percentage: 50 }, { wallet: "", percentage: 50 }] }); break;
        case "oracle": append({ type: "oracle", feed: FEED_OPTIONS[0]?.value ?? "", operator: "gt", threshold: 0, percentage: pct }); break;
        case "category": append({ type: "category", merchantRegistry: "", categories: ["Medical"], percentage: pct }); break;
      }
    },
    [append, getValues],
  );

  function go(target: number) { setDir(target > step ? 1 : -1); setStep(target); }

  async function toStep2() {
    if (!(await trigger(["description", "recipientWallet", "amountUsdc"]))) return;
    const addr = getValues("recipientWallet");
    if (addr && addr.length >= 32 && !isAddressSaved(addr)) { setPendingAddr(addr); setShowSaveModal(true); }
    go(2);
  }

  async function toStep3() {
    if (!(await trigger("conditions"))) { toast.error("Fix condition errors before continuing"); return; }
    const c = getValues("conditions");
    if (!c || c.length === 0) { toast.error("Add at least one condition"); return; }
    const hasSplit = c.some((x) => x.type === "auto_split");
    const total = pctUsed(c);
    if (!hasSplit && total !== 100) { toast.error(`Percentages must sum to 100% (currently ${total}%)`); return; }
    go(3);
  }

  const submitting = useRef(false);
  const submit = handleSubmit(async (data) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const result = await onSubmit(data);
      setTxResult(result);
      go(4);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaction failed");
    } finally { setLoading(false); submitting.current = false; }
  });

  async function doCopy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Vault ring decoration */}
      <div className="absolute -right-16 -top-12 h-64 w-64 text-[var(--text-faint)] opacity-40 md:-right-24 md:-top-20 md:h-80 md:w-80">
        <VaultRings className="h-full w-full" />
      </div>

      <div className="relative">
        <StepBar current={step} />

        <AnimatePresence mode="wait" custom={dir}>
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━ STEP 1 ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={gentleSpring}>
              <GCard borderColor="rgba(124,92,252,0.18)">
                <div className="p-7 md:p-9">
                  <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-7">
                    {/* Header */}
                    <motion.div variants={fadeUp} className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(99,102,241,0.06))" }}>
                        <Lock className="h-5.5 w-5.5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Create Vault</h2>
                        <p className="text-[13px] text-[var(--text-muted)]">Lock USDC with programmable release conditions</p>
                      </div>
                    </motion.div>

                    {/* Description */}
                    <motion.div variants={fadeUp}>
                      <Input label="Payment Description" placeholder="e.g., Q4 contractor payment" {...register("description")} error={errors.description?.message} />
                    </motion.div>

                    {/* Recipient */}
                    <motion.div variants={fadeUp}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Recipient Wallet</label>
                        <WalletSelector wallets={wallets} currentValue={recipientWallet} onSelect={(a) => setValue("recipientWallet", a, { shouldValidate: true })} onAddNew={() => setShowAddModal(true)} />
                      </div>
                      <div className="relative">
                        <input
                          {...register("recipientWallet")}
                          placeholder="Solana wallet address"
                          className={`h-11 w-full rounded-xl border bg-[var(--surface-2)] px-4 pr-10 font-mono text-xs text-[var(--text)] outline-none transition focus:bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)]/12 ${errors.recipientWallet ? "border-red-500/40 focus:border-red-400" : "border-[var(--border)] focus:border-[var(--primary)]"}`}
                        />
                        {recipientWallet && isAddressSaved(recipientWallet) && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </motion.div>
                        )}
                      </div>
                      {errors.recipientWallet && <p className="mt-1.5 text-xs text-red-400">{errors.recipientWallet.message}</p>}
                      <AnimatePresence>
                        {recipientWallet && isAddressSaved(recipientWallet) && (
                          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {wallets.find((w) => w.address === recipientWallet)?.name}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Amount */}
                    <motion.div variants={fadeUp}>
                      <Input label="USDC Amount" type="number" step="0.01" placeholder="1000.00" {...register("amountUsdc")} error={errors.amountUsdc?.message} />
                      <AnimatePresence>
                        {amount > 0 && (
                          <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -4, height: 0 }} className="mt-2.5 flex flex-wrap items-center gap-2 overflow-hidden">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/[0.04] px-3 py-1 text-xs font-semibold tabular-nums text-[var(--primary)]">
                              ~${amount.toLocaleString()} USD
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] tabular-nums text-[var(--text-muted)]">
                              <Shield className="h-3 w-3" /> 0.5% fee: {(amount * 0.005).toFixed(4)}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Next */}
                    <motion.div variants={fadeUp} className="flex justify-end pt-1">
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void toStep2()}
                        className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)", boxShadow: "0 4px 14px rgba(124,92,252,0.3)" }}
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </div>
              </GCard>
            </motion.div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━ STEP 2 ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={gentleSpring} className="space-y-4">
              {/* Condition picker */}
              <GCard borderColor="rgba(124,92,252,0.15)">
                <div className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(99,102,241,0.06))" }}>
                        <Lock className="h-4.5 w-4.5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold tracking-tight text-[var(--text)]">Conditions</h2>
                        <p className="text-xs text-[var(--text-muted)]">Define release rules for this vault</p>
                      </div>
                    </div>
                    {/* Allocation bar */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: percentageUsed === 100 ? "#22c55e" : percentageUsed > 100 ? "#ef4444" : "linear-gradient(90deg, #7c5cfc, #a78bfa)" }}
                          animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
                          transition={gentleSpring}
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${percentageUsed === 100 ? "text-emerald-400" : percentageUsed > 100 ? "text-red-400" : "text-[var(--text-faint)]"}`}>
                        {percentageUsed}%
                      </span>
                    </div>
                  </div>

                  <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {CONDITION_TYPES.map((ct) => {
                      const Icon = ct.icon;
                      const clr = COND_COLORS[ct.type];
                      const disabled = conditions.length >= 5 || (ct.type === "auto_split" && conditions.some((c) => c.type === "auto_split"));
                      return (
                        <motion.button
                          key={ct.type}
                          variants={fadeUp}
                          type="button"
                          disabled={disabled}
                          whileHover={disabled ? {} : { y: -3, boxShadow: `0 8px 24px ${clr.border}` }}
                          whileTap={disabled ? {} : { scale: 0.97 }}
                          onClick={() => addCondition(ct.type)}
                          className="flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-25"
                          style={{ borderColor: clr.border, background: clr.bg }}
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: clr.iconBg }}>
                            <Icon className="h-4 w-4" style={{ color: clr.accent }} />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text)]">{ct.label}</p>
                            <p className="text-[11px] leading-snug text-[var(--text-muted)]">{ct.desc}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              </GCard>

              {/* Active condition editors */}
              <AnimatePresence mode="popLayout">
                {fields.map((field, index) => {
                  const condition = conditions[index];
                  if (!condition) return null;
                  const clr = COND_COLORS[condition.type] ?? COND_COLORS.time_lock;
                  const ct = CONDITION_TYPES.find((c) => c.type === condition.type);
                  const Icon = ct?.icon ?? Clock;
                  return (
                    <motion.div
                      key={field.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, y: -12 }}
                      transition={spring}
                    >
                      <div className="overflow-hidden rounded-[20px] border" style={{ borderColor: clr.border }}>
                        <div className="flex">
                          {/* Color accent bar */}
                          <div className="w-1 shrink-0" style={{ background: `linear-gradient(to bottom, ${clr.accent}, ${clr.accent}80)` }} />
                          <div className="flex-1 bg-[var(--surface)] p-5">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: clr.iconBg }}>
                                  <Icon className="h-3.5 w-3.5" style={{ color: clr.accent }} />
                                </div>
                                <span className="text-sm font-bold capitalize text-[var(--text)]">{condition.type.replace(/_/g, " ")}</span>
                              </div>
                              <motion.button whileHover={{ scale: 1.1, rotate: 6 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => remove(index)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-faint)] transition hover:bg-red-500/10 hover:text-red-400">
                                <Trash2 className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>

                            {condition.type === "time_lock" && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input label="Release Date & Time" type="datetime-local" {...register(`conditions.${index}.releaseTime` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.releaseTime?.message} />
                                <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.percentage?.message} />
                              </div>
                            )}

                            {condition.type === "milestone" && (
                              <div className="grid gap-3">
                                <Input label="Milestone Description" placeholder="e.g., Complete phase 1 delivery" {...register(`conditions.${index}.description` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.description?.message} />
                                <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                                <div>
                                  <label className="mb-1.5 block text-sm text-[var(--text-muted)]">Approver Wallets</label>
                                  {(condition.approvers ?? [""]).map((_, aIdx) => (
                                    <div key={aIdx} className="mb-2 flex gap-2">
                                      <Input placeholder="Approver wallet address" className="flex-1" {...register(`conditions.${index}.approvers.${aIdx}` as const)} />
                                      {(condition.approvers?.length ?? 0) > 1 && (
                                        <button type="button" onClick={() => { const c = [...(condition.approvers ?? [])]; c.splice(aIdx, 1); setValue(`conditions.${index}.approvers`, c); }} className="text-[var(--text-faint)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                                      )}
                                    </div>
                                  ))}
                                  {(condition.approvers?.length ?? 0) < 3 && (
                                    <button type="button" onClick={() => setValue(`conditions.${index}.approvers`, [...(condition.approvers ?? []), ""])} className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"><Plus className="h-3 w-3" /> Add approver</button>
                                  )}
                                </div>
                              </div>
                            )}

                            {condition.type === "auto_split" && (
                              <div>
                                <label className="mb-2 block text-sm text-[var(--text-muted)]">Split Recipients</label>
                                {(condition.splits ?? []).map((_, sIdx) => (
                                  <div key={sIdx} className="mb-2 flex gap-2">
                                    <Input placeholder="Wallet address" className="flex-1" {...register(`conditions.${index}.splits.${sIdx}.wallet` as const)} />
                                    <Input type="number" placeholder="%" className="w-20" min={1} max={100} {...register(`conditions.${index}.splits.${sIdx}.percentage` as const)} />
                                    {(condition.splits?.length ?? 0) > 2 && (
                                      <button type="button" onClick={() => { const c = [...(condition.splits ?? [])]; c.splice(sIdx, 1); setValue(`conditions.${index}.splits`, c); }} className="text-[var(--text-faint)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                                    )}
                                  </div>
                                ))}
                                <div className="flex items-center justify-between">
                                  {(condition.splits?.length ?? 0) < 10 ? (
                                    <button type="button" onClick={() => setValue(`conditions.${index}.splits`, [...(condition.splits ?? []), { wallet: "", percentage: 0 }])} className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"><Plus className="h-3 w-3" /> Add recipient</button>
                                  ) : <span />}
                                  <span className="text-xs tabular-nums text-[var(--text-faint)]">Sum: {(condition.splits ?? []).reduce((s, r) => s + Number(r.percentage || 0), 0)}%</span>
                                </div>
                              </div>
                            )}

                            {condition.type === "oracle" && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Select label="Price Feed" options={FEED_OPTIONS} {...register(`conditions.${index}.feed` as const)} />
                                <Select label="Operator" options={OPERATOR_OPTIONS} {...register(`conditions.${index}.operator` as const)} />
                                <Input label="Threshold Value" type="number" step="0.01" {...register(`conditions.${index}.threshold` as const)} />
                                <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                              </div>
                            )}

                            {condition.type === "category" && (
                              <div className="grid gap-3">
                                <Input label="Merchant Registry Address" placeholder="Pubkey of on-chain registry" {...register(`conditions.${index}.merchantRegistry` as const)} />
                                <div>
                                  <label className="mb-1.5 block text-sm text-[var(--text-muted)]">Allowed Categories</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {MERCHANT_CATEGORIES.map((cat) => {
                                      const selected = (condition.categories ?? []).includes(cat);
                                      return (
                                        <motion.button key={cat} type="button" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => {
                                          const cur = condition.categories ?? [];
                                          setValue(`conditions.${index}.categories`, selected ? cur.filter((c) => c !== cat) : [...cur, cat]);
                                        }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-[var(--border)] text-[var(--text-muted)] hover:border-rose-500/20"}`}>
                                          {cat}
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Bottom bar */}
              {conditions.length > 0 ? (
                <GCard borderColor={percentageUsed === 100 ? "rgba(34,197,94,0.25)" : "rgba(124,92,252,0.12)"}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14">
                        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="2.5" />
                          <motion.circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={percentageUsed === 100 ? "#22c55e" : "#7c5cfc"}
                            strokeWidth="2.5" strokeLinecap="round"
                            initial={{ strokeDasharray: "0 100" }}
                            animate={{ strokeDasharray: `${percentageUsed} ${100 - percentageUsed}` }}
                            transition={gentleSpring}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-[var(--text)]">{percentageUsed}%</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text)]">{conditions.length} condition{conditions.length !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-[var(--text-muted)]">{percentageRemaining > 0 ? `${percentageRemaining}% remaining` : "Fully allocated"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        <Button variant="secondary" onClick={() => go(1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
                      </motion.div>
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void toStep3()}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-sm font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)", boxShadow: "0 4px 14px rgba(124,92,252,0.25)" }}
                      >
                        Review <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </GCard>
              ) : (
                <div className="flex justify-start">
                  <Button variant="secondary" onClick={() => go(1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━ STEP 3 ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={gentleSpring}>
              <GCard borderColor="rgba(124,92,252,0.2)">
                <div className="p-7 md:p-9">
                  <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
                    <motion.div variants={fadeUp} className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(99,102,241,0.06))" }}>
                        <Eye className="h-5.5 w-5.5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-[var(--text)]">Review Vault</h2>
                        <p className="text-[13px] text-[var(--text-muted)]">Confirm everything before signing the transaction</p>
                      </div>
                    </motion.div>

                    {/* Contract-style review */}
                    <motion.div variants={fadeUp} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-1">
                      <ReviewRow label="Description">
                        <span className="max-w-[200px] truncate text-[13px] font-bold text-[var(--text)]">{watch("description")}</span>
                      </ReviewRow>
                      <ReviewRow label="Recipient">
                        <div className="flex items-center gap-2">
                          {isAddressSaved(recipientWallet) && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">{wallets.find((w) => w.address === recipientWallet)?.name}</span>
                          )}
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">{recipientWallet?.slice(0, 8)}...{recipientWallet?.slice(-4)}</span>
                        </div>
                      </ReviewRow>
                      <ReviewRow label="Amount">
                        <span className="text-[13px] font-extrabold tabular-nums text-[var(--text)]">{Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC</span>
                      </ReviewRow>
                      {(() => {
                        const n = Number(amount) || 0;
                        const lam = Math.round(n * 1_000_000);
                        const feeLam = calculateFee(lam);
                        const feeU = feeLam / 1_000_000;
                        const total = n + feeU;
                        return (
                          <>
                            <ReviewRow label="Platform Fee (0.5%)" muted>
                              <span className="text-[12px] tabular-nums text-[var(--text-faint)]">{feeU.toFixed(4)} USDC</span>
                            </ReviewRow>
                            <div className="my-1 flex items-center justify-between rounded-xl px-1 py-3" style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.06), rgba(99,102,241,0.03))" }}>
                              <span className="text-[13px] font-bold text-[var(--text)]">Total Charged</span>
                              <span className="text-[15px] font-extrabold tabular-nums text-[var(--primary)]">{total.toFixed(4)} USDC</span>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>

                    {/* Conditions summary */}
                    <motion.div variants={fadeUp}>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Conditions ({conditions.length})</p>
                      <div className="space-y-1.5">
                        {conditions.map((c, i) => {
                          const ct = CONDITION_TYPES.find((t) => t.type === c.type);
                          const Icon = ct?.icon ?? Clock;
                          const clr = COND_COLORS[c.type] ?? COND_COLORS.time_lock;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                              style={{ borderColor: clr.border, background: clr.bg }}
                            >
                              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: clr.iconBg }}>
                                <Icon className="h-3 w-3" style={{ color: clr.accent }} />
                              </div>
                              <span className="text-xs font-semibold capitalize text-[var(--text)]">{c.type.replace(/_/g, " ")}</span>
                              {"percentage" in c && <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: clr.accent }}>{c.percentage}%</span>}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>

                    {/* Actions */}
                    <motion.div variants={fadeUp} className="flex gap-3 pt-2">
                      <Button variant="secondary" onClick={() => go(2)}><ChevronLeft className="h-4 w-4" /> Back</Button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        onClick={() => void submit()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)", boxShadow: "0 6px 20px rgba(124,92,252,0.35)" }}
                      >
                        {loading ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                            Signing Transaction...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" /> Create Vault
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </div>
              </GCard>
            </motion.div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━ STEP 4 ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={gentleSpring}>
              <GCard borderColor="rgba(34,197,94,0.25)">
                <div className="relative overflow-hidden px-7 py-12 md:px-10">
                  <SuccessRings />
                  <Confetti />

                  <div className="relative grid place-items-center gap-5 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
                    >
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full"
                        style={{ background: "linear-gradient(135deg, #22c55e, #10b981)", boxShadow: "0 8px 32px rgba(34,197,94,0.3)" }}
                      >
                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 15 }}>
                          <Check className="h-10 w-10 text-white" strokeWidth={3} />
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                      <h3 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Vault Sealed</h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Your payment vault is live on Solana</p>
                    </motion.div>

                    {txResult && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full max-w-sm space-y-2">
                        <div className="rounded-xl bg-[var(--surface-2)] p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Transaction</span>
                            <button type="button" onClick={() => void doCopy(txResult.txSignature)} className="flex items-center gap-1 text-[10px] font-semibold text-[var(--primary)] hover:underline">
                              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <a href={explorerTxUrl(txResult.txSignature)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-mono text-xs text-[var(--primary)] hover:underline">
                            {txResult.txSignature.slice(0, 18)}...{txResult.txSignature.slice(-8)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Vault Address</p>
                          <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{txResult.vaultAddress}</p>
                        </div>
                      </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="flex gap-3 pt-3">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button variant="secondary" onClick={() => { setStep(1); setDir(1); setTxResult(null); }}>
                          <Plus className="h-4 w-4" /> Create Another
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <a
                          href="/dashboard/vaults"
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-sm font-bold text-white transition"
                          style={{ background: "linear-gradient(135deg, #7c5cfc, #6366f1)", boxShadow: "0 4px 14px rgba(124,92,252,0.3)" }}
                        >
                          View Vaults <ChevronRight className="h-4 w-4" />
                        </a>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </GCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSaveModal && pendingAddr && (
          <SaveWalletModal
            address={pendingAddr}
            onSave={(n) => { addWallet(n, pendingAddr); setShowSaveModal(false); setPendingAddr(""); toast.success(`Wallet "${n}" saved!`); }}
            onClose={() => { setShowSaveModal(false); setPendingAddr(""); }}
          />
        )}
        {showAddModal && (
          <AddWalletModal
            onSave={(n, a) => { addWallet(n, a); setShowAddModal(false); toast.success(`Wallet "${n}" saved!`); }}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
