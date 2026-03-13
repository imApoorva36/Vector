/**
 * Layer 4: On-chain pool and token signals
 * Fetches on-chain data about target tokens: contract vs EOA, tx count, code size,
 * balance, and token age indicators.
 * Targeted at token/pool context.
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
  84532: "0x2478f2e45b9eF70EFb28f5fFFf4F695C14363B91",
  1301: "0x27142bFCa9Ac9B7FaE773d46656deBF4f4E39aAe",
};

function resolveBlacklistRegistryAddress(chainId) {
  return DEFAULT_REGISTRY_BY_CHAIN[chainId] || null;
}

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

    // Token should be a contract
    if (!isContract) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_EOA,
        reason: "Target token is not a contract (EOA); invalid token",
        score: 50,
      });
      return { signals };
    }

    // Very small bytecode: possible minimal proxy or stub
    const bytecodeLen = (code.length - 2) / 2;
    if (bytecodeLen < 100) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_SMALL_BYTECODE,
        reason: "Token contract has very small bytecode; possible proxy/stub",
        score: 15,
      });
    }

    // Fresh contract with zero transactions
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
      // Well-established token: trust signal
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_ESTABLISHED,
        reason: "Token has >10k transactions; established",
        score: -10,
      });
    }

    // Fresh + prefunded contracts can indicate pre-positioned attack infrastructure.
    const balanceEth = parseFloat(ethers.formatEther(balance || "0"));
    if (txCount === 0 && balanceEth > 0.01) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_FRESH_PREFUNDED,
        reason: `Fresh token contract has prefunded ETH balance (${balanceEth.toFixed(4)} ETH)`,
        score: 20,
      });
    }

    // Large ETH balance on token contract is unusual (flash loan risk?)
    if (balanceEth > 100) {
      signals.push({
        type: "ONCHAIN",
        reasonCode: ReasonCodes.ONCHAIN_LARGE_ETH_BALANCE,
        reason: `Token contract holds ${balanceEth.toFixed(2)} ETH; unusual for token contracts`,
        score: 10,
      });
    }
  } catch (_) {
    // RPC failure: do not penalize
  }

  return { signals };
}

module.exports = { getPoolOnChainSignals };
