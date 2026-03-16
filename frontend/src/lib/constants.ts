import { getAddress } from "viem";

// Normalize env address to EIP-55 checksum so viem/wagmi accept it (avoids "Address must match checksum" errors).
function toChecksumAddress(addr: string | undefined): `0x${string}` | undefined {
  if (!addr || typeof addr !== "string") return undefined;
  try {
    return getAddress(addr) as `0x${string}`;
  } catch {
    return undefined;
  }
}

// Next.js only inlines env vars that are statically referenced. Dynamic keys like
// process.env[`NEXT_PUBLIC_HOOK_ADDRESS_${id}`] are not inlined, so per-chain vars
// would be undefined in the client. Reference them explicitly so they are bundled.
const HOOK_84532 = process.env.NEXT_PUBLIC_HOOK_ADDRESS_84532;
const HOOK_1301 = process.env.NEXT_PUBLIC_HOOK_ADDRESS_1301;
const REGISTRY_84532 = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_84532;
const REGISTRY_1301 = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS_1301;
const POLICY_84532 = process.env.NEXT_PUBLIC_POLICY_ADDRESS_84532;
const POLICY_1301 = process.env.NEXT_PUBLIC_POLICY_ADDRESS_1301;
const GOVERNANCE_84532 = process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS_84532;
const GOVERNANCE_1301 = process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS_1301;

// Contract addresses; populate after deployment. Per-chain: NEXT_PUBLIC_*_<chainId> (e.g. _84532, _1301).
export const CONTRACTS = {
  get VECTOR_HOOK() {
    return toChecksumAddress(process.env.NEXT_PUBLIC_HOOK_ADDRESS);
  },
  get RISK_REGISTRY() {
    return toChecksumAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS);
  },
  get POLICY_ENGINE() {
    return toChecksumAddress(process.env.NEXT_PUBLIC_POLICY_ADDRESS);
  },
  get GOVERNANCE() {
    return toChecksumAddress(process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS);
  },
};

export function getContracts(chainId: number): {
  VECTOR_HOOK: `0x${string}` | undefined;
  RISK_REGISTRY: `0x${string}` | undefined;
  POLICY_ENGINE: `0x${string}` | undefined;
  GOVERNANCE: `0x${string}` | undefined;
} {
  const hook =
    chainId === 84532 ? HOOK_84532 : chainId === 1301 ? HOOK_1301 : process.env.NEXT_PUBLIC_HOOK_ADDRESS;
  const registry =
    chainId === 84532 ? REGISTRY_84532 : chainId === 1301 ? REGISTRY_1301 : process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
  const policy =
    chainId === 84532 ? POLICY_84532 : chainId === 1301 ? POLICY_1301 : process.env.NEXT_PUBLIC_POLICY_ADDRESS;
  const governance =
    chainId === 84532 ? GOVERNANCE_84532 : chainId === 1301 ? GOVERNANCE_1301 : process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS;
  return {
    VECTOR_HOOK: toChecksumAddress(hook),
    RISK_REGISTRY: toChecksumAddress(registry),
    POLICY_ENGINE: toChecksumAddress(policy),
    GOVERNANCE: toChecksumAddress(governance),
  };
}

// Static refs so Next inlines these env vars (see comment above).
const SUBGRAPH_84532 = process.env.NEXT_PUBLIC_SUBGRAPH_URL_84532;
const SUBGRAPH_1301 = process.env.NEXT_PUBLIC_SUBGRAPH_URL_1301;

export const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

/** Subgraph query URL for the given chain. Use for dashboard/stats per chain. */
export function getSubgraphUrl(chainId: number): string {
  const url = chainId === 84532 ? SUBGRAPH_84532 : chainId === 1301 ? SUBGRAPH_1301 : undefined;
  return url ?? process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";
}

// Chain config (inlined from shared package)
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  UNICHAIN_SEPOLIA: 1301,
  LOCALHARDHAT: 31337,
} as const;

export type SupportedChainId =
  | typeof CHAIN_IDS.BASE_SEPOLIA
  | typeof CHAIN_IDS.UNICHAIN_SEPOLIA;

export const CHAIN_METADATA: Record<SupportedChainId, {
  id: SupportedChainId;
  name: string;
  currency: string;
  rpcUrl: string;
  explorerUrl: string;
}> = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    id: CHAIN_IDS.BASE_SEPOLIA,
    name: "Base Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
  },
  [CHAIN_IDS.UNICHAIN_SEPOLIA]: {
    id: CHAIN_IDS.UNICHAIN_SEPOLIA,
    name: "Unichain Sepolia",
    currency: "ETH",
    rpcUrl: "https://sepolia.unichain.org",
    explorerUrl: "https://sepolia.uniscan.xyz",
  },
};

export function getChainName(chainId: number | undefined | null): string | null {
  if (!chainId) return null;
  const meta = CHAIN_METADATA[chainId as SupportedChainId];
  return meta?.name ?? `Chain ${chainId}`;
}

export function getTxExplorerUrl(txHash: string, chainId: number | undefined | null): string | null {
  if (!txHash || !chainId) return null;
  const base = CHAIN_METADATA[chainId as SupportedChainId]?.explorerUrl;
  return base ? `${base}/tx/${txHash}` : null;
}

export function getChainProfile(chainId: number) {
  const defaults = { blockThreshold: 70, warnThreshold: 31, attestationTTLSeconds: 300 };
  const profiles: Record<number, typeof defaults> = {
    [CHAIN_IDS.BASE_SEPOLIA]: defaults,
    [CHAIN_IDS.UNICHAIN_SEPOLIA]: defaults,
    [CHAIN_IDS.LOCALHARDHAT]: defaults,
  };
  return profiles[chainId] ?? defaults;
}

export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: CHAIN_IDS.BASE_SEPOLIA,
  UNICHAIN_SEPOLIA: CHAIN_IDS.UNICHAIN_SEPOLIA,
} as const;
