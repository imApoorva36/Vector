/**
 * Layer 2 — Swap Intent Analysis
 * Analyzes swap parameters for patterns associated with MEV, sandwich attacks,
 * or abnormal swap behavior that may harm liquidity providers.
 */

const { ReasonCodes } = require("../reasonCodes");

// Thresholds for suspicious swap patterns
const LARGE_SWAP_THRESHOLD_ETH = "50";  // > 50 ETH equivalent triggers scrutiny
const MICRO_SWAP_THRESHOLD_WEI = "1000"; // Very small swaps may be probing

/**
 * Analyze swap intent for suspicious patterns.
 * @param {object} params
 * @param {string} params.amountSpecified - Amount in wei string
 * @param {boolean} params.zeroForOne - Direction
 * @param {string} params.sender - Initiator address
 * @returns {{ signals: Array<{ type: string, reason: string, score: number }> }}
 */
function analyzeSwapIntent({ amountSpecified, zeroForOne, sender }) {
  const signals = [];

  if (!amountSpecified) return { signals };

  const absAmount = amountSpecified.startsWith("-")
    ? amountSpecified.slice(1)
    : amountSpecified;

  // Very large swaps may indicate whale manipulation or sandwich setup
  try {
    const amountBigInt = BigInt(absAmount);
    const largeThreshold = BigInt(LARGE_SWAP_THRESHOLD_ETH) * BigInt(10 ** 18);
    const microThreshold = BigInt(MICRO_SWAP_THRESHOLD_WEI);

    if (amountBigInt > largeThreshold) {
      signals.push({
        type: "SWAP_INTENT",
        reasonCode: ReasonCodes.SWAP_LARGE,
        reason: "Unusually large swap amount — potential whale manipulation or sandwich bait",
        score: 15,
      });
    }

    if (amountBigInt > BigInt(0) && amountBigInt < microThreshold) {
      signals.push({
        type: "SWAP_INTENT",
        reasonCode: ReasonCodes.SWAP_MICRO,
        reason: "Micro swap — potential probing or dust attack",
        score: 10,
      });
    }
  } catch (_) {
    // If parsing fails, skip
  }

  // Check if sender is a contract (heuristic: zero-prefix or known patterns)
  if (sender && sender.toLowerCase() !== sender) {
    // Noop — just normalize
  }

  return { signals };
}

module.exports = { analyzeSwapIntent };
