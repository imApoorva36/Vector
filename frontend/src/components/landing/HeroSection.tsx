"use client";

import Link from "next/link";
import { Shield, Zap, Eye } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Gradient orbs */}
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-vector-primary/20 blur-3xl" />
      <div className="absolute -right-40 top-20 h-80 w-80 rounded-full bg-vector-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-vector-primary/30 bg-vector-primary/10 px-4 py-1.5 text-sm text-vector-primary">
          <Shield className="h-4 w-4" />
          Uniswap v4 Hook Protection
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Protect Liquidity.{" "}
          <span className="bg-gradient-to-r from-vector-primary to-vector-accent bg-clip-text text-transparent">
            In Real Time.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Vector uses off-chain risk attestations verified on-chain through
          Uniswap v4 hooks to block malicious swaps before they drain your
          pool. Hybrid enforcement — fail-closed for protected pools,
          fail-open for unprotected.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-vector-primary px-6 py-3 font-semibold text-white transition hover:bg-vector-primary/90"
          >
            <Eye className="h-5 w-5" />
            Open Dashboard
          </Link>
          <Link
            href="/simulate"
            className="inline-flex items-center gap-2 rounded-lg border border-vector-border bg-vector-card px-6 py-3 font-semibold text-slate-200 transition hover:border-vector-primary/50"
          >
            <Zap className="h-5 w-5" />
            Simulate Swap
          </Link>
        </div>
      </div>
    </section>
  );
}
