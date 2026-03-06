// Contract addresses — populate after deployment
export const CONTRACTS = {
  VECTOR_HOOK: process.env.NEXT_PUBLIC_HOOK_ADDRESS as `0x${string}` | undefined,
  RISK_REGISTRY: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined,
  POLICY_ENGINE: process.env.NEXT_PUBLIC_POLICY_ADDRESS as `0x${string}` | undefined,
  GOVERNANCE: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS as `0x${string}` | undefined,
};

export const RISK_API_URL =
  process.env.NEXT_PUBLIC_RISK_API_URL || "http://localhost:3001";

export const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

// Chain config
export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: 84532,
  UNICHAIN_SEPOLIA: 1301,
} as const;
