/**
 * Layer 4: On-chain pool and token signals.
 */

const { ethers } = require("ethers");
const { ReasonCodes } = require("../reasonCodes");

const REGISTRY_BLACKLIST_ABI = [
  {
    name: "isBlacklisted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
];

const DEFAULT_REGISTRY_BY_CHAIN = {
  31337: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  84532: "0x4cab8F4e0e1DF0dE30C112895C094F1C590d16e3",
  1301: "0x9b61454a7e07191AD3F5f0dbA337EA3c5b4cB943",
};

function resolveBlacklistRegistryAddress(chainId) {
  return DEFAULT_REGISTRY_BY_CHAIN[chainId] || null;
}

async function getPoolOnChainSignals({ token0, token1, targetToken, provider, chainId }) {
  const signals = [];
  if (!provider || !targetToken) return { signals };

  try {
    const registryAddress = resolveBlacklistRegistryAddress(chainId);
    if (registryAddress) {
      try {
        const registry = new ethers.Contract(registryAddress, REGISTRY_BLACKLIST_ABI, provider);
        const isBlacklisted = await registry.isBlacklisted(targetToken);
        if (isBlacklisted) {
          signals.push({
            type: "ONCHAIN",
            reasonCode: ReasonCodes.ONCHAIN_SENTINEL,
            reason: "Token is blacklisted in on-chain VectorRiskRegistry",
            score: 95,
          });
        }
      } catch (_) {
        // Blacklist lookup failure should not block scoring.
      }
    }

    const [code, txCount, balance] = await Promise.all([
      provider.getCode(targetToken),
      provider.getTransactionCount(targetToken),
      provider.getBalance(targetToken),
    ]);

    const isContract = code && code !== "0x";

    if (!isContract) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_EOA,
        reason: "Target token is not a contract (EOA); invalid token",
        score: 50,
      });
      return { signals };
    }

    const bytecodeLen = (code.length - 2) / 2;
    if (bytecodeLen < 100) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_SMALL_BYTECODE,
        reason: "Token contract has very small bytecode; possible proxy/stub",
        score: 15,
      });
    }

    if (txCount === 0) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_FRESH,
        reason: "Token contract has zero transactions; freshly deployed",
        score: 25,
      });
    } else if (txCount <= 5) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_LOW_TX,
        reason: `Token contract has very few transactions (${txCount})`,
        score: 15,
      });
    } else if (txCount > 10000) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_ESTABLISHED,
        reason: "Token has >10k transactions; established",
        score: -10,
      });
    }

    const balanceEth = parseFloat(ethers.formatEther(balance || "0"));
    if (txCount === 0 && balanceEth > 0.01) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_FRESH_PREFUNDED,
        reason: `Fresh token contract has prefunded ETH balance (${balanceEth.toFixed(4)} ETH)`,
        score: 20,
      });
    }

    if (balanceEth > 100) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_LARGE_ETH_BALANCE,
        reason: `Token contract holds ${balanceEth.toFixed(2)} ETH; unusual`,
        score: 10,
      });
    }
  } catch (_) {
    // RPC failure: do not penalize
  }

  return { signals };
}

module.exports = { getPoolOnChainSignals };
