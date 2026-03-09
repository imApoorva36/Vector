/**
 * Layer 4: On-chain pool and token signals.
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

    if (!isContract) {
      signals.push({ type: "ONCHAIN", reason: "Target token is not a contract (EOA); invalid token", score: 50 });
      return { signals };
    }

    const bytecodeLen = (code.length - 2) / 2;
    if (bytecodeLen < 100) {
      signals.push({ type: "ONCHAIN", reason: "Token contract has very small bytecode; possible proxy/stub", score: 15 });
    }

    if (txCount === 0) {
      signals.push({ type: "ONCHAIN", reason: "Token contract has zero transactions; freshly deployed", score: 25 });
    } else if (txCount <= 5) {
      signals.push({ type: "ONCHAIN", reason: `Token contract has very few transactions (${txCount})`, score: 15 });
    } else if (txCount > 10000) {
      signals.push({ type: "ONCHAIN", reason: "Token has >10k transactions; established", score: -10 });
    }

    const { ethers } = require("ethers");
    const balanceEth = parseFloat(ethers.formatEther(balance || "0"));
    if (balanceEth > 100) {
      signals.push({ type: "ONCHAIN", reason: `Token contract holds ${balanceEth.toFixed(2)} ETH; unusual`, score: 10 });
    }
  } catch (_) {
    // RPC failure: do not penalize
  }

  return { signals };
}

module.exports = { getPoolOnChainSignals };
