"use client";

import Link from "next/link";
import { Shield, Zap, Eye } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-vector-primary/20 blur-[100px]" />
      <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-vector-accent/15 blur-[100px]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-vector-border bg-vector-card px-4 py-1.5 text-xs font-medium text-slate-300">
          <Shield className="h-4 w-4 text-vector-primary" />
          Uniswap v4 Hook Protection
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Protect Liquidity.{" "}
          <span className="text-vector-primary">
            In Real Time.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Vector uses off-chain risk attestations verified on-chain through
          Uniswap v4 hooks to block malicious swaps before they drain your
          pool. Hybrid enforcement: fail-closed for protected pools,
          fail-open for unprotected.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-vector-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-vector-primary/90"
          >
            <Eye className="h-4 w-4" />
            Open Dashboard
          </Link>
          <Link
            href="/simulate"
            className="inline-flex items-center gap-2 rounded-lg border border-vector-border bg-vector-card px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            <Zap className="h-4 w-4" />
            Simulate Swap
          </Link>
        </div>
      </div>
    </section>
  );
}
