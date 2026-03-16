"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CHAIN_IDS, CHAIN_METADATA } from "@/lib/constants";
import { useWallet } from "@/context/WalletContext";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pools", label: "Pools" },
  { href: "/simulate", label: "Simulate" },
] as const;

const CHAINS = [CHAIN_IDS.BASE_SEPOLIA, CHAIN_IDS.UNICHAIN_SEPOLIA] as const;

export function Header() {
  const pathname = usePathname();
  const { isConnected, chainId, chainName, switchingTo, switchError, switchToChain } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeChainMeta = chainId ? CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-vector-border bg-vector-dark/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Vector" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="text-xl font-bold tracking-tight">Vector</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-vector-primary/15 text-vector-primary"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Compact chain selector dropdown */}
          {isConnected && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-vector-border bg-vector-card px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-vector-primary/40 hover:text-white"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {switchingTo ? "Switching..." : activeChainMeta?.name ?? "Select Chain"}
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-vector-border bg-vector-card shadow-xl shadow-black/40">
                  {CHAINS.map((id) => {
                    const isActive = chainId === id;
                    const isSwitching = switchingTo === id;
                    const meta = CHAIN_METADATA[id];
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          switchToChain(id);
                          setDropdownOpen(false);
                        }}
                        disabled={isActive || isSwitching}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition ${
                          isActive
                            ? "bg-vector-primary/10 text-vector-primary"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-vector-primary" : "bg-slate-600"
                          }`}
                        />
                        <span className="flex-1">{meta.name}</span>
                        {isActive && (
                          <span className="rounded bg-vector-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-vector-primary">
                            Active
                          </span>
                        )}
                        {isSwitching && (
                          <span className="text-[10px] text-amber-400">Switching...</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus="avatar"
          />
        </div>
      </div>
      {switchError && (
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <span className="text-[10px] text-amber-400">{switchError}</span>
        </div>
      )}
    </header>
  );
}
