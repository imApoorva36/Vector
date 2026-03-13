"use client";

import { useState } from "react";

export type TxStage = "idle" | "signing" | "confirming" | "confirmed" | "failed";

export function mapTxError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const lower = message.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction was rejected in wallet.";
  }
  if (lower.includes("insufficient funds")) {
    return "Insufficient balance for gas fees.";
  }
  if (lower.includes("chain") && lower.includes("mismatch")) {
    return "Wrong network selected. Switch to a supported chain and retry.";
  }
  return message;
}

export function useTransactionState() {
  const [stage, setStage] = useState<TxStage>("idle");
  const [error, setError] = useState<string | null>(null);

  return {
    stage,
    error,
    isLoading: stage === "signing" || stage === "confirming",
    setSigning: () => {
      setError(null);
      setStage("signing");
    },
    setConfirming: () => {
      setError(null);
      setStage("confirming");
    },
    setConfirmed: () => {
      setError(null);
      setStage("confirmed");
    },
    setFailed: (err: unknown) => {
      setError(mapTxError(err));
      setStage("failed");
    },
    reset: () => {
      setError(null);
      setStage("idle");
    },
  };
}
