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
    if (hex.length > 64) return "Too long - max 32 bytes (64 hex chars).";
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white">Pool Management</h1>
        <p className="text-lg text-slate-400">
          Onboard Uniswap v4 pools for Vector protection. Set custom risk thresholds below.
        </p>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-vector-border bg-vector-card p-12 text-center">
          <div className="mb-5 rounded-full bg-vector-dark p-4">
            <Shield className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Wallet Required</h2>
          <p className="text-slate-400">Please connect your wallet to manage protected pools on-chain.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Pool Input Card */}
          <div className="rounded-xl border border-vector-border bg-vector-card p-6">
            <label className="mb-2 block text-sm font-semibold tracking-wide text-slate-300">
              Pool ID (bytes32)
            </label>
            <div className="relative">
              <input
                type="text"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                placeholder="0x..."
                className={`w-full rounded-lg border bg-vector-dark px-4 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:border-transparent transition-all ${
                  poolIdError 
                    ? "border-red-500/50 focus:ring-red-500" 
                    : "border-vector-border focus:ring-vector-primary"
                }`}
              />
            </div>
            {poolIdError && (
              <p className="mt-2 text-sm text-red-400 font-medium">{poolIdError}</p>
            )}
            {padded && padded !== poolId && (
              <div className="mt-3 rounded-lg bg-slate-900/50 p-3 ring-1 ring-white/5">
                <p className="font-mono text-xs text-slate-400 break-all leading-relaxed">
                  <span className="font-semibold text-slate-500 mr-2 text-[10px] uppercase tracking-widest">PADDED:</span>
                  <span className="text-slate-300">{padded}</span>
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-vector-border bg-vector-card p-6">
              <label className="mb-3 block text-sm font-semibold tracking-wide text-slate-300 flex items-center justify-between">
                <span>Block Threshold</span>
                <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500 uppercase tracking-widest">Revert</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={blockThreshold}
                onChange={(e) => setBlockThreshold(e.target.value)}
                className="w-full rounded-lg border border-vector-border bg-vector-dark px-4 py-3 font-mono text-lg text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent transition-all"
              />
              <p className="mt-3 text-xs text-slate-500">Scores ≥ this value are blocked on-chain.</p>
            </div>
            <div className="rounded-xl border border-vector-border bg-vector-card p-6">
              <label className="mb-3 block text-sm font-semibold tracking-wide text-slate-300 flex items-center justify-between">
                <span>Warn Threshold</span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest">Alert</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={warnThreshold}
                onChange={(e) => setWarnThreshold(e.target.value)}
                className="w-full rounded-lg border border-vector-border bg-vector-dark px-4 py-3 font-mono text-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <p className="mt-3 text-xs text-slate-500">Scores ≥ this value emit a warning event.</p>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleProtect}
              disabled={isPending || isConfirming || !poolId || !!poolIdError}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-vector-primary px-6 py-3 font-bold text-white transition hover:bg-vector-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Signing in Wallet..." : isConfirming ? "Confirming tx..." : "Protect Pool"}
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending || isConfirming || !poolId || !!poolIdError}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-3 font-bold text-red-400 transition hover:bg-red-500/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
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
