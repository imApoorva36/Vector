/**
 * Layer 3 — Token Threat Intelligence
 * Checks tokens against known malicious lists and GoPlus token security API.
 * Adapted from Axiom's threatIntel but focused on token-level risk (not address-level).
 */

// Known malicious/risky token patterns
const KNOWN_MALICIOUS_TOKENS = new Set([
  // Honeypot tokens (can't sell)
  "0x000000000000000000000000000000000000dead",
  // Add specific known scam tokens here
]);

// Known rug-pull token deployer addresses
const KNOWN_RUG_DEPLOYERS = new Set([
  // Placeholder — populated from threat intel feeds
]);

/**
 * Check hardcoded known-malicious token list.
 * @param {string} tokenAddress
 * @returns {{ signals: Array }}
 */
function checkKnownMaliciousTokens(tokenAddress) {
  const signals = [];
  const addr = (tokenAddress || "").toLowerCase();

  if (KNOWN_MALICIOUS_TOKENS.has(addr)) {
    signals.push({
      type: "THREAT_INTEL",
      reason: "Known malicious token",
      score: 95,
    });
  }

  return { signals };
}

/**
 * Fetch GoPlus token security data.
 * @param {string} tokenAddress
 * @param {number} chainId
 * @returns {Promise<{ signals: Array }>}
 */
async function fetchGoPlusTokenSecurity(tokenAddress, chainId) {
  const signals = [];
  const addr = (tokenAddress || "").toLowerCase();
  if (!addr || !addr.startsWith("0x")) return { signals };

  // Map chain IDs to GoPlus chain identifiers
  const chainMap = { 1: "1", 8453: "8453", 10: "10", 42161: "42161", 84532: "84532" };
  const gpChain = chainMap[chainId] || "1";

  const url = `https://api.gopluslabs.io/api/v1/token_security/${gpChain}?contract_addresses=${addr}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { signals };
    const data = await res.json();
    const result = data.result?.[addr.toLowerCase()];
    if (!result) return { signals };

    // Honeypot detection
    if (result.is_honeypot === "1") {
      signals.push({ type: "THREAT_INTEL", reason: "Honeypot token (GoPlus)", score: 90 });
    }

    // Can't sell
    if (result.cannot_sell_all === "1" || result.cannot_buy === "1") {
      signals.push({ type: "THREAT_INTEL", reason: "Token trading restricted (GoPlus)", score: 80 });
    }

    // High buy/sell tax
    const buyTax = parseFloat(result.buy_tax || "0");
    const sellTax = parseFloat(result.sell_tax || "0");
    if (buyTax > 0.1 || sellTax > 0.1) {
      signals.push({
        type: "THREAT_INTEL",
        reason: `High token tax: buy=${(buyTax * 100).toFixed(1)}% sell=${(sellTax * 100).toFixed(1)}%`,
        score: 30,
      });
    }

    // Owner can change balance
    if (result.owner_change_balance === "1") {
      signals.push({ type: "THREAT_INTEL", reason: "Owner can change balances", score: 40 });
    }

    // Not open source
    if (result.is_open_source === "0") {
      signals.push({ type: "THREAT_INTEL", reason: "Token contract not open source", score: 15 });
    }

    // Has proxy
    if (result.is_proxy === "1") {
      signals.push({ type: "THREAT_INTEL", reason: "Token uses proxy pattern", score: 10 });
    }
  } catch (_) {
    // API failure — rely on other layers
  }

  return { signals };
}

/**
 * Run full token threat intel: hardcoded + GoPlus.
 * @param {string} tokenAddress
 * @param {number} chainId
 * @returns {Promise<{ signals: Array }>}
 */
async function runTokenThreatIntel(tokenAddress, chainId) {
  const { signals: local } = checkKnownMaliciousTokens(tokenAddress);
  if (local.length > 0) return { signals: local };

  const { signals: goplus } = await fetchGoPlusTokenSecurity(tokenAddress, chainId);
  return { signals: [...local, ...goplus] };
}

module.exports = { checkKnownMaliciousTokens, fetchGoPlusTokenSecurity, runTokenThreatIntel };
