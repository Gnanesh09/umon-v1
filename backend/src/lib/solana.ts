import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { env } from "../config/env.js";

const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
const throwaway = Keypair.generate();

export const anchorProvider = new AnchorProvider(
  connection,
  {
    publicKey: throwaway.publicKey,
    signAllTransactions: async (txs) => txs,
    signTransaction: async (tx) => tx,
  },
  { commitment: "confirmed" },
);

export const programId = new PublicKey(env.PROGRAM_ID);

export function createProgram<T extends Idl>(idl: T): Program<T> {
  return new Program(idl, anchorProvider);
}

export { connection };