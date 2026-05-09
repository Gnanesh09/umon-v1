#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.POWERMONEY_API_URL || "http://localhost:3001/api/v1";
const AGENT_TOKEN = process.env.POWERMONEY_AGENT_TOKEN || "";

async function apiCall(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_TOKEN}`,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as { success: boolean; data?: unknown; error?: { message?: string } };
  if (!json.success) {
    throw new Error(json.error?.message ?? `API error: ${res.status}`);
  }
  return json.data;
}

const server = new McpServer({
  name: "powermoney",
  version: "1.0.0",
});

// ─── Tools ──────────────────────────────────────────────────────────

server.tool(
  "check_balance",
  "Check the agent wallet's current USDC and SOL balance, spending limits, and remaining budget",
  {},
  async () => {
    const data = await apiCall("GET", "/agent-wallets/agent/balance");
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "pay",
  "Send USDC from the agent wallet to a recipient. Amount is in micro-USDC (1 USDC = 1,000,000). The payment is validated against spending guardrails before execution.",
  {
    toWallet: z.string().describe("Solana wallet address of the recipient"),
    amountUsdc: z.number().int().positive().describe("Amount in micro-USDC (1 USDC = 1,000,000). Example: 5000000 = $5.00"),
    memo: z.string().optional().describe("Optional memo describing the purpose of the payment"),
  },
  async ({ toWallet, amountUsdc, memo }) => {
    try {
      const data = await apiCall("POST", "/agent-wallets/agent/pay", {
        toWallet,
        amountUsdc,
        memo,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "list_transactions",
  "List recent transactions made by this agent wallet, including payment amounts, recipients, tx signatures, and statuses",
  {
    limit: z.number().int().min(1).max(100).optional().describe("Number of transactions to return (default: 20)"),
  },
  async ({ limit }) => {
    const params = limit ? `?limit=${limit}` : "";
    const data = await apiCall("GET", `/agent-wallets/agent/transactions${params}`);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "format_usdc",
  "Convert between human-readable USDC amounts and micro-USDC (lamports). Use this to prepare amounts for the pay tool.",
  {
    amount: z.number().positive().describe("Amount to convert"),
    direction: z.enum(["to_micro", "to_human"]).describe("'to_micro' converts $5.00 to 5000000, 'to_human' converts 5000000 to $5.00"),
  },
  async ({ amount, direction }) => {
    const result =
      direction === "to_micro"
        ? { human: amount, microUsdc: Math.round(amount * 1_000_000) }
        : { human: amount / 1_000_000, microUsdc: amount };
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

// ─── Start ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!AGENT_TOKEN) {
    console.error(
      "Error: POWERMONEY_AGENT_TOKEN environment variable is required.\n" +
        "Get it from the PowerMoney merchant portal: Merchant > AI Agents > Create Agent > API Token",
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
