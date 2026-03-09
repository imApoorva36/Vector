"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Shield } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/constants";

const CHAIN_NAMES: Record<number, string> = {
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: "Base Sepolia",
  [SUPPORTED_CHAINS.UNICHAIN_SEPOLIA]: "Unichain Sepolia",
};

export function Header() {
  const { chainId } = useAccount();
  const chainName = chainId != null ? CHAIN_NAMES[chainId] ?? `Chain ${chainId}` : null;

  return (
    <header className="sticky top-0 z-50 border-b border-vector-border bg-vector-dark/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-vector-primary" />
          <span className="text-xl font-bold tracking-tight">Vector</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/pools"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Pools
          </Link>
          <Link
            href="/simulate"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Simulate
          </Link>
          {chainName && (
            <span className="rounded bg-vector-card px-2.5 py-1 text-xs text-slate-400">
              Network: {chainName}
            </span>
          )}
        </nav>

        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />
      </div>
    </header>
  );
}
