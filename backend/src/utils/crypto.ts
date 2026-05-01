import { randomBytes } from "node:crypto";

export function generateNonce(): string {
  return randomBytes(24).toString("hex");
}