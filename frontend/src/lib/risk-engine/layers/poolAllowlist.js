/**
 * Layer 1: Pool and token allowlist. Trusted pools/tokens get risk score 0.
 */

const TRUSTED_TOKENS = new Set([
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI
  "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
]);

const TRUSTED_POOLS = new Set([]);

function checkPoolAllowlist(poolId, token0, token1, chainId) {
  const t0 = (token0 || "").toLowerCase();
  const t1 = (token1 || "").toLowerCase();
  const pid = (poolId || "").toLowerCase();

  if (TRUSTED_POOLS.has(pid)) {
    return { allowed: true, reason: "Trusted pool (allowlist)", reasonCode: "ALLOWLIST_POOL" };
  }

  if (TRUSTED_TOKENS.has(t0) && TRUSTED_TOKENS.has(t1)) {
    return { allowed: true, reason: "Both tokens on trusted allowlist", reasonCode: "ALLOWLIST_TOKENS" };
  }

  return { allowed: false };
}

module.exports = { checkPoolAllowlist, TRUSTED_TOKENS, TRUSTED_POOLS };
