// Contract ABIs for frontend interaction
export const VECTOR_HOOK_ABI = [
  {
    type: "event",
    name: "HookSwapEvaluated",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "decision", type: "uint8", indexed: false },
      { name: "riskScore", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SwapExecuted",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount0Delta", type: "int128", indexed: false },
      { name: "amount1Delta", type: "int128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SwapBlockedByPolicy",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: false },
      { name: "riskScore", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
] as const;

export const RISK_REGISTRY_ABI = [
  {
    name: "setPoolProtection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "mode", type: "uint8" },
      { name: "blockThreshold", type: "uint256" },
      { name: "warnThreshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "removePoolProtection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "getPoolProtection",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "mode", type: "uint8" },
      { name: "blockThreshold", type: "uint256" },
      { name: "warnThreshold", type: "uint256" },
    ],
  },
  {
    name: "setTEESigner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [],
  },
  {
    type: "event",
    name: "PoolProtectionSet",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "mode", type: "uint8", indexed: false },
      { name: "blockThreshold", type: "uint256", indexed: false },
      { name: "warnThreshold", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PoolProtectionRemoved",
    inputs: [{ name: "poolId", type: "bytes32", indexed: true }],
  },
] as const;

export const POLICY_ENGINE_ABI = [
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "SwapEvaluated",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "decision", type: "uint8", indexed: false },
      { name: "riskScore", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SwapBlocked",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "riskScore", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
] as const;
