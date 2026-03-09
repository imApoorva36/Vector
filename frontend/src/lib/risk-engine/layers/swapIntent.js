/**
 * Layer 2: Swap intent analysis.
 */

const { ReasonCodes } = require("../reasonCodes");

const LARGE_SWAP_THRESHOLD_ETH = "50";
const MICRO_SWAP_THRESHOLD_WEI = "1000";

function analyzeSwapIntent({ amountSpecified, zeroForOne, sender }) {
  const signals = [];
  if (!amountSpecified) return { signals };

  const absAmount = amountSpecified.startsWith("-")
    ? amountSpecified.slice(1)
    : amountSpecified;

  try {
    const amountBigInt = BigInt(absAmount);
    const largeThreshold = BigInt(LARGE_SWAP_THRESHOLD_ETH) * BigInt(10 ** 18);
    const microThreshold = BigInt(MICRO_SWAP_THRESHOLD_WEI);

    if (amountBigInt > largeThreshold) {
      signals.push({
        type: "SWAP_INTENT",
        reasonCode: ReasonCodes.SWAP_LARGE,
        reason: "Unusually large swap amount; potential whale manipulation or sandwich bait",
        score: 15,
      });
    }

    if (amountBigInt > BigInt(0) && amountBigInt < microThreshold) {
      signals.push({
        type: "SWAP_INTENT",
        reasonCode: ReasonCodes.SWAP_MICRO,
        reason: "Micro swap; potential probing or dust attack",
        score: 10,
      });
    }
  } catch (_) {
    // If parsing fails, skip
  }

  return { signals };
}

module.exports = { analyzeSwapIntent };
