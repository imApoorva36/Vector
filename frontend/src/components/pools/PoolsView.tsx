"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Shield, Plus, Trash2 } from "lucide-react";

// ABI fragments for VectorRiskRegistry
const REGISTRY_ABI = [
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
] as const;

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined;

export function PoolsView() {
  const { isConnected } = useAccount();
  const [poolId, setPoolId] = useState("");
  const [blockThreshold, setBlockThreshold] = useState("70");
  const [warnThreshold, setWarnThreshold] = useState("31");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handleProtect() {
    if (!REGISTRY_ADDRESS || !poolId) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setPoolProtection",
      args: [
        poolId as `0x${string}`,
        1, // Protected
        BigInt(blockThreshold),
        BigInt(warnThreshold),
      ],
    });
  }

  function handleRemove() {
    if (!REGISTRY_ADDRESS || !poolId) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "removePoolProtection",
      args: [poolId as `0x${string}`],
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Pool Management</h1>
      <p className="mb-8 text-slate-400">
        Onboard pools for Vector protection. Set risk thresholds (block / warn).
      </p>

      {!isConnected ? (
        <div className="rounded-xl border border-vector-border bg-vector-card p-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <p className="text-slate-400">Connect your wallet to manage pools.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-vector-border bg-vector-card p-6">
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Pool ID (bytes32)
            </label>
            <input
              type="text"
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-vector-border bg-vector-card p-4">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Block Threshold (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={blockThreshold}
                onChange={(e) => setBlockThreshold(e.target.value)}
                className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white focus:border-vector-primary focus:outline-none"
              />
            </div>
            <div className="rounded-xl border border-vector-border bg-vector-card p-4">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Warn Threshold (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={warnThreshold}
                onChange={(e) => setWarnThreshold(e.target.value)}
                className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white focus:border-vector-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleProtect}
              disabled={isPending || isConfirming || !poolId}
              className="inline-flex items-center gap-2 rounded-lg bg-vector-primary px-5 py-2.5 font-semibold text-white transition hover:bg-vector-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Protect Pool"}
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending || isConfirming || !poolId}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove Protection
            </button>
          </div>

          {isSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              Transaction confirmed! Pool protection updated.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
