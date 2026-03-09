"use client";

import { useState } from "react";
import { Zap, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/constants";

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
    expiry: number;
    signer: string;
  };
}

function decisionConfig(decision: string) {
  if (decision === "ALLOW")
    return { icon: <ShieldCheck className="h-8 w-8" />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  if (decision === "WARN")
    return { icon: <ShieldAlert className="h-8 w-8" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  return { icon: <ShieldX className="h-8 w-8" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" };
}

export function SimulateView() {
  const [poolId, setPoolId] = useState("");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("1");
  const [sender, setSender] = useState("");
  const [chainId, setChainId] = useState<number>(SUPPORTED_CHAINS.BASE_SEPOLIA);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState("");

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
      <p className="mb-8 text-slate-400">
        Simulate a swap against the risk engine to preview the attestation and
        enforcement decision before executing on-chain.
      </p>

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
                  Risk Score: {result.riskScore}/100
                </p>
              </div>
            </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
