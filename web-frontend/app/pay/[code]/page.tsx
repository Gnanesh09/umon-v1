"use client";

import { type ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { api, type ApiResult } from "@/lib/api";
import { USDC_DEVNET_MINT, explorerTxUrl, calculateFee, TREASURY_WALLET } from "@/lib/constants";
import { formatUsdcRaw, truncateAddress } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Store,
  Wallet,
  ChevronRight,
  Lock,
  Zap,
  CircleDollarSign,
  RefreshCw,
} from "lucide-react";

type PaymentLink = {
  id: string;
  shortCode: string;
  ownerType: string;
  recipientWallet: string;
  amountUsdc: number | null;
  title: string;
  description: string | null;
  conditions: unknown[];
  merchantId: string | null;
};

type PaymentSession = {
  id: string;
  status: string;
  amount_usdc: number;
  recipient_wallet: string;
  tx_signature: string | null;
  expires_at: string;
  confirmed_at: string | null;
  error_message: string | null;
};

type Step = "loading" | "ready" | "paying" | "confirming" | "completed" | "failed" | "expired" | "not_found";

function useCountdown(expiresAt: string | null): { remaining: number; initialized: boolean } {
  const [remaining, setRemaining] = useState(-1);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(-1);
      return;
    }
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return { remaining, initialized: remaining >= 0 };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function TimerBadge({ ms }: { ms: number }): ReactNode {
  const urgent = ms < 60_000;
  const percent = Math.min(100, (ms / 300_000) * 100);

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${
      urgent
        ? "bg-red-50 text-red-600"
        : "bg-gray-100 text-gray-600"
    }`}>
      <div className="relative h-4 w-4">
        <svg className="h-4 w-4 -rotate-90" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke={urgent ? "#fecaca" : "#e5e7eb"} strokeWidth="2" />
          <circle
            cx="8" cy="8" r="6" fill="none"
            stroke={urgent ? "#ef4444" : "#10b981"}
            strokeWidth="2"
            strokeDasharray={`${(percent / 100) * 37.7} 37.7`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
      </div>
      <span>{formatTime(ms)}</span>
    </div>
  );
}

function SuccessScreen({
  amount,
  recipient,
  txSignature,
  title,
}: {
  amount: string;
  recipient: string;
  txSignature: string | null;
  title: string;
}): ReactNode {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const shortTx = txSignature ? `${txSignature.slice(0, 8)}...${txSignature.slice(-4)}` : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Dark bg with green gradient top */}
      <div className="absolute inset-0 bg-[#080a08]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)" }}
      />
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-5 py-10">
        {/* Checkmark */}
        <motion.div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/30"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
        >
          <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
            />
          </svg>
        </motion.div>

        <motion.p
          className="mb-6 text-lg font-bold text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Payment Successful!
        </motion.p>

        {/* Receipt card */}
        <motion.div
          className="w-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex flex-col items-center px-6 pb-5 pt-6">
            {/* Title pill */}
            <span className="mb-3 inline-block rounded-full bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-600">
              {title}
            </span>

            {/* Amount */}
            <p className="text-4xl font-bold tracking-tight text-gray-900">${amount}</p>
            <p className="mt-1 text-xs text-gray-400">USDC</p>

            {/* Date */}
            <p className="mt-3 text-xs text-gray-400">
              {dateStr} &middot; {timeStr}
            </p>
          </div>

          {/* Dashed separator */}
          <div className="relative mx-4">
            <div className="border-t border-dashed border-gray-200" />
            <div className="absolute -left-7 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#080a08]" />
            <div className="absolute -right-7 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#080a08]" />
          </div>

          {/* Details */}
          <div className="px-6 pb-6 pt-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Payment ID</p>
                <p className="mt-1 font-mono text-xs font-semibold text-gray-700">
                  {shortTx ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Payment Method</p>
                <p className="mt-1 text-xs font-semibold text-gray-700">Solana USDC</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-700">
                Paid to {truncateAddress(recipient)}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">Solana Network &middot; Confirmed</p>
            </div>

            {txSignature && (
              <a
                href={explorerTxUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                <ExternalLink size={14} />
                View on Solana Explorer
              </a>
            )}
          </div>
        </motion.div>

        {/* Bottom message */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-sm text-gray-400">
            We appreciate your payment,
          </p>
          <p className="text-sm font-medium text-gray-300">
            See you again!
          </p>
          <p className="mt-4 text-[10px] text-gray-600">
            Powered by <span className="font-semibold text-gray-400">Umon</span> on Solana
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function CheckoutPage(): ReactNode {
  const params = useParams();
  const code = params.code as string;
  const { connection } = useConnection();
  const wallet = useWallet();
  const walletModal = useWalletModal();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<Step>("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payingRef = useRef(false);

  const linkQuery = useQuery({
    queryKey: ["payment-link", code],
    queryFn: async () => {
      const res = await api.get<ApiResult<PaymentLink>>(`/payment-links/code/${code}`);
      return res.data.data;
    },
    retry: false,
  });

  const link = linkQuery.data;

  useEffect(() => {
    if (linkQuery.isError || (linkQuery.isSuccess && !link)) {
      setStep("not_found");
    } else if (linkQuery.isSuccess && link) {
      setStep("ready");
    }
  }, [linkQuery.isSuccess, linkQuery.isError, link]);

  const { remaining: countdown, initialized: countdownReady } = useCountdown(session?.expires_at ?? null);

  useEffect(() => {
    if (countdownReady && countdown === 0 && !payingRef.current && (step === "paying" || step === "ready")) {
      setStep("expired");
    }
  }, [countdown, countdownReady, step]);

  const pollSession = useCallback(async () => {
    if (!session) return;
    try {
      const res = await api.get<ApiResult<PaymentSession>>(`/payment-sessions/${session.id}`);
      const updated = res.data.data;
      setSession(updated);
      if (updated.status === "completed") {
        setStep("completed");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (updated.status === "failed") {
        setStep("failed");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (updated.status === "expired") {
        setStep("expired");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // ignore poll errors
    }
  }, [session]);

  useEffect(() => {
    if (step === "confirming" && session) {
      pollRef.current = setInterval(pollSession, 2000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [step, session, pollSession]);

  const handlePay = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !link) return;

    const amountUsdc = link.amountUsdc ?? Number(customAmount) * 1_000_000;
    if (!amountUsdc || amountUsdc <= 0) return;

    payingRef.current = true;
    setStep("paying");

    let sess: PaymentSession;
    try {
      const res = await api.post<ApiResult<PaymentSession>>("/payment-sessions", {
        paymentLinkId: link.id,
        recipientWallet: link.recipientWallet,
        amountUsdc,
        payerWallet: wallet.publicKey.toBase58(),
      });
      sess = res.data.data;
      setSession(sess);
    } catch {
      payingRef.current = false;
      setStep("failed");
      return;
    }

    try {
      const recipientPk = new PublicKey(link.recipientWallet);
      const payerAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, wallet.publicKey);
      const recipientAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, recipientPk);

      const tx = new Transaction();

      try {
        await getAccount(connection, recipientAta);
      } catch {
        tx.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey, recipientAta, recipientPk, USDC_DEVNET_MINT,
          ),
        );
      }

      tx.add(
        createTransferInstruction(payerAta, recipientAta, wallet.publicKey, BigInt(amountUsdc)),
      );

      const feeAmount = calculateFee(amountUsdc);
      if (feeAmount > 0) {
        const treasuryAta = await getAssociatedTokenAddress(USDC_DEVNET_MINT, TREASURY_WALLET);
        try {
          await getAccount(connection, treasuryAta);
        } catch {
          tx.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey, treasuryAta, TREASURY_WALLET, USDC_DEVNET_MINT,
            ),
          );
        }
        tx.add(
          createTransferInstruction(payerAta, treasuryAta, wallet.publicKey, BigInt(feeAmount)),
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());

      await api.put(`/payment-sessions/${sess.id}/pay`, {
        payerWallet: wallet.publicKey.toBase58(),
        txSignature: sig,
      });

      payingRef.current = false;
      setSession((prev) => prev ? { ...prev, tx_signature: sig, status: "confirming" } : prev);
      setStep("confirming");
    } catch (e: unknown) {
      payingRef.current = false;
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("User rejected")) {
        setStep("ready");
        setSession(null);
        return;
      }
      setStep("failed");
      setSession((prev) => prev ? { ...prev, error_message: msg, status: "failed" } : prev);
      if (sess) {
        api.put(`/payment-sessions/${sess.id}/fail`, { errorMessage: msg }).catch(() => {});
      }
    }
  };

  // ── NOT FOUND ──
  if (step === "not_found") {
    return (
      <motion.div {...fadeUp} className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg shadow-gray-200/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <XCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Payment Link Not Found</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            This link may have expired or been deactivated.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── LOADING ──
  if (step === "loading" || linkQuery.isLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
          <div className="h-44 animate-pulse bg-gradient-to-br from-gray-100 to-gray-50" />
          <div className="space-y-4 p-6">
            <div className="mx-auto h-4 w-28 animate-pulse rounded-md bg-gray-100" />
            <div className="mx-auto h-10 w-40 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-16 animate-pulse rounded-xl bg-gray-50" />
            <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!link) return null;

  const amountUsdc = link.amountUsdc;
  const displayAmount = amountUsdc ? formatUsdcRaw(amountUsdc) : null;
  const feeAmount = amountUsdc ? calculateFee(amountUsdc) : 0;
  const totalAmount = amountUsdc ? amountUsdc + feeAmount : 0;

  // ── COMPLETED ──
  if (step === "completed") {
    return (
      <SuccessScreen
        amount={displayAmount ?? formatUsdcRaw(session?.amount_usdc ?? 0)}
        recipient={link.recipientWallet}
        txSignature={session?.tx_signature ?? null}
        title={link.title}
      />
    );
  }

  // ── EXPIRED ──
  if (step === "expired") {
    return (
      <motion.div {...fadeUp} className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Clock size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold">Session Expired</h1>
                <p className="text-sm text-amber-100">Your 5-minute window has ended</p>
              </div>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-sm leading-relaxed text-gray-500">
              For your security, payment sessions expire after 5 minutes. No money was charged.
            </p>
            <button
              onClick={() => { setSession(null); payingRef.current = false; setStep("ready"); }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── FAILED ──
  if (step === "failed") {
    return (
      <motion.div {...fadeUp} className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold">Payment Failed</h1>
                <p className="text-sm text-red-100">Transaction could not be completed</p>
              </div>
            </div>
          </div>
          <div className="p-6 text-center">
            {session?.error_message && (
              <div className="mb-4 rounded-xl bg-red-50 p-3.5 text-left">
                <p className="text-xs leading-relaxed text-red-600">{session.error_message}</p>
              </div>
            )}
            <p className="text-sm leading-relaxed text-gray-500">
              Don&apos;t worry &mdash; if any amount was deducted, it will be automatically refunded.
            </p>
            <button
              onClick={() => { setSession(null); payingRef.current = false; setStep("ready"); }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── CONFIRMING ──
  if (step === "confirming") {
    return (
      <motion.div {...fadeUp} className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-5">
            <div className="relative z-10 flex items-center gap-3 text-white">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={20} />
              </motion.div>
              <div>
                <h1 className="text-base font-bold">Confirming on Solana</h1>
                <p className="text-sm text-indigo-200">Usually takes a few seconds</p>
              </div>
            </div>
            {/* Shimmer bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <motion.div
                className="h-full bg-white/40"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "50%" }}
              />
            </div>
          </div>

          <motion.div className="p-6" variants={staggerChildren} initial="initial" animate="animate">
            <div className="space-y-3">
              {[
                { label: "Transaction signed", done: true },
                { label: "Submitted to Solana", done: true },
                { label: "Waiting for confirmation...", done: false },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className={`flex items-center gap-3 rounded-xl p-3.5 ${
                    item.done ? "bg-emerald-50" : "bg-indigo-50"
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Loader2 size={18} className="animate-spin text-indigo-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    item.done ? "text-emerald-700" : "text-indigo-700"
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {session?.tx_signature && (
              <motion.a
                href={explorerTxUrl(session.tx_signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <ExternalLink size={14} /> View on Explorer
              </motion.a>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── READY — MAIN CHECKOUT ──
  return (
    <motion.div {...fadeUp} className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 pb-6 pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
                <Store size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">{link.title}</h1>
                {link.description && (
                  <p className="mt-0.5 text-xs text-gray-400">{link.description}</p>
                )}
              </div>
            </div>
            {session && countdownReady && countdown > 0 && (
              <TimerBadge ms={countdown} />
            )}
          </div>

          {/* Amount */}
          <div className="mt-6">
            {displayAmount ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Amount</p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-white">${displayAmount}</span>
                  <span className="text-sm font-medium text-gray-400">USDC</span>
                </div>
                {feeAmount > 0 && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Total: ${formatUsdcRaw(totalAmount)} (incl. ${formatUsdcRaw(feeAmount)} fee)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Enter Amount</p>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors focus-within:border-emerald-500/40 focus-within:bg-white/10">
                  <CircleDollarSign size={22} className="text-emerald-400" />
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-gray-600"
                  />
                  <span className="text-sm font-semibold text-gray-400">USDC</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Payment details */}
          <div className="mb-5 divide-y divide-gray-100 rounded-xl bg-gray-50 px-4">
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-gray-500">Recipient</span>
              <span className="font-mono font-semibold text-gray-800">{truncateAddress(link.recipientWallet)}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-gray-500">Network</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                <span className="font-semibold text-gray-800">Solana</span>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Devnet</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-gray-500">Currency</span>
              <span className="font-semibold text-gray-800">USDC</span>
            </div>
            {link.conditions && link.conditions.length > 0 && (
              <div className="flex items-center gap-2 py-3 text-xs text-emerald-600">
                <Shield size={12} />
                <span className="font-medium">Protected by smart escrow</span>
              </div>
            )}
          </div>

          {/* Wallet / Pay */}
          <AnimatePresence mode="wait">
            {!wallet.connected ? (
              <motion.div key="wallet-select" {...fadeUp}>
                <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Select Wallet
                </p>
                <div className="space-y-2">
                  {wallet.wallets.filter(w => w.readyState === "Installed" || w.readyState === "Loadable").length > 0 ? (
                    wallet.wallets
                      .filter(w => w.readyState === "Installed" || w.readyState === "Loadable")
                      .slice(0, 4)
                      .map((w) => (
                        <motion.button
                          key={w.adapter.name}
                          onClick={() => {
                            wallet.select(w.adapter.name);
                            setTimeout(() => wallet.connect().catch(() => {}), 100);
                          }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.adapter.icon} alt="" className="h-9 w-9 rounded-lg" />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-900">{w.adapter.name}</p>
                            <p className="text-xs text-gray-400">
                              {w.readyState === "Installed" ? "Detected" : "Available"}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300" />
                        </motion.button>
                      ))
                  ) : (
                    <button
                      onClick={() => walletModal.setVisible(true)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                        <Wallet size={18} className="text-gray-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900">Connect Wallet</p>
                        <p className="text-xs text-gray-400">Phantom, Solflare, or other</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  )}

                  {wallet.wallets.filter(w => w.readyState === "Installed" || w.readyState === "Loadable").length > 0 && (
                    <button
                      onClick={() => walletModal.setVisible(true)}
                      className="w-full py-2 text-center text-xs font-medium text-gray-400 transition hover:text-gray-600"
                    >
                      More wallets...
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="pay-section" {...fadeUp}>
                {/* Connected wallet */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      {wallet.wallet?.adapter.name} &middot; {truncateAddress(wallet.publicKey!.toBase58())}
                    </span>
                  </div>
                  <button
                    onClick={() => wallet.disconnect()}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    Change
                  </button>
                </div>

                {/* Pay Button */}
                <motion.button
                  onClick={handlePay}
                  disabled={step === "paying" || (!amountUsdc && (!customAmount || Number(customAmount) <= 0))}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-shadow hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {step === "paying" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Approve in wallet...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock size={15} />
                      Pay {displayAmount ? `$${displayAmount}` : customAmount ? `$${Number(customAmount).toFixed(2)}` : ""} USDC
                    </span>
                  )}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security footer */}
          <div className="mt-6 flex items-center justify-center gap-5 border-t border-gray-100 pt-4">
            {[
              { icon: Shield, label: "Encrypted" },
              { icon: Zap, label: "Instant" },
              { icon: Lock, label: "Non-custodial" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                <Icon size={10} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-300">
            Powered by <span className="font-semibold text-gray-400">Umon</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
