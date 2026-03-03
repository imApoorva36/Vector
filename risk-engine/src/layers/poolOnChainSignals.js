/**
 * Layer 4 — On-Chain Pool & Token Signals
 * Fetches on-chain data about target tokens: contract vs EOA, tx count, code size,
 * balance, and token age indicators.
 * Adapted from Axiom's onchainSignals but targeted at token/pool context.
 */

/**
 * Fetch on-chain signals for a token in a pool context.
 * @param {object} params
 * @param {string} params.token0
 * @param {string} params.token1
 * @param {string} params.targetToken - The token being received
 * @param {object} params.provider - ethers.js provider
 * @param {number} params.chainId
 * @returns {Promise<{ signals: Array }>}
 */
async function getPoolOnChainSignals({ token0, token1, targetToken, provider, chainId }) {
  const signals = [];
  if (!provider || !targetToken) return { signals };

  try {
    const [code, txCount, balance] = await Promise.all([
      provider.getCode(targetToken),
      provider.getTransactionCount(targetToken),
      provider.getBalance(targetToken),
    ]);

    const isContract = code && code !== "0x";

    // Token should be a contract
    if (!isContract) {
      signals.push({
        type: "ONCHAIN",
        reason: "Target token is not a contract (EOA) — invalid token",
        score: 50,
      });
      return { signals };
    }

    // Very small bytecode — possible minimal proxy or stub
    const bytecodeLen = (code.length - 2) / 2;
    if (bytecodeLen < 100) {
      signals.push({
        type: "ONCHAIN",
        reason: "Token contract has very small bytecode — possible proxy/stub",
        score: 15,
      });
    }

    // Fresh contract with zero transactions
    if (txCount === 0) {
      signals.push({
        type: "ONCHAIN",
        reason: "Token contract has zero transactions — freshly deployed",
        score: 25,
      });
    } else if (txCount <= 5) {
      signals.push({
        type: "ONCHAIN",
        reason: `Token contract has very few transactions (${txCount})`,
        score: 15,
      });
    } else if (txCount > 10000) {
      // Well-established token: trust signal
      signals.push({
        type: "ONCHAIN",
        reason: "Token has >10k transactions — established",
        score: -10,
      });
    }

    // Large ETH balance on token contract is unusual (flash loan risk?)
    const { ethers } = require("ethers");
    const balanceEth = parseFloat(ethers.formatEther(balance || "0"));
    if (balanceEth > 100) {
      signals.push({
        type: "ONCHAIN",
        reason: `Token contract holds ${balanceEth.toFixed(2)} ETH — unusual for token contracts`,
        score: 10,
      });
    }
  } catch (_) {
    // RPC failure — don't penalize
  }

  return { signals };
}

module.exports = { getPoolOnChainSignals };
