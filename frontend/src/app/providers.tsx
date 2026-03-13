"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";
import { defineChain } from "viem";
import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";
import { CHAIN_METADATA, CHAIN_IDS } from "@/lib/constants";
import { WalletProvider } from "@/context/WalletContext";

const unichainSepolia = defineChain({
  id: CHAIN_IDS.UNICHAIN_SEPOLIA,
  name: CHAIN_METADATA[CHAIN_IDS.UNICHAIN_SEPOLIA].name,
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [CHAIN_METADATA[CHAIN_IDS.UNICHAIN_SEPOLIA].rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: CHAIN_METADATA[CHAIN_IDS.UNICHAIN_SEPOLIA].explorerUrl,
    },
  },
});

const config = createConfig({
  chains: [baseSepolia, unichainSepolia],
  connectors: [
    // Keep wallet setup deterministic in local/dev builds without requiring WalletConnect project config.
    injected({ target: "metaMask" }),
  ],
  transports: {
    [baseSepolia.id]: http(CHAIN_METADATA[CHAIN_IDS.BASE_SEPOLIA].rpcUrl),
    [unichainSepolia.id]: http(CHAIN_METADATA[CHAIN_IDS.UNICHAIN_SEPOLIA].rpcUrl),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#6366f1",
              borderRadius: "medium",
            })}
          >
            {children}
          </RainbowKitProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
