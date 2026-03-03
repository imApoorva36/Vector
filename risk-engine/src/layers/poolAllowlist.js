/**
 * Layer 1 — Pool & Token Allowlist
 * Trusted pools/tokens get risk score 0 and skip all further analysis.
 * Adapted from Axiom's protocol allowlist but focused on Uniswap v4 pool context.
 */

// Well-known trusted token addresses (lowercase)
const TRUSTED_TOKENS = new Set([
  // USDC
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  // USDT
  "0xdac17f958d2ee523a2206206994597c13d831ec7",
  // WETH
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  // WBTC
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
  // DAI
  "0x6b175474e89094c44da98b954eedeac495271d0f",
  // UNI
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
  // LINK
  "0x514910771af9ca656af840dff83e8264ecf986ca",
]);

// Pool IDs of well-known audited pools (can be populated per-chain)
const TRUSTED_POOLS = new Set([
  // Add trusted pool IDs here as they're deployed
]);

/**
 * Check if pool or tokens are in the trusted allowlist.
 * @param {string} poolId
 * @param {string} token0
 * @param {string} token1
 * @param {number} chainId
 * @returns {{ allowed: boolean, reason?: string }}
 */
function checkPoolAllowlist(poolId, token0, token1, chainId) {
  const t0 = (token0 || "").toLowerCase();
  const t1 = (token1 || "").toLowerCase();
  const pid = (poolId || "").toLowerCase();

  if (TRUSTED_POOLS.has(pid)) {
    return { allowed: true, reason: "Trusted pool (allowlist)" };
  }

  // Both tokens must be trusted for auto-allow
  if (TRUSTED_TOKENS.has(t0) && TRUSTED_TOKENS.has(t1)) {
    return { allowed: true, reason: "Both tokens on trusted allowlist" };
  }

  return { allowed: false };
}

module.exports = { checkPoolAllowlist, TRUSTED_TOKENS, TRUSTED_POOLS };
