"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  Activity,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  TrendingUp,
  Key,
  Zap,
} from "lucide-react";
import { CHAIN_IDS, getSubgraphUrl, getChainName } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";

const DEFAULT_STATS = {
  totalPools: 0,
  totalSwapEvaluations: 0,
  totalBlockedSwaps: 0,
  totalWarnedSwaps: 0,
  totalCrossChainAlerts: 0,
};

async function fetchDashboardData(subgraphUrl: string): Promise<{
  protocolStats: typeof DEFAULT_STATS | null;
  swapEvaluations: unknown[];
  crossChainAlerts: unknown[];
  poolsByBlocked: unknown[];
  error?: string;
} | null> {
  if (!subgraphUrl) return null;
  try {
    const res = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          protocolStats(id: "global") {
            totalPools
            totalSwapEvaluations
            totalBlockedSwaps
            totalWarnedSwaps
            totalCrossChainAlerts
          }
          swapEvaluations(first: 20, orderBy: timestamp, orderDirection: desc) {
            id
            decision
            riskScore
            reason
            sender
            timestamp
            pool { id protectionMode }
          }
          crossChainAlerts(first: 10, orderBy: timestamp, orderDirection: desc) {
            id
            sourceChainId
            actor
            riskScore
            reason
            timestamp
            pool { id }
          }
          poolsByBlocked: pools(first: 5, orderBy: blockedSwaps, orderDirection: desc) {
            id
            blockedSwaps
            warnedSwaps
            allowedSwaps
          }
        }`,
      }),
    });
    const json = await res.json();
    if (json.errors?.length) {
      return {
        protocolStats: DEFAULT_STATS,
        swapEvaluations: [],
        crossChainAlerts: [],
        poolsByBlocked: [],
        error: json.errors.map((e: { message?: string }) => e.message).join("; "),
      };
    }
    const data = json.data ?? {};
    return {
      protocolStats: data.protocolStats ?? DEFAULT_STATS,
      swapEvaluations: data.swapEvaluations ?? [],
      crossChainAlerts: data.crossChainAlerts ?? [],
      poolsByBlocked: data.poolsByBlocked ?? [],
    };
  } catch (e) {
    return {
      protocolStats: DEFAULT_STATS,
      swapEvaluations: [],
      crossChainAlerts: [],
      poolsByBlocked: [],
      error: e instanceof Error ? e.message : "Failed to fetch subgraph",
    };
  }
}

function toNum(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

async function fetchRiskEngineHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function decisionBadge(decision: string) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    ALLOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
    WARN: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
    BLOCK: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
  };
  const c = config[decision] || config.ALLOW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} px-2.5 py-0.5 text-xs font-medium ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {decision}
    </span>
  );
}

export function DashboardView() {
  const { chainId } = useWallet();
  const effectiveChainId = chainId ?? CHAIN_IDS.BASE_SEPOLIA;
  const subgraphUrl = getSubgraphUrl(effectiveChainId);
  const chainLabel = getChainName(effectiveChainId) ?? `Chain ${effectiveChainId}`;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", subgraphUrl],
    queryFn: () => fetchDashboardData(subgraphUrl),
    refetchInterval: 10_000,
    retry: 2,
    enabled: !!subgraphUrl,
  });
  const { data: health } = useQuery({
    queryKey: ["risk-engine-health"],
    queryFn: fetchRiskEngineHealth,
    refetchInterval: 15_000,
  });

  const stats = data?.protocolStats ?? DEFAULT_STATS;
  const evals = data?.swapEvaluations ?? [];
  const alerts = data?.crossChainAlerts ?? [];
  const poolsByBlocked = data?.poolsByBlocked ?? [];
  const subgraphError = data?.error;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white">Operator Dashboard</h1>
          <p className="text-lg text-slate-400">Live protocol statistics and recent evaluations.</p>
          {subgraphUrl && (
            <>
              <p className="mt-1 text-xs text-slate-500">Data for: {chainLabel} (switch network in header to change)</p>
              <p className="mt-0.5 text-xs text-slate-600">Only evaluations sent on this network appear here. In Simulate, use Base Sepolia in your wallet before &quot;Evaluate On-chain&quot; to see counts here.</p>
            </>
          )}
          {subgraphError && (
            <p className="mt-2 text-sm text-amber-400">Subgraph error: {subgraphError}</p>
          )}
        </div>
      </div>

      {/* Signer & sponsor status */}
      <div className="mb-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-vector-border bg-vector-card p-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Key className="h-4 w-4" />
            TEE Signer Status
          </h3>
          {health ? (
            <div className="space-y-1 text-sm">
              <p className={health.signerConfigured ? "text-emerald-400" : "text-amber-400"}>
                {health.signerConfigured ? "Configured" : "Not configured"}
              </p>
              {health.signerAddress && (
                <p className="truncate font-mono text-xs text-slate-500">
                  {health.signerAddress}
                </p>
              )}
              {!health.signerConfigured && health.hint && (
                <p className="text-xs text-amber-500/90">{health.hint}</p>
              )}
              <p className="text-xs text-slate-500">Cache size: {health.cacheSize ?? "-"}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Risk engine unreachable</p>
          )}
        </div>
        <div className="rounded-xl border border-vector-border bg-vector-card p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Zap className="h-4 w-4 text-cyan-400" />
            Reactive Network
          </h3>
          <div className="space-y-1 text-sm">
            <p className={subgraphUrl ? "text-emerald-400" : "text-slate-500"}>
              {subgraphUrl ? "Subgraph connected" : "Subgraph not configured"}
            </p>
            <p className="text-xs text-slate-500">
              Cross-chain alerts: {toNum(stats?.totalCrossChainAlerts)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: <Activity className="h-5 w-5 text-cyan-400" />, label: "Evaluations", value: toNum(stats?.totalSwapEvaluations) },
          { icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />, label: "Protected Pools", value: toNum(stats?.totalPools) },
          { icon: <ShieldX className="h-5 w-5 text-rose-400" />, label: "Blocked", value: toNum(stats?.totalBlockedSwaps) },
          { icon: <ShieldAlert className="h-5 w-5 text-amber-400" />, label: "Warned", value: toNum(stats?.totalWarnedSwaps) },
          { icon: <TrendingUp className="h-5 w-5 text-violet-400" />, label: "X-Chain Alerts", value: toNum(stats?.totalCrossChainAlerts) },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-vector-border bg-vector-card p-5 transition hover:border-vector-border/80">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-vector-dark p-2">
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent evaluations */}
        <div className="flex flex-col rounded-xl border border-vector-border bg-vector-card">
          <div className="border-b border-vector-border px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-200">Recent Evaluations</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-vector-primary border-t-transparent" />
              </div>
            ) : evals.length === 0 ? (
            <p className="text-sm text-slate-500">
              {!subgraphUrl
                ? "Subgraph not configured for this chain. Set NEXT_PUBLIC_SUBGRAPH_URL (and _84532 / _1301) in .env."
                : "No evaluations indexed yet. Run Simulate → Evaluate On-chain (same chain as this dashboard). Wait ~1 min for the subgraph to sync. Ensure .env contract addresses match the subgraph deployment."}
            </p>
          ) : (
            <div className="space-y-3">
              {evals.map((ev: any) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg bg-vector-dark px-4 py-3 border border-vector-border/50"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-mono text-sm text-slate-300">
                        {ev.sender.slice(0, 6)}...{ev.sender.slice(-4)}
                      </p>
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                        Score: {ev.riskScore}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                      Pool: {ev.pool?.id?.slice(0, 10)}...
                    </p>
                  </div>
                  {decisionBadge(ev.decision)}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Trend: pools by blocked count */}
        {poolsByBlocked.length > 0 && (
          <div className="rounded-xl border border-vector-border bg-vector-card p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Pools by Blocked Swaps (top 5)</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {poolsByBlocked.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-lg bg-vector-dark/50 px-4 py-3"
                >
                  <p className="truncate font-mono text-xs text-slate-500">{p.id?.slice(0, 18)}...</p>
                  <p className="mt-1 text-sm font-bold text-red-400">{p.blockedSwaps} blocked</p>
                  <p className="text-xs text-slate-500">{p.warnedSwaps} warned · {p.allowedSwaps} allowed</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-chain alerts */}
        <div className="flex flex-col rounded-xl border border-vector-border bg-vector-card">
          <div className="border-b border-vector-border px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Cross-Chain Alerts</h2>
            <div className="flex items-center gap-1.5 rounded-md bg-vector-dark px-2 py-1 text-xs text-violet-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
              </span>
              Live
            </div>
          </div>
          <div className="p-6">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No cross-chain alerts yet. Reactive RSC monitors blocked events.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a: any) => (
                <div
                  key={a.id}
                  className="flex flex-col rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-medium text-rose-300">
                      {a.actor.slice(0, 6)}...{a.actor.slice(-4)}
                    </p>
                    <span className="text-xs text-rose-400">
                      Chain {a.sourceChainId}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-400">
                      Score: {a.riskScore}
                    </span>
                    <p className="text-xs text-slate-400 truncate">
                      {a.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
