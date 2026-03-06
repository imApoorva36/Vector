"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, ShieldX, Activity } from "lucide-react";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

async function fetchStats() {
  if (!SUBGRAPH_URL) {
    return {
      totalSwapEvaluations: "—",
      totalBlockedSwaps: "—",
      totalWarnedSwaps: "—",
      totalPools: "—",
    };
  }

  const res = await fetch(SUBGRAPH_URL, {
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
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { data } = useQuery({
    queryKey: ["protocolStats"],
    queryFn: fetchStats,
    refetchInterval: 10_000,
  });

  const stats = [
    {
      icon: <Activity className="h-5 w-5 text-vector-accent" />,
      label: "Total Evaluations",
      value: data?.totalSwapEvaluations?.toString() || "—",
      color: "bg-vector-accent/10",
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-vector-success" />,
      label: "Protected Pools",
      value: data?.totalPools?.toString() || "—",
      color: "bg-vector-success/10",
    },
    {
      icon: <ShieldX className="h-5 w-5 text-vector-danger" />,
      label: "Blocked Swaps",
      value: data?.totalBlockedSwaps?.toString() || "—",
      color: "bg-vector-danger/10",
    },
    {
      icon: <ShieldAlert className="h-5 w-5 text-vector-warning" />,
      label: "Warned Swaps",
      value: data?.totalWarnedSwaps?.toString() || "—",
      color: "bg-vector-warning/10",
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
