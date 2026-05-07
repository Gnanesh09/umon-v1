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
  ArrowLeft,
  CircleDollarSign,
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

function TimerBadge({ ms }: { ms: number }): ReactNode {
  const urgent = ms < 60_000;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
      urgent
        ? "animate-pulse bg-red-500/20 text-red-300"
        : "bg-white/15 text-white/90"
    }`}>
      <Clock size={12} />
      {formatTime(ms)}
    </div>
  );
}

// PhonePe-style full-screen success
function SuccessScreen({
  amount,
  recipient,
  txSignature,
}: {
  amount: string;
  recipient: string;
  txSignature: string | null;
}): ReactNode {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowDetails(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-500">
      {/* Animated circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-emerald-400/20" style={{ animationDuration: "2s" }} />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-emerald-400/20" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center text-white">
        {/* Checkmark animation */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl shadow-emerald-700/30">
          <svg className="h-14 w-14 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" className="animate-[draw_0.5s_ease-in-out_0.3s_forwards]" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "draw 0.5s ease-in-out 0.3s forwards" }} />
          </svg>
        </div>

        <p className="mb-2 text-lg font-medium text-emerald-100">Payment Successful</p>
        <p className="text-5xl font-bold">${amount}</p>
        <p className="mt-1 text-emerald-200">USDC</p>

        <div className={`mt-8 transition-all duration-500 ${showDetails ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-4">
            <p className="text-sm text-emerald-100">
              Paid to <span className="font-mono font-medium text-white">{truncateAddress(recipient)}</span>
            </p>
            {txSignature && (
              <a
                href={explorerTxUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
              >
                <ExternalLink size={14} />
                View on Solana Explorer
              </a>
            )}
          </div>

          <p className="mt-6 text-xs text-emerald-200/70">
            Powered by <span className="font-semibold text-emerald-100">Umon</span> &middot; Programmable Payments on Solana
          </p>
        </div>
      </div>

      <style>{`
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
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

  // Only expire if countdown actually ran down (initialized and reached 0) and we're in a cancellable state
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

    // Create session
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

    // Build SPL transfer tx
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
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <XCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h1 className="text-xl font-bold text-gray-900">Payment Link Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">This link may have expired or been deactivated.</p>
      </div>
    );
  }

  // ── LOADING ──
  if (step === "loading" || linkQuery.isLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="h-20 animate-pulse bg-gradient-to-r from-gray-200 to-gray-300" />
          <div className="space-y-4 p-6">
            <div className="mx-auto h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
            <div className="mx-auto h-12 w-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
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

  // ── COMPLETED (PhonePe-style fullscreen green) ──
  if (step === "completed") {
    return (
      <SuccessScreen
        amount={displayAmount ?? formatUsdcRaw(session?.amount_usdc ?? 0)}
        recipient={link.recipientWallet}
        txSignature={session?.tx_signature ?? null}
      />
    );
  }

  // ── EXPIRED ──
  if (step === "expired") {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3 text-white">
            <Clock size={24} />
            <div>
              <h1 className="text-lg font-bold">Session Expired</h1>
              <p className="text-sm text-amber-100">Your 5-minute window has ended</p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500">
            For your security, payment sessions expire after 5 minutes. No money was charged.
          </p>
          <button
            onClick={() => { setSession(null); payingRef.current = false; setStep("ready"); }}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:shadow-emerald-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── FAILED ──
  if (step === "failed") {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle size={24} />
            <div>
              <h1 className="text-lg font-bold">Payment Failed</h1>
              <p className="text-sm text-red-100">Transaction could not be completed</p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          {session?.error_message && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-left">
              <p className="text-xs text-red-600">{session.error_message}</p>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Don&apos;t worry — if any amount was deducted, it will be automatically refunded.
          </p>
          <button
            onClick={() => { setSession(null); payingRef.current = false; setStep("ready"); }}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:shadow-emerald-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── CONFIRMING ──
  if (step === "confirming") {
    return (
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
          <div className="flex items-center gap-3 text-white">
            <Loader2 size={24} className="animate-spin" />
            <div>
              <h1 className="text-lg font-bold">Confirming on Solana</h1>
              <p className="text-sm text-indigo-200">Usually takes a few seconds</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Progress bar animation */}
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-400 bg-[length:200%]" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-sm text-emerald-700">Transaction signed</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-sm text-emerald-700">Submitted to Solana</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-sm text-indigo-700">Waiting for confirmation...</span>
            </div>
          </div>

          {session?.tx_signature && (
            <a
              href={explorerTxUrl(session.tx_signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 text-sm text-indigo-600 transition hover:text-indigo-700"
            >
              <ExternalLink size={14} /> View on Explorer
            </a>
          )}
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ── READY — MAIN CHECKOUT UI (Razorpay-style) ──
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Dark Header with merchant info + timer */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-5">
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
          {/* Timer in top-right corner */}
          {session && countdownReady && countdown > 0 && (
            <TimerBadge ms={countdown} />
          )}
        </div>

        {/* Amount display */}
        <div className="mt-5">
          {displayAmount ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Amount</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">${displayAmount}</span>
                <span className="text-sm text-gray-400">USDC</span>
              </div>
              {feeAmount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Total: ${formatUsdcRaw(totalAmount)} (incl. ${formatUsdcRaw(feeAmount)} fee)
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Enter Amount</p>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                <CircleDollarSign size={20} className="text-emerald-400" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-gray-600"
                />
                <span className="text-sm font-medium text-gray-400">USDC</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Payment details */}
        <div className="mb-5 space-y-2 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Recipient</span>
            <span className="font-mono font-medium text-gray-700">{truncateAddress(link.recipientWallet)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Network</span>
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-violet-500" />
              <span className="font-medium text-gray-700">Solana</span>
              <span className="text-gray-400">(Devnet)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Currency</span>
            <span className="font-medium text-gray-700">USDC</span>
          </div>
          {link.conditions && link.conditions.length > 0 && (
            <div className="flex items-center gap-1.5 border-t border-gray-200 pt-2 text-xs text-emerald-600">
              <Shield size={11} />
              <span>Protected by smart escrow</span>
            </div>
          )}
        </div>

        {/* Wallet Connection / Pay */}
        {!wallet.connected ? (
          <div>
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
              Select Wallet
            </p>
            <div className="space-y-2">
              {/* Main wallet adapters as buttons */}
              {wallet.wallets.filter(w => w.readyState === "Installed" || w.readyState === "Loadable").length > 0 ? (
                wallet.wallets
                  .filter(w => w.readyState === "Installed" || w.readyState === "Loadable")
                  .slice(0, 4)
                  .map((w) => (
                    <button
                      key={w.adapter.name}
                      onClick={() => {
                        wallet.select(w.adapter.name);
                        setTimeout(() => wallet.connect().catch(() => {}), 100);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.adapter.icon} alt="" className="h-8 w-8 rounded-lg" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900">{w.adapter.name}</p>
                        <p className="text-xs text-gray-400">
                          {w.readyState === "Installed" ? "Detected" : "Available"}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </button>
                  ))
              ) : (
                <button
                  onClick={() => walletModal.setVisible(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                    <Wallet size={16} className="text-gray-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Connect Wallet</p>
                    <p className="text-xs text-gray-400">Phantom, Solflare, or other</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              )}

              {/* More wallets */}
              {wallet.wallets.filter(w => w.readyState === "Installed" || w.readyState === "Loadable").length > 0 && (
                <button
                  onClick={() => walletModal.setVisible(true)}
                  className="w-full text-center text-xs font-medium text-gray-400 transition hover:text-gray-600"
                >
                  More wallets...
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Connected wallet badge */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">
                  {wallet.wallet?.adapter.name} &middot; {truncateAddress(wallet.publicKey!.toBase58())}
                </span>
              </div>
              <button
                onClick={() => wallet.disconnect()}
                className="text-xs text-gray-400 transition hover:text-gray-600"
              >
                Change
              </button>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={step === "paying" || (!amountUsdc && (!customAmount || Number(customAmount) <= 0))}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition hover:shadow-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {step === "paying" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Approve in wallet...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock size={16} />
                  Pay {displayAmount ? `$${displayAmount}` : customAmount ? `$${Number(customAmount).toFixed(2)}` : ""} USDC
                </span>
              )}
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
        )}

        {/* Security footer */}
        <div className="mt-5 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Shield size={10} />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Zap size={10} />
            <span>Instant Settlement</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Lock size={10} />
            <span>Non-custodial</span>
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-[10px] text-gray-300">
            Powered by <span className="font-semibold text-gray-400">Umon</span>
          </p>
        </div>
      </div>
    </div>
  );
}
