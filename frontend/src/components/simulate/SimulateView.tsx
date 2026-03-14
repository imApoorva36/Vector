"use client";

import { useState } from "react";
import { Zap, ShieldCheck, ShieldAlert, ShieldX, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SUPPORTED_CHAINS, getContracts, getTxExplorerUrl } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";
import { mapTxError } from "@/hooks/useTransaction";

const HOOK_ABI = [
  {
    name: "evaluateSwap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId",          type: "bytes32" },
      { name: "sender",          type: "address" },
      { name: "zeroForOne",      type: "bool"    },
      { name: "amountSpecified", type: "int256"  },
      { name: "hookData",        type: "bytes"   },
    ],
    outputs: [{ name: "decision", type: "uint8" }],
  },
] as const;

const DEMO_POOL_ID = "0x0000000000000000000000000000000000000000000000000000000000000001";
const DEMO_SENDER  = "0x0000000000000000000000000000000000000001";
const WETH         = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

// Demo inputs verified to yield ALLOW, WARN, BLOCK from the risk pipeline (see scripts/test-risk-scenarios.js).
const QUICK_FILLS = [
  {
    label: "ALLOW",
    subtitle: "USDC + WETH (allowlist)",
    color: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
    values: {
      poolId: DEMO_POOL_ID,
      tokenIn: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      tokenOut: WETH,
      amountIn: "1000000000000000000",
      sender: DEMO_SENDER,
      chainId: SUPPORTED_CHAINS.BASE_SEPOLIA,
    },
  },
  {
    label: "WARN",
    subtitle: "EOA token on Unichain (on-chain layer)",
    color: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",
    values: {
      poolId: DEMO_POOL_ID,
      tokenIn: WETH,
      tokenOut: "0x1234567890123456789012345678901234567890",
      amountIn: "1000000000000000000",
      sender: DEMO_SENDER,
      chainId: SUPPORTED_CHAINS.UNICHAIN_SEPOLIA,
    },
  },
  {
    label: "BLOCK",
    subtitle: "Known malicious token (threat intel)",
    color: "border-red-500/40 text-red-400 hover:bg-red-500/10",
    values: {
      poolId: DEMO_POOL_ID,
      tokenIn: "0x000000000000000000000000000000000000dead",
      tokenOut: WETH,
      amountIn: "1000000000000000000",
      sender: DEMO_SENDER,
      chainId: SUPPORTED_CHAINS.BASE_SEPOLIA,
    },
  },
] as const;

const CHAIN_OPTIONS = [
  { id: SUPPORTED_CHAINS.BASE_SEPOLIA, label: "Base Sepolia" },
  { id: SUPPORTED_CHAINS.UNICHAIN_SEPOLIA, label: "Unichain Sepolia" },
] as const;

interface RiskResult {
  riskScore: number;
  decision: string;
  breakdown: Array<{ layer: string; score: number; details: string }>;
  attestation: {
    signature: string;
    encodedAttestation?: string;
    expiry: number;
    signer: string;
  };
}

function decisionConfig(decision: string) {
  if (decision === "ALLOW")
    return { icon: <ShieldCheck className="h-8 w-8" />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", barColor: "bg-emerald-500", label: "Safe to proceed" };
  if (decision === "WARN")
    return { icon: <ShieldAlert className="h-8 w-8" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", barColor: "bg-amber-500", label: "Proceed with caution" };
  return { icon: <ShieldX className="h-8 w-8" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", barColor: "bg-red-500", label: "Hook would revert this swap" };
}

function ScoreBar({ score, barColor }: { score: number; barColor: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">Risk Score</span>
        <span className="font-mono font-bold text-slate-300">{score}<span className="text-slate-500">/100</span></span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-vector-dark">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-600">
        <span>0 - Safe</span>
        <span>31 - Warn</span>
        <span>70 - Block</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function SimulateView() {
  const { isConnected, chainId: walletChainId } = useWallet();
  const [poolId, setPoolId] = useState("");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("1");
  const [sender, setSender] = useState("");
  const [chainId, setChainId] = useState<number>(SUPPORTED_CHAINS.BASE_SEPOLIA);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState("");

  const HOOK_ADDRESS = getContracts(walletChainId ?? chainId).VECTOR_HOOK;

  const {
    writeContract: writeEval,
    data: evalTxHash,
    isPending: evalPending,
    error: evalError,
    reset: resetEval,
  } = useWriteContract();
  const { isLoading: evalConfirming, isSuccess: evalSuccess } =
    useWaitForTransactionReceipt({ hash: evalTxHash });

  const explorerUrl = evalTxHash ? getTxExplorerUrl(evalTxHash, walletChainId ?? chainId) : null;

  function handleEvaluateOnChain() {
    if (!result?.attestation?.encodedAttestation || !HOOK_ADDRESS) return;
    const effectivePoolId = (poolId || "0x" + "00".repeat(32)) as `0x${string}`;
    const effectiveSender = (sender || "0x" + "00".repeat(20)) as `0x${string}`;
    resetEval();
    writeEval({
      address: HOOK_ADDRESS,
      abi: HOOK_ABI,
      functionName: "evaluateSwap",
      args: [
        effectivePoolId,
        effectiveSender,
        true,
        BigInt(amountIn || "1000000000000000000"),
        result.attestation.encodedAttestation as `0x${string}`,
      ],
    });
  }

  function applyQuickFill(fill: typeof QUICK_FILLS[number]) {
    setPoolId(fill.values.poolId);
    setTokenIn(fill.values.tokenIn);
    setTokenOut(fill.values.tokenOut);
    setAmountIn(fill.values.amountIn);
    setSender(fill.values.sender);
    setChainId(fill.values.chainId);
    setResult(null);
    setError("");
  }

  async function handleSimulate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/risk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId: poolId || "0x" + "00".repeat(32),
          tokenIn: tokenIn || "0x" + "00".repeat(20),
          tokenOut: tokenOut || "0x" + "00".repeat(20),
          amountIn: amountIn || "1000000000000000000",
          sender: sender || "0x" + "00".repeat(20),
          chainId,
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Risk assessment failed. Check server logs.");
    } finally {
      setLoading(false);
    }
  }

  const dc = result ? decisionConfig(result.decision) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Swap Risk Simulator</h1>
      <p className="mb-6 text-slate-400">
        Test any swap against Vector&apos;s 5-layer risk pipeline. See the risk score, layer breakdown,
        and signed attestation - then optionally evaluate it on-chain through the hook.
      </p>

      {/* Quick fill scenario buttons */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Quick Fill Scenarios</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_FILLS.map((fill) => (
            <button
              key={fill.label}
              onClick={() => applyQuickFill(fill)}
              className={`group flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${fill.color}`}
            >
              {fill.label}
              <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
              <span className="font-normal text-slate-500">{fill.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Chain</label>
            <select
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white focus:border-vector-primary focus:outline-none"
            >
              {CHAIN_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Pool ID</label>
            <input
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Sender</label>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Token In</label>
            <input
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Token Out</label>
            <input
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-vector-border bg-vector-card p-4">
            <label className="mb-1 block text-xs font-medium text-slate-400">Amount (wei)</label>
            <input
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="1000000000000000000"
              className="w-full rounded-lg border border-vector-border bg-vector-dark px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-vector-primary focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vector-primary py-3 font-semibold text-white transition hover:bg-vector-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
          {loading ? "Analyzing..." : "Simulate Risk Assessment"}
        </button>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && dc && (
          <div data-testid="risk-result" className={`rounded-xl border ${dc.border} ${dc.bg} p-6`}>
            <div className="flex items-center gap-4">
              <div className={dc.color}>{dc.icon}</div>
              <div>
                <p data-testid="risk-decision" className={`text-2xl font-bold ${dc.color}`}>
                  {result.decision}
                </p>
                <p className="text-sm text-slate-400">
                  {dc.label}
                </p>
              </div>
            </div>

            <ScoreBar score={result.riskScore} barColor={dc.barColor} />

            {/* Score breakdown */}
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">
                Layer Breakdown
              </h3>
              {result.breakdown.map((layer) => (
                <div
                  key={layer.layer}
                  className="flex items-center justify-between rounded-lg bg-vector-dark/50 px-4 py-2"
                >
                  <span className="text-sm text-slate-300">{layer.layer}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {layer.details}
                    </span>
                    <span className="rounded bg-vector-dark px-2 py-0.5 text-xs font-mono font-bold text-slate-200">
                      +{layer.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Attestation details */}
            {result.attestation && (
              <div className="mt-6 rounded-lg bg-vector-dark/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-300">
                  Attestation
                </h3>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-400">
                    <span className="text-slate-500">Signer:</span>{" "}
                    <span className="font-mono">{result.attestation.signer}</span>
                  </p>
                  <p className="text-slate-400">
                    <span className="text-slate-500">Expires:</span>{" "}
                    {new Date(result.attestation.expiry * 1000).toLocaleString()}
                  </p>
                  <p className="text-slate-400 break-all">
                    <span className="text-slate-500">Signature:</span>{" "}
                    <span className="font-mono">
                      {result.attestation.signature.slice(0, 24)}...
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Evaluate on-chain */}
            {result.decision !== "BLOCK" && result.attestation?.encodedAttestation && (
              <div className="mt-4 rounded-lg border border-vector-border bg-vector-dark/30 p-4">
                <p className="mb-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Evaluate On-chain</span>
                  {" "}- sends this attestation to VectorHook on-chain, emitting a{" "}
                  <code className="text-slate-400">HookSwapEvaluated</code> event that populates the Dashboard.
                  {!isConnected && <span className="ml-1 text-amber-400"> (connect wallet first)</span>}
                </p>
                <button
                  onClick={handleEvaluateOnChain}
                  disabled={evalPending || evalConfirming || !isConnected || !HOOK_ADDRESS}
                  className="inline-flex items-center gap-2 rounded-lg border border-vector-primary/40 bg-vector-primary/10 px-4 py-2 text-sm font-semibold text-vector-primary transition hover:bg-vector-primary/20 disabled:opacity-40"
                >
                  {evalPending || evalConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {evalPending ? "Signing..." : evalConfirming ? "Confirming..." : "Evaluate On-chain"}
                </button>

                {evalError && (
                  <p className="mt-2 text-xs text-red-400 break-all">
                    {mapTxError(evalError)}
                  </p>
                )}

                {evalSuccess && evalTxHash && (
                  <div className="mt-2 text-xs text-emerald-400 space-y-0.5">
                    <p className="font-semibold">Confirmed! Dashboard will update in ~30s.</p>
                    <p className="font-mono break-all text-emerald-500/70">{evalTxHash}</p>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 underline"
                      >
                        View on explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {result.decision === "BLOCK" && (
              <p className="mt-4 text-xs text-slate-500 italic">
                BLOCK decisions revert on-chain - no on-chain evaluation submitted for this scenario.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
