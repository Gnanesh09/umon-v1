#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.POWERMONEY_API_URL || "http://localhost:3001/api/v1";
const AGENT_TOKEN = process.env.POWERMONEY_AGENT_TOKEN || "";

// ─── API client ────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${API_BASE}/agent-wallets/agent${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_TOKEN}`,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as {
    success: boolean;
    data?: unknown;
    error?: { message?: string; code?: string };
  };

  if (!json.success) {
    throw new Error(json.error?.message ?? `API error ${res.status}`);
  }
  return json.data;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  return {
    content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
    isError: true,
  };
}

// ─── Server ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "powermoney",
  version: "2.0.0",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE WALLET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "check_balance",
  "Check the agent wallet's USDC and SOL balance, spending limits, and remaining daily budget",
  {},
  async () => {
    try { return ok(await api("GET", "/balance")); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "wallet_info",
  "Get full agent wallet details: name, public key, status, balance, spending limits, allowed categories/recipients, and creation date",
  {},
  async () => {
    try { return ok(await api("GET", "/info")); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "format_usdc",
  "Convert between human-readable USDC and micro-USDC. Use 'to_micro' to prepare amounts for payment tools, 'to_human' to display amounts.",
  {
    amount: z.number().positive().describe("Amount to convert"),
    direction: z.enum(["to_micro", "to_human"]).describe("'to_micro': $5.00 → 5000000. 'to_human': 5000000 → $5.00"),
  },
  async ({ amount, direction }) => {
    const result = direction === "to_micro"
      ? { human: amount, microUsdc: Math.round(amount * 1_000_000) }
      : { human: amount / 1_000_000, microUsdc: amount };
    return ok(result);
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PAYMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "pay",
  "Send USDC from the agent wallet to a Solana address. Amount is in micro-USDC (1 USDC = 1,000,000). Validated against spending guardrails (daily limits, per-tx limits, allowed recipients) before execution.",
  {
    toWallet: z.string().describe("Recipient's Solana wallet address"),
    amountUsdc: z.number().int().positive().describe("Amount in micro-USDC. Example: 5000000 = $5.00"),
    memo: z.string().optional().describe("Purpose of this payment (shown in transaction history)"),
  },
  async ({ toWallet, amountUsdc, memo }) => {
    try { return ok(await api("POST", "/pay", { toWallet, amountUsdc, memo })); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "batch_pay",
  "Send USDC to multiple recipients in a single call. Each payment is validated against guardrails independently. Max 10 payments per batch. Returns per-payment results with success/failure status.",
  {
    payments: z.array(z.object({
      toWallet: z.string().describe("Recipient's Solana wallet address"),
      amountUsdc: z.number().int().positive().describe("Amount in micro-USDC"),
      memo: z.string().optional().describe("Purpose of this payment"),
    })).min(1).max(10).describe("Array of payments to execute"),
  },
  async ({ payments }) => {
    try { return ok(await api("POST", "/batch-pay", { payments })); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "schedule_payment",
  "Schedule a USDC payment for future execution. The payment will be validated and executed at the specified time. Use ISO 8601 datetime for executeAt.",
  {
    toWallet: z.string().describe("Recipient's Solana wallet address"),
    amountUsdc: z.number().int().positive().describe("Amount in micro-USDC"),
    memo: z.string().optional().describe("Purpose of this payment"),
    executeAt: z.string().describe("When to execute (ISO 8601). Example: '2025-06-01T12:00:00Z'"),
  },
  async ({ toWallet, amountUsdc, memo, executeAt }) => {
    try { return ok(await api("POST", "/schedule", { toWallet, amountUsdc, memo, executeAt })); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "list_scheduled_payments",
  "List all pending/scheduled payments that haven't been executed yet",
  {},
  async () => {
    try { return ok(await api("GET", "/scheduled")); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "cancel_scheduled_payment",
  "Cancel a scheduled payment before it executes",
  {
    transactionId: z.string().describe("UUID of the scheduled transaction to cancel"),
  },
  async ({ transactionId }) => {
    try { return ok(await api("DELETE", `/scheduled/${transactionId}`)); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VAULTS (ESCROW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "create_vault",
  "Create a conditional escrow vault. Lock USDC with programmable release conditions: time_lock (auto-release at a date), milestone (release on approval), oracle (release when price condition met), auto_split (split between recipients), category (restrict to merchant categories). This is Umon's killer feature — programmable money.",
  {
    recipientWallet: z.string().describe("Solana wallet that will receive the funds when conditions are met"),
    amountUsdc: z.number().int().positive().describe("Amount to lock in micro-USDC"),
    description: z.string().optional().describe("What this vault is for"),
    conditions: z.array(z.object({
      type: z.enum(["time_lock", "milestone", "oracle", "auto_split", "category"]).describe("Condition type"),
      releaseTime: z.string().optional().describe("For time_lock: ISO 8601 release date/time (e.g. '2025-06-15T12:00:00Z')"),
      description: z.string().optional().describe("For milestone: what needs to be accomplished"),
      approvers: z.array(z.string()).optional().describe("For milestone: Solana wallet addresses of required approvers"),
      feed: z.string().optional().describe("For oracle: Pyth price feed account address"),
      operator: z.enum(["lt", "gt", "eq", "lte", "gte"]).optional().describe("For oracle: comparison operator"),
      threshold: z.number().optional().describe("For oracle: price threshold value"),
      splits: z.array(z.object({
        wallet: z.string(),
        percentage: z.number(),
      })).optional().describe("For auto_split: recipient wallets and percentages"),
      categories: z.array(z.string()).optional().describe("For category: allowed merchant categories"),
      percentage: z.number().optional().describe("Percentage of vault to release for this condition"),
    })).optional().describe("Release conditions. Omit for immediate-release vault"),
  },
  async ({ recipientWallet, amountUsdc, description, conditions }) => {
    try { return ok(await api("POST", "/vaults", { recipientWallet, amountUsdc, description, conditions })); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "list_vaults",
  "List vaults created by or received by this agent wallet. Filter by role (creator/recipient) and status.",
  {
    role: z.enum(["creator", "recipient"]).optional().describe("Filter by agent's role in the vault (default: creator)"),
    status: z.enum(["active", "released", "partially_released", "cancelled", "disputed"]).optional().describe("Filter by vault status"),
    limit: z.number().int().min(1).max(100).optional().describe("Number of vaults to return (default: 20)"),
  },
  async ({ role, status, limit }) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    try { return ok(await api("GET", `/vaults${qs ? `?${qs}` : ""}`)); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "get_vault",
  "Get detailed information about a specific vault including its conditions, release status, and transaction history",
  {
    vaultId: z.string().describe("UUID of the vault"),
  },
  async ({ vaultId }) => {
    try { return ok(await api("GET", `/vaults/${vaultId}`)); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PAYMENT LINKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "create_payment_link",
  "Generate a shareable payment link that anyone can pay. Supports fixed or open amounts, usage limits, and expiry. Returns a URL like https://app.umon.com/pay/abc123 that can be shared with payers.",
  {
    title: z.string().describe("Title shown to the payer (e.g., 'Monthly subscription', 'API usage fee')"),
    description: z.string().optional().describe("Description shown on the payment page"),
    amountUsdc: z.number().int().positive().optional().describe("Fixed amount in micro-USDC. Omit for open-amount links"),
    recipientWallet: z.string().optional().describe("Recipient wallet. Defaults to this agent's wallet"),
    maxUses: z.number().int().positive().optional().describe("Maximum number of times this link can be used"),
    expiresAt: z.string().optional().describe("When the link expires (ISO 8601)"),
  },
  async ({ title, description, amountUsdc, recipientWallet, maxUses, expiresAt }) => {
    try {
      return ok(await api("POST", "/payment-links", {
        title, description, amountUsdc, recipientWallet, maxUses, expiresAt,
      }));
    } catch (e) { return fail(e); }
  },
);

server.tool(
  "list_payment_links",
  "List all payment links created by this agent, with their URLs and usage stats",
  {
    limit: z.number().int().min(1).max(100).optional().describe("Number of links to return (default: 20)"),
  },
  async ({ limit }) => {
    const qs = limit ? `?limit=${limit}` : "";
    try { return ok(await api("GET", `/payment-links${qs}`)); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "deactivate_payment_link",
  "Deactivate a payment link so it can no longer receive payments",
  {
    linkId: z.string().describe("UUID of the payment link to deactivate"),
  },
  async ({ linkId }) => {
    try { return ok(await api("DELETE", `/payment-links/${linkId}`)); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "pay_link",
  "Pay an existing payment link using this agent's wallet. Use when the agent needs to pay someone else's payment link (e.g., paying for an API service, subscription, or invoice).",
  {
    shortCode: z.string().describe("The short code from the payment link URL (e.g., 'abc123' from /pay/abc123)"),
    amountUsdc: z.number().int().positive().optional().describe("Amount in micro-USDC. Required for open-amount links, ignored for fixed-amount links"),
  },
  async ({ shortCode, amountUsdc }) => {
    try { return ok(await api("POST", "/pay-link", { shortCode, amountUsdc })); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INVOICES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "create_invoice",
  "Create a professional invoice with line items. Automatically generates a payment link. The invoice can be sent to customers for payment.",
  {
    lineItems: z.array(z.object({
      description: z.string().describe("Item/service description"),
      quantity: z.number().positive().describe("Quantity"),
      unitPrice: z.number().int().positive().describe("Price per unit in micro-USDC"),
    })).min(1).max(50).describe("Invoice line items"),
    customerInfo: z.object({
      name: z.string().optional().describe("Customer name"),
      email: z.string().optional().describe("Customer email"),
      wallet: z.string().optional().describe("Customer's Solana wallet"),
    }).optional().describe("Customer details"),
    dueDate: z.string().optional().describe("Payment due date (ISO 8601)"),
    notes: z.string().optional().describe("Additional notes on the invoice"),
  },
  async ({ lineItems, customerInfo, dueDate, notes }) => {
    try { return ok(await api("POST", "/invoices", { lineItems, customerInfo, dueDate, notes })); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "list_invoices",
  "List invoices created by this agent wallet",
  {
    limit: z.number().int().min(1).max(100).optional().describe("Number of invoices to return (default: 20)"),
  },
  async ({ limit }) => {
    const qs = limit ? `?limit=${limit}` : "";
    try { return ok(await api("GET", `/invoices${qs}`)); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DISCOVERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "discover_merchants",
  "Search the Umon merchant registry to find businesses that accept USDC payments. Filter by category (e.g., 'food', 'saas', 'compute', 'ai') or search by name.",
  {
    category: z.string().optional().describe("Filter by merchant category"),
    search: z.string().optional().describe("Search merchants by business name"),
    limit: z.number().int().min(1).max(50).optional().describe("Number of results (default: 20)"),
  },
  async ({ category, search, limit }) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    try { return ok(await api("GET", `/discover-merchants${qs ? `?${qs}` : ""}`)); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ANALYTICS & HISTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
  "list_transactions",
  "List recent transactions made by this agent wallet. Shows payment amounts, recipients, tx signatures, statuses, and guardrail check results.",
  {
    limit: z.number().int().min(1).max(100).optional().describe("Number of transactions to return (default: 20)"),
  },
  async ({ limit }) => {
    const qs = limit ? `?limit=${limit}` : "";
    try { return ok(await api("GET", `/transactions${qs}`)); }
    catch (e) { return fail(e); }
  },
);

server.tool(
  "spending_analytics",
  "Get a comprehensive spending report: total spent, transaction counts, success/failure rates, top recipients, daily breakdown, and remaining budget. Useful for budget tracking and financial reporting.",
  {
    days: z.number().int().min(1).max(365).optional().describe("Number of days to analyze (default: 30)"),
  },
  async ({ days }) => {
    const qs = days ? `?days=${days}` : "";
    try { return ok(await api("GET", `/analytics${qs}`)); }
    catch (e) { return fail(e); }
  },
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  START
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main(): Promise<void> {
  if (!AGENT_TOKEN) {
    console.error(
      "Error: POWERMONEY_AGENT_TOKEN environment variable is required.\n" +
        "Get it from the Umon merchant portal: Merchant > AI Agents > Create Agent > API Token",
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
