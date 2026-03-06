"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

async function fetchDashboardData() {
  if (!SUBGRAPH_URL) return null;

  const res = await fetch(SUBGRAPH_URL, {
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
      }`,
    }),
  });
  return (await res.json()).data;
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
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 10_000,
  });

  const stats = data?.protocolStats;
  const evals = data?.swapEvaluations || [];
  const alerts = data?.crossChainAlerts || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Operator Dashboard</h1>

      {/* Stats cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: <Activity className="h-5 w-5 text-vector-accent" />, label: "Evaluations", value: stats?.totalSwapEvaluations || "—" },
          { icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />, label: "Protected Pools", value: stats?.totalPools || "—" },
          { icon: <ShieldX className="h-5 w-5 text-red-400" />, label: "Blocked", value: stats?.totalBlockedSwaps || "—" },
          { icon: <ShieldAlert className="h-5 w-5 text-amber-400" />, label: "Warned", value: stats?.totalWarnedSwaps || "—" },
          { icon: <TrendingUp className="h-5 w-5 text-violet-400" />, label: "X-Chain Alerts", value: stats?.totalCrossChainAlerts || "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-vector-border bg-vector-card p-4">
            <div className="flex items-center gap-3">
              {s.icon}
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
        <div className="rounded-xl border border-vector-border bg-vector-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Evaluations</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : evals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No swap evaluations yet. Connect a subgraph to see live data.
            </p>
          ) : (
            <div className="space-y-3">
              {evals.map((ev: any) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg bg-vector-dark/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-mono text-slate-300">
                      {ev.sender.slice(0, 6)}...{ev.sender.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Score: {ev.riskScore} &middot; Pool:{" "}
                      {ev.pool?.id?.slice(0, 10)}...
                    </p>
                  </div>
                  {decisionBadge(ev.decision)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-chain alerts */}
        <div className="rounded-xl border border-vector-border bg-vector-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Cross-Chain Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No cross-chain alerts yet. Reactive RSC monitors blocked events.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono text-red-300">
                      {a.actor.slice(0, 6)}...{a.actor.slice(-4)}
                    </p>
                    <span className="text-xs text-red-400">
                      Chain {a.sourceChainId}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Risk: {a.riskScore} — {a.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
