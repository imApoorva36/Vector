/**
 * Vector Risk Engine - Main orchestrator
 *
 * Layers:
 *   1. Pool Allowlist: trusted pools/tokens get score 0 (fast exit)
 *   2. Swap Intent: analyze swap parameters for suspicious patterns
 *   3. Token Threat Intel: GoPlus + hardcoded malicious token lists
 *   4. On-Chain Pool Signals: liquidity depth, concentration, freshness
 *   5. Bytecode Analysis: token contract bytecode for dangerous opcodes
 *
 * Returns: { riskScore, decision, signals[], timestamp }
 */

const { ReasonCodes } = require("./reasonCodes");
const { checkPoolAllowlist } = require("./layers/poolAllowlist");
const { analyzeSwapIntent } = require("./layers/swapIntent");
const { runTokenThreatIntel } = require("./layers/tokenThreatIntel");
const { getPoolOnChainSignals } = require("./layers/poolOnChainSignals");
const { analyzeTokenBytecode } = require("./layers/tokenBytecodeAnalysis");
const { getCached, setCached } = require("./cache");

/**
 * Assess risk for a swap on a specific pool.
 * @param {object} params
 * @param {string} params.poolId - Pool identifier (bytes32 hex)
 * @param {string} params.token0 - Token 0 address
 * @param {string} params.token1 - Token 1 address
 * @param {boolean} params.zeroForOne - Swap direction
 * @param {string} params.amountSpecified - Swap amount (wei string)
 * @param {string} params.sender - Swap initiator address
 * @param {number} params.chainId - Chain ID
 * @param {object} [params.provider] - ethers.js provider (optional)
 * @returns {Promise<object>} Risk assessment result
 */
async function assessSwapRisk(params) {
  const {
    poolId,
    token0,
    token1,
    zeroForOne,
    amountSpecified,
    sender,
    chainId = 1,
    provider,
  } = params;

  const signals = [];

  // ── Layer 1: Pool/Token Allowlist ──
  const allow = checkPoolAllowlist(poolId, token0, token1, chainId);
  if (allow.allowed) {
    return {
      poolId,
      riskScore: 0,
      decision: "ALLOW",
      signals: [{
        type: "ALLOWLIST",
        reasonCode: allow.reasonCode || ReasonCodes.ALLOWLIST_TOKENS,
        reason: allow.reason,
        score: 0,
      }],
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // ── Cache check ──
  const targetToken = zeroForOne ? token1 : token0;
  const cacheKey = `${poolId}:${targetToken}`;
  const cached = getCached(cacheKey, chainId);
  if (cached) return { ...cached, timestamp: Math.floor(Date.now() / 1000), cached: true };

  // ── Layer 2: Swap Intent Analysis ──
  const { signals: intentSignals } = analyzeSwapIntent({
    amountSpecified,
    zeroForOne,
    sender,
  });
  signals.push(...intentSignals);

  // ── Layer 3: Token Threat Intel — check both tokens (either side can be malicious) ──
  const { signals: threatSignals0 } = await runTokenThreatIntel(token0, chainId);
  const { signals: threatSignals1 } = token1 !== token0
    ? await runTokenThreatIntel(token1, chainId)
    : { signals: [] };
  signals.push(...threatSignals0, ...threatSignals1);

  // ── Layer 4 & 5: On-chain + bytecode (need provider) ──
  if (provider) {
    const { signals: poolSignals } = await getPoolOnChainSignals({
      token0,
      token1,
      targetToken,
      provider,
      chainId,
    });
    signals.push(...poolSignals);

    try {
      const code = await provider.getCode(targetToken);
      const { signals: bytecodeSignals } = analyzeTokenBytecode(code || "0x");
      signals.push(...bytecodeSignals);
    } catch (_) {}
  }

  const riskScore = Math.min(100, Math.max(0, signals.reduce((sum, s) => sum + (s.score || 0), 0)));
  const decision = riskScore >= 70 ? "BLOCK" : riskScore >= 31 ? "WARN" : "ALLOW";

  const result = {
    poolId,
    riskScore,
    decision,
    signals,
    timestamp: Math.floor(Date.now() / 1000),
  };

  setCached(cacheKey, chainId, result);
  return result;
}

module.exports = { assessSwapRisk };
