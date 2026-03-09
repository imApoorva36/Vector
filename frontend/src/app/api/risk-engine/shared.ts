/**
 * Server-only risk engine wiring. Used by /api/health and /api/risk-score.
 * TEE_SIGNER_KEY and RPC_URL are env vars (no NEXT_PUBLIC_; server-only).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AttestationSigner = require("risk-engine/signer").AttestationSigner;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { size: cacheSize } = require("risk-engine/cache");

const TEE_SIGNER_KEY = (process.env.TEE_SIGNER_KEY || "").trim();
const RPC_URL = process.env.RPC_URL;

let signer: { address: string; sign: (params: Record<string, unknown>) => Promise<Record<string, unknown>> } | null = null;
let defaultProvider: unknown = null;

if (TEE_SIGNER_KEY) {
  try {
    signer = new AttestationSigner(TEE_SIGNER_KEY);
  } catch {
    signer = null;
  }
}

if (RPC_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ethers } = require("ethers");
    defaultProvider = new ethers.JsonRpcProvider(RPC_URL);
  } catch {
    defaultProvider = null;
  }
}

export function getSigner() {
  return signer;
}

export function getDefaultProvider() {
  return defaultProvider;
}

export function getCacheSize(): number {
  return cacheSize();
}
