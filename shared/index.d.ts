export declare const CHAIN_IDS: Record<string, number>;
export declare const CHAIN_PROFILES: Record<
  number,
  { blockThreshold: number; warnThreshold: number; attestationTTLSeconds: number }
>;
export function getChainProfile(chainId: number): {
  blockThreshold: number;
  warnThreshold: number;
  attestationTTLSeconds: number;
};

export declare const POLICY_DECISION: { ALLOW: 0; WARN: 1; BLOCK: 2 };
export declare const POLICY_DECISION_LABELS: readonly ["ALLOW", "WARN", "BLOCK"];
export function decisionLabel(decision: number): "ALLOW" | "WARN" | "BLOCK";

export interface AttestationPayload {
  riskScore: number;
  expiry: number;
  signature: string;
  encodedAttestation?: string;
}

export interface RiskAssessmentRequest {
  poolId: string;
  token0: string;
  token1: string;
  zeroForOne?: boolean;
  amountSpecified?: string;
  sender?: string;
  chainId?: number;
}

export interface RiskSignal {
  type: string;
  reason: string;
  score: number;
}

export interface RiskAssessmentResponse {
  riskScore: number;
  decision: "ALLOW" | "WARN" | "BLOCK";
  signals: RiskSignal[];
  attestation?: AttestationPayload | null;
}
