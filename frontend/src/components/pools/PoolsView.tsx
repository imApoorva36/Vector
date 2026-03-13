"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Shield, Plus, Trash2 } from "lucide-react";
import { getContracts } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";
import { mapTxError } from "@/hooks/useTransaction";

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

export function PoolsView() {
  const { isConnected, chainId } = useWallet();
  const REGISTRY_ADDRESS = (chainId != null ? getContracts(chainId) : getContracts(84532)).RISK_REGISTRY;
  const [poolId, setPoolId] = useState("");
  const [blockThreshold, setBlockThreshold] = useState("70");
  const [warnThreshold, setWarnThreshold] = useState("31");

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  /** Pad any valid hex string (including 20-byte addresses) to bytes32. */
  function toBytes32(raw: string): `0x${string}` {
    const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
    return `0x${hex.padStart(64, "0")}` as `0x${string}`;
  }

  function validatePoolId(raw: string): string | null {
    const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
    if (!hex) return "Enter a pool ID.";
    if (!/^[0-9a-fA-F]+$/.test(hex)) return "Invalid hex characters.";
    if (hex.length > 64) return "Too long — max 32 bytes (64 hex chars).";
    return null;
  }

  const poolIdError = poolId ? validatePoolId(poolId) : null;
  const padded = poolId && !poolIdError ? toBytes32(poolId) : null;

  function handleProtect() {
    if (!REGISTRY_ADDRESS || !poolId || poolIdError) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setPoolProtection",
      args: [
        toBytes32(poolId),
        1, // Protected
        BigInt(blockThreshold),
        BigInt(warnThreshold),
      ],
    });
  }

  function handleRemove() {
    if (!REGISTRY_ADDRESS || !poolId || poolIdError) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "removePoolProtection",
      args: [toBytes32(poolId)],
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
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none bg-vector-dark ${
                poolIdError ? "border-red-500/60 focus:border-red-500" : "border-vector-border focus:border-vector-primary"
              }`}
            />
            {poolIdError && (
              <p className="mt-1.5 text-xs text-red-400">{poolIdError}</p>
            )}
            {padded && padded !== poolId && (
              <p className="mt-1.5 font-mono text-xs text-slate-500 break-all">
                stored as: <span className="text-slate-400">{padded}</span>
                <span className="ml-2 text-slate-600">(copy this for Simulate tab)</span>
              </p>
            )}
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
              disabled={isPending || isConfirming || !poolId || !!poolIdError}
              className="inline-flex items-center gap-2 rounded-lg bg-vector-primary px-5 py-2.5 font-semibold text-white transition hover:bg-vector-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Protect Pool"}
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending || isConfirming || !poolId || !!poolIdError}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove Protection
            </button>
          </div>

          {writeError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 break-all">
              <span className="font-semibold">Transaction failed: </span>
              {mapTxError(writeError)}
            </div>
          )}

          {isSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 space-y-1">
              <p className="font-semibold">Transaction confirmed! Pool protection updated.</p>
              {txHash && (
                <p className="font-mono text-xs text-emerald-500/80 break-all">
                  Tx: {txHash}
                </p>
              )}
              {padded && (
                <p className="text-xs text-emerald-400/70">
                  Use <span className="font-mono">{padded}</span> as Pool ID in the Simulate tab.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
