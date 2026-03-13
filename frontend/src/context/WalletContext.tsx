"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN_IDS, CHAIN_METADATA, getChainName, type SupportedChainId } from "@/lib/constants";

type WalletContextValue = {
  isConnected: boolean;
  address?: `0x${string}`;
  chainId?: number;
  chainName: string | null;
  supportedChains: SupportedChainId[];
  switchingTo?: number;
  switchError?: string;
  switchToChain: (targetChainId: SupportedChainId) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isConnected, address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switchingTo, setSwitchingTo] = useState<number>();
  const [switchError, setSwitchError] = useState<string>();

  const supportedChains = useMemo(
    () => [CHAIN_IDS.BASE_SEPOLIA, CHAIN_IDS.UNICHAIN_SEPOLIA] as SupportedChainId[],
    []
  );

  async function switchToChain(targetChainId: SupportedChainId) {
    if (chainId === targetChainId) return;
    try {
      setSwitchError(undefined);
      setSwitchingTo(targetChainId);
      await switchChainAsync({ chainId: targetChainId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network switch failed. Approve in wallet and retry.";
      setSwitchError(message);
    } finally {
      setSwitchingTo(undefined);
    }
  }

  const value: WalletContextValue = {
    isConnected,
    address,
    chainId,
    chainName: getChainName(chainId),
    supportedChains,
    switchingTo,
    switchError,
    switchToChain,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return ctx;
}

export function isSupportedVectorChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId === CHAIN_METADATA[CHAIN_IDS.BASE_SEPOLIA].id || chainId === CHAIN_METADATA[CHAIN_IDS.UNICHAIN_SEPOLIA].id;
}
