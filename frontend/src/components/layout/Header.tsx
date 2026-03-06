"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield } from "lucide-react";

export function Header() {
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
