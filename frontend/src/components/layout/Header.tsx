"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield } from "lucide-react";
import { CHAIN_IDS, CHAIN_METADATA } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";

const CHAIN_SWITCHERS = [CHAIN_IDS.BASE_SEPOLIA, CHAIN_IDS.UNICHAIN_SEPOLIA] as const;

export function Header() {
  const { isConnected, chainId, chainName, switchingTo, switchError, switchToChain } = useWallet();

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

          {isConnected && (
            <div className="flex items-center gap-2">
              {CHAIN_SWITCHERS.map((id) => {
                const isActive = chainId === id;
                const isSwitching = switchingTo === id;
                return (
                  <button
                    key={id}
                    onClick={() => switchToChain(id)}
                    disabled={isActive || isSwitching}
                    className={`rounded px-2 py-1 text-xs transition ${
                      isActive
                        ? "bg-vector-primary/25 text-vector-primary"
                        : "bg-vector-card text-slate-400 hover:text-white"
                    } disabled:opacity-60`}
                  >
                    {isSwitching ? "Switching..." : CHAIN_METADATA[id].name}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="flex flex-col items-end gap-1">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
          {switchError && <span className="max-w-60 text-right text-[10px] text-amber-400">{switchError}</span>}
        </div>
      </div>
    </header>
  );
}
