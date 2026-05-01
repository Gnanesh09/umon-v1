import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  HELIUS_API_KEY: z.string().optional().default(""),
  PROGRAM_ID: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().optional().default(""),
  PORT: z.coerce.number().default(3001),
  CHAINLINK_WEATHER_FEED: z.string().optional().default(""),
  PYTH_PRICE_FEED: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  AUTHORITY_KEYPAIR: z.string().optional().default(""),
  TREASURY_WALLET: z.string().optional().default(""),
  FEE_PERCENTAGE: z.coerce.number().optional().default(0.5),
  FEE_MIN_USDC: z.coerce.number().optional().default(10000),
});

export const env = envSchema.parse(process.env);
