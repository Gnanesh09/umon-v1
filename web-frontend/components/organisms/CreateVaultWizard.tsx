"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { ORACLE_FEEDS, MERCHANT_CATEGORIES, explorerTxUrl, calculateFee } from "@/lib/constants";

const conditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("time_lock"),
    releaseTime: z.string().min(1, "Required"),
    percentage: z.coerce.number().min(1).max(100),
  }),
  z.object({
    type: z.literal("milestone"),
    description: z.string().min(1, "Required"),
    approvers: z.array(z.string().min(32, "Invalid address")).min(1, "At least 1 approver"),
    percentage: z.coerce.number().min(1).max(100),
  }),
  z.object({
    type: z.literal("auto_split"),
    splits: z
      .array(z.object({ wallet: z.string().min(32, "Invalid address"), percentage: z.coerce.number().min(1).max(100) }))
      .min(2, "At least 2 recipients"),
  }),
  z.object({
    type: z.literal("oracle"),
    feed: z.string().min(1, "Required"),
    operator: z.enum(["lt", "gt", "eq", "lte", "gte"]),
    threshold: z.coerce.number(),
    percentage: z.coerce.number().min(1).max(100),
  }),
  z.object({
    type: z.literal("category"),
    merchantRegistry: z.string().min(32, "Invalid address"),
    categories: z.array(z.string()).min(1, "At least 1 category"),
    percentage: z.coerce.number().min(1).max(100),
  }),
]);

const formSchema = z.object({
  description: z.string().min(1, "Required"),
  recipientWallet: z.string().min(32, "Invalid wallet address"),
  amountUsdc: z.coerce.number().positive("Must be > 0"),
  conditions: z.array(conditionSchema).min(1, "At least 1 condition"),
});

type FormData = z.infer<typeof formSchema>;

export type CreateVaultSubmitData = FormData;

const CONDITION_TYPES = [
  { type: "time_lock" as const, label: "Time Lock", icon: Clock, desc: "Release funds at a specific date and time" },
  { type: "milestone" as const, label: "Milestone", icon: CheckCircle2, desc: "Require approvals before releasing" },
  { type: "auto_split" as const, label: "Auto Split", icon: Split, desc: "Split funds across multiple recipients" },
  { type: "oracle" as const, label: "Oracle Trigger", icon: Zap, desc: "Release when a price condition is met" },
  { type: "category" as const, label: "Category Restrict", icon: ShoppingBag, desc: "Restrict spending to categories" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "gt", label: "Greater than (>)" },
  { value: "lt", label: "Less than (<)" },
  { value: "gte", label: "Greater or equal (>=)" },
  { value: "lte", label: "Less or equal (<=)" },
  { value: "eq", label: "Equal (=)" },
];

const FEED_OPTIONS = Object.entries(ORACLE_FEEDS).map(([value, { label }]) => ({ value: ORACLE_FEEDS[value].address, label }));

type Props = {
  onSubmit: (data: FormData) => Promise<{ txSignature: string; vaultAddress: string }>;
};

export function CreateVaultWizard({ onSubmit }: Props): ReactNode {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [txResult, setTxResult] = useState<{ txSignature: string; vaultAddress: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    getValues,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { conditions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });

  const amount = watch("amountUsdc") || 0;
  const conditions = watch("conditions") || [];

  function computePercentageUsed(conds: FormData["conditions"]): number {
    return conds.reduce((sum, c) => {
      if (c.type === "auto_split") return sum + 100;
      if ("percentage" in c) return sum + (Number(c.percentage) || 0);
      return sum;
    }, 0);
  }

  const percentageUsed = computePercentageUsed(conditions);
  const percentageRemaining = 100 - percentageUsed;

  const addCondition = useCallback(
    (type: FormData["conditions"][number]["type"]) => {
      const remaining = 100 - computePercentageUsed(getValues("conditions") || []);
      const defaultPct = Math.max(Math.min(remaining, 100), 0);
      switch (type) {
        case "time_lock":
          append({ type: "time_lock", releaseTime: "", percentage: defaultPct });
          break;
        case "milestone":
          append({ type: "milestone", description: "", approvers: [""], percentage: defaultPct });
          break;
        case "auto_split":
          append({
            type: "auto_split",
            splits: [
              { wallet: "", percentage: 50 },
              { wallet: "", percentage: 50 },
            ],
          });
          break;
        case "oracle":
          append({
            type: "oracle",
            feed: FEED_OPTIONS[0]?.value ?? "",
            operator: "gt",
            threshold: 0,
            percentage: defaultPct,
          });
          break;
        case "category":
          append({
            type: "category",
            merchantRegistry: "",
            categories: ["Medical"],
            percentage: defaultPct,
          });
          break;
      }
    },
    [append, getValues],
  );

  async function goToStep2(): Promise<void> {
    const ok = await trigger(["description", "recipientWallet", "amountUsdc"]);
    if (!ok) return;
    setStep(2);
  }

  async function goToStep3(): Promise<void> {
    const ok = await trigger("conditions");
    if (!ok) {
      toast.error("Fix condition errors before continuing");
      return;
    }
    const currentConditions = getValues("conditions");
    if (!currentConditions || currentConditions.length === 0) {
      toast.error("Add at least one condition");
      return;
    }
    const hasAutoSplit = currentConditions.some((c) => c.type === "auto_split");
    const currentTotal = computePercentageUsed(currentConditions);
    if (!hasAutoSplit && currentTotal !== 100) {
      toast.error(`Percentages must sum to 100% (currently ${currentTotal}%)`);
      return;
    }
    setStep(3);
  }

  const submitting = useRef(false);
  const submit = handleSubmit(async (data) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const result = await onSubmit(data);
      setTxResult(result);
      setStep(4);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                s <= step
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-3)] text-[var(--text-faint)]"
              }`}
            >
              {s}
            </div>
            {s < 4 ? (
              <div
                className={`h-0.5 flex-1 rounded transition ${
                  s < step ? "bg-[var(--primary)]" : "bg-[var(--surface-3)]"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Basic Info</h2>
            <div className="grid gap-4">
              <Input label="Payment Description" placeholder="e.g., Q4 contractor payment" {...register("description")} error={errors.description?.message} />
              <Input label="Recipient Wallet Address" placeholder="Solana wallet address" {...register("recipientWallet")} error={errors.recipientWallet?.message} />
              <div>
                <Input label="USDC Amount" type="number" step="0.01" placeholder="1000.00" {...register("amountUsdc")} error={errors.amountUsdc?.message} />
                {amount > 0 ? <p className="mt-1 text-xs text-[var(--text-muted)]">~${amount.toLocaleString()} USD</p> : null}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void goToStep2()}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Add Conditions</h2>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-24 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentageUsed === 100 ? "bg-[var(--success)]" : percentageUsed > 100 ? "bg-[var(--error)]" : "bg-[var(--primary)]"
                      }`}
                      style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${percentageUsed === 100 ? "text-[var(--success)]" : percentageUsed > 100 ? "text-[var(--error)]" : "text-[var(--text-muted)]"}`}>
                    {percentageUsed}%
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CONDITION_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  const disabled = conditions.length >= 5 || (ct.type === "auto_split" && conditions.some((c) => c.type === "auto_split"));
                  return (
                    <button
                      key={ct.type}
                      type="button"
                      disabled={disabled}
                      onClick={() => addCondition(ct.type)}
                      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-left transition hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:bg-transparent"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                      <div>
                        <p className="text-sm font-medium">{ct.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{ct.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {fields.map((field, index) => {
              const condition = conditions[index];
              if (!condition) return null;
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize">{condition.type.replace(/_/g, " ")}</span>
                    <button type="button" onClick={() => remove(index)} className="text-[var(--text-muted)] transition hover:text-[var(--error)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {condition.type === "time_lock" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Release Date & Time" type="datetime-local" {...register(`conditions.${index}.releaseTime` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.releaseTime?.message} />
                      <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.percentage?.message} />
                    </div>
                  ) : null}

                  {condition.type === "milestone" ? (
                    <div className="grid gap-3">
                      <Input label="Milestone Description" placeholder="e.g., Complete phase 1 delivery" {...register(`conditions.${index}.description` as const)} error={(errors.conditions?.[index] as Record<string, { message?: string }> | undefined)?.description?.message} />
                      <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                      <div>
                        <label className="mb-1.5 block text-sm text-[var(--text-muted)]">Approver Wallets</label>
                        {(condition.approvers ?? [""]).map((_, aIdx) => (
                          <div key={aIdx} className="mb-2 flex gap-2">
                            <Input
                              placeholder="Approver wallet address"
                              className="flex-1"
                              {...register(`conditions.${index}.approvers.${aIdx}` as const)}
                            />
                            {(condition.approvers?.length ?? 0) > 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const current = [...(condition.approvers ?? [])];
                                  current.splice(aIdx, 1);
                                  setValue(`conditions.${index}.approvers`, current);
                                }}
                                className="text-[var(--text-muted)] hover:text-[var(--error)]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {(condition.approvers?.length ?? 0) < 3 ? (
                          <button
                            type="button"
                            onClick={() => setValue(`conditions.${index}.approvers`, [...(condition.approvers ?? []), ""])}
                            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                          >
                            <Plus className="h-3 w-3" /> Add approver
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {condition.type === "auto_split" ? (
                    <div>
                      <label className="mb-2 block text-sm text-[var(--text-muted)]">Split Recipients</label>
                      {(condition.splits ?? []).map((_, sIdx) => (
                        <div key={sIdx} className="mb-2 flex gap-2">
                          <Input placeholder="Wallet address" className="flex-1" {...register(`conditions.${index}.splits.${sIdx}.wallet` as const)} />
                          <Input type="number" placeholder="%" className="w-20" min={1} max={100} {...register(`conditions.${index}.splits.${sIdx}.percentage` as const)} />
                          {(condition.splits?.length ?? 0) > 2 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(condition.splits ?? [])];
                                current.splice(sIdx, 1);
                                setValue(`conditions.${index}.splits`, current);
                              }}
                              className="text-[var(--text-muted)] hover:text-[var(--error)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        {(condition.splits?.length ?? 0) < 10 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setValue(`conditions.${index}.splits`, [...(condition.splits ?? []), { wallet: "", percentage: 0 }])
                            }
                            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                          >
                            <Plus className="h-3 w-3" /> Add recipient
                          </button>
                        ) : <span />}
                        <span className="text-xs tabular-nums text-[var(--text-muted)]">
                          Sum: {(condition.splits ?? []).reduce((s, r) => s + Number(r.percentage || 0), 0)}%
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {condition.type === "oracle" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select label="Price Feed" options={FEED_OPTIONS} {...register(`conditions.${index}.feed` as const)} />
                      <Select label="Operator" options={OPERATOR_OPTIONS} {...register(`conditions.${index}.operator` as const)} />
                      <Input label="Threshold Value" type="number" step="0.01" {...register(`conditions.${index}.threshold` as const)} />
                      <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                    </div>
                  ) : null}

                  {condition.type === "category" ? (
                    <div className="grid gap-3">
                      <Input label="Merchant Registry Address" placeholder="Pubkey of on-chain registry" {...register(`conditions.${index}.merchantRegistry` as const)} />
                      <div>
                        <label className="mb-1.5 block text-sm text-[var(--text-muted)]">Allowed Categories</label>
                        <div className="flex flex-wrap gap-2">
                          {MERCHANT_CATEGORIES.map((cat) => {
                            const selected = (condition.categories ?? []).includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  const current = condition.categories ?? [];
                                  if (selected) {
                                    setValue(`conditions.${index}.categories`, current.filter((c) => c !== cat));
                                  } else {
                                    setValue(`conditions.${index}.categories`, [...current, cat]);
                                  }
                                }}
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  selected
                                    ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--text)]"
                                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Input label="Percentage (%)" type="number" min={1} max={100} {...register(`conditions.${index}.percentage` as const)} />
                    </div>
                  ) : null}
                </motion.div>
              );
            })}

            {conditions.length > 0 ? (
              <div className="card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16">
                    <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={percentageUsed === 100 ? "var(--success)" : "var(--primary)"}
                        strokeWidth="3"
                        strokeDasharray={`${percentageUsed} ${100 - percentageUsed}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
                      {percentageUsed}%
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{conditions.length} condition{conditions.length !== 1 ? "s" : ""}</p>
                    <p className="text-[var(--text-muted)]">{percentageRemaining > 0 ? `${percentageRemaining}% remaining` : "Fully allocated"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => void goToStep3()}>
                    Review <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              </div>
            )}
          </motion.div>
        ) : null}

        {step === 3 ? (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Review & Confirm</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Description</span>
                <span className="font-medium">{watch("description")}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Recipient</span>
                <span className="font-mono text-xs">{watch("recipientWallet")?.slice(0, 8)}...{watch("recipientWallet")?.slice(-4)}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Amount</span>
                <span className="font-semibold tabular-nums">{Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC</span>
              </div>
              {(() => {
                const amountNum = Number(amount) || 0;
                const amountLamports = Math.round(amountNum * 1_000_000);
                const feeLamports = calculateFee(amountLamports);
                const feeUsdc = feeLamports / 1_000_000;
                const totalUsdc = amountNum + feeUsdc;
                return (
                  <>
                    <div className="flex justify-between border-b border-[var(--border)] pb-2">
                      <span className="text-[var(--text-muted)]">Platform Fee (0.5%)</span>
                      <span className="tabular-nums text-[var(--text-muted)]">{feeUsdc.toFixed(4)} USDC</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[var(--primary-subtle)] px-3 py-2">
                      <span className="font-medium">Total Charged</span>
                      <span className="font-bold tabular-nums text-[var(--primary)]">{totalUsdc.toFixed(4)} USDC</span>
                    </div>
                  </>
                );
              })()}
              <div className="border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-muted)]">Conditions ({conditions.length})</span>
                <div className="mt-2 space-y-1">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-[var(--primary-subtle)] px-2 py-0.5 capitalize">{c.type.replace(/_/g, " ")}</span>
                      {"percentage" in c ? <span className="tabular-nums">{c.percentage}%</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button loading={loading} onClick={() => void submit()} className="flex-1">
                {loading ? "Signing transaction..." : "Create Vault"}
              </Button>
            </div>
          </motion.div>
        ) : null}

        {step === 4 ? (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card grid place-items-center gap-4 p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-subtle)]"
            >
              <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
            </motion.div>
            <h3 className="text-xl font-semibold">Vault Created Successfully</h3>
            {txResult ? (
              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <p>
                  Transaction:{" "}
                  <a
                    href={explorerTxUrl(txResult.txSignature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[var(--primary)] hover:underline"
                  >
                    {txResult.txSignature.slice(0, 12)}...{txResult.txSignature.slice(-6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
                <p className="font-mono text-xs">Vault: {txResult.vaultAddress}</p>
              </div>
            ) : null}
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => { setStep(1); setTxResult(null); }}>
                Create Another
              </Button>
              <a href="/dashboard/vaults" className="inline-flex h-10 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]">
                View Vaults
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
