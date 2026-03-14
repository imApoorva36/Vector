"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { ShieldCheck, ShieldAlert, ShieldX, Activity } from "lucide-react";
import { getSubgraphUrl } from "@/lib/constants";

async function fetchStats(subgraphUrl: string) {
  if (!subgraphUrl) {
    return {
      totalSwapEvaluations: "-",
      totalBlockedSwaps: "-",
      totalWarnedSwaps: "-",
      totalPools: "-",
    };
  }

  const res = await fetch(subgraphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ protocolStats(id: "global") { totalSwapEvaluations totalBlockedSwaps totalWarnedSwaps totalPools } }`,
    }),
  });
  const json = await res.json();
  return json.data?.protocolStats || {};
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-vector-border bg-vector-card p-5">
      <div className={`rounded-lg p-2.5 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { chainId } = useAccount();
  const subgraphUrl = getSubgraphUrl(chainId ?? 0);
  const { data } = useQuery({
    queryKey: ["protocolStats", chainId, subgraphUrl],
    queryFn: () => fetchStats(subgraphUrl),
    refetchInterval: 10_000,
  });

  const stats = [
    {
      icon: <Activity className="h-5 w-5 text-vector-accent" />,
      label: "Total Evaluations",
      value: data?.totalSwapEvaluations?.toString() || "-",
      color: "bg-vector-accent/10 border border-vector-accent/20",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      label: "Protected Pools",
      value: data?.totalPools?.toString() || "-",
      color: "bg-emerald-500/10 border border-emerald-500/20",
    },
    {
      icon: <ShieldX className="h-5 w-5 text-red-400" />,
      label: "Blocked Swaps",
      value: data?.totalBlockedSwaps?.toString() || "-",
      color: "bg-red-500/10 border border-red-500/20",
    },
    {
      icon: <ShieldAlert className="h-5 w-5 text-amber-400" />,
      label: "Warned Swaps",
      value: data?.totalWarnedSwaps?.toString() || "-",
      color: "bg-amber-500/10 border border-amber-500/20",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
