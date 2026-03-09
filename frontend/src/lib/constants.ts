// Contract addresses; populate after deployment. Per-chain: NEXT_PUBLIC_*_<chainId> (e.g. _84532, _1301).
export const CONTRACTS = {
  VECTOR_HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS as `0x${string}` | undefined,
  RISK_REGISTRY: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined,
  POLICY_ENGINE: process.env.NEXT_PUBLIC_POLICY_ADDRESS as `0x${string}` | undefined,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS as `0x${string}` | undefined,
};

const chainIdSuffix = (id: number) => `_${id}` as const;

export function getContracts(chainId: number): typeof CONTRACTS {
  const s = chainIdSuffix(chainId);
  return {
    VECTOR_HOOK: (process.env[`NEXT_PUBLIC_HOOK_ADDRESS${s}`] ?? process.env.NEXT_PUBLIC_HOOK_ADDRESS) as `0x${string}` | undefined,
    RISK_REGISTRY: (process.env[`NEXT_PUBLIC_REGISTRY_ADDRESS${s}`] ?? process.env.NEXT_PUBLIC_REGISTRY_ADDRESS) as `0x${string}` | undefined,
    POLICY_ENGINE: (process.env[`NEXT_PUBLIC_POLICY_ADDRESS${s}`] ?? process.env.NEXT_PUBLIC_POLICY_ADDRESS) as `0x${string}` | undefined,
    GOVERNANCE: (process.env[`NEXT_PUBLIC_GOVERNANCE_ADDRESS${s}`] ?? process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS) as `0x${string}` | undefined,
  };
}

export const RISK_API_URL =
  process.env.NEXT_PUBLIC_RISK_API_URL || "http://localhost:3001";

export const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

/** Subgraph query URL for the given chain. Use for dashboard/stats per chain. */
export function getSubgraphUrl(chainId: number): string {
  const s = chainId === 1301 ? "_1301" : chainId === 84532 ? "_84532" : "";
  const url = s
    ? process.env[`NEXT_PUBLIC_SUBGRAPH_URL${s}`]
    : undefined;
  return url ?? process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";
}

// Chain config from @vector/shared (single source of truth)
import { CHAIN_IDS, getChainProfile } from "@vector/shared";
export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: CHAIN_IDS.BASE_SEPOLIA,
  UNICHAIN_SEPOLIA: CHAIN_IDS.UNICHAIN_SEPOLIA,
} as const;
export { getChainProfile };
