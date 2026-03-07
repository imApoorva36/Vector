/**
 * Chain IDs and default risk threshold presets per chain.
 * Single source of truth for contracts, risk-engine, and frontend.
 */

/** @type {Record<string, number>} */
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  UNICHAIN_SEPOLIA: 1301,
  LOCALHARDHAT: 31337,
};

/**
 * Default block/warn thresholds and attestation TTL per chain (optional overrides).
 * @type {Record<number, { blockThreshold: number, warnThreshold: number, attestationTTLSeconds: number }>}
 */
export const CHAIN_PROFILES = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    blockThreshold: 70,
    warnThreshold: 31,
    attestationTTLSeconds: 300,
  },
  [CHAIN_IDS.UNICHAIN_SEPOLIA]: {
    blockThreshold: 70,
    warnThreshold: 31,
    attestationTTLSeconds: 300,
  },
  [CHAIN_IDS.LOCALHARDHAT]: {
    blockThreshold: 70,
    warnThreshold: 31,
    attestationTTLSeconds: 300,
  },
};

/**
 * @param {number} chainId
 * @returns {{ blockThreshold: number, warnThreshold: number, attestationTTLSeconds: number }}
 */
export function getChainProfile(chainId) {
  return (
    CHAIN_PROFILES[chainId] || {
      blockThreshold: 70,
      warnThreshold: 31,
      attestationTTLSeconds: 300,
    }
  );
}
