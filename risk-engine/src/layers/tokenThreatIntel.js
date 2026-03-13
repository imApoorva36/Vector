/**
 * Layer 3: Token threat intelligence. Checks tokens against known malicious lists and GoPlus token security API.
 */

const { ReasonCodes } = require("../reasonCodes");

const KNOWN_MALICIOUS_PATTERNS = {
  honeypot: [
    "0x000000000000000000000000000000000000dead",
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    "0xbeefbabebebefbabebeefbabeebeefbabeefbabe",
  ],
  drainers: [
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
    "0x98c3d3183c4b8a650614ad179a1a98be0a8d6b8e",
    "0x55dc85836f4b41ad1e7b5fde3b2c13c4a7b5e61a",
    "0x00000000003b3cc22af3ae1eac0440bcee416b40",
  ],
  phishing: [
    "0xbadc0debadc0debadc0debadc0debadc0deba000",
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  ],
  tornadoCash: [
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
    "0x722122df12d4e14e13ac3b6895a86e84145b6967",
    "0xdd4c48c0b24039969fc16d1cdf626eab821d3384",
    "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3",
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
    "0xa160cdab225685da1d56aa342ad8841c3b53f291",
    "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144",
  ],
};

const CATEGORY_REASON_CODE = {
  honeypot: ReasonCodes.THREAT_HONEYPOT,
  drainers: ReasonCodes.THREAT_KNOWN_DRAINER,
  phishing: ReasonCodes.THREAT_KNOWN_PHISHING,
  tornadoCash: ReasonCodes.THREAT_TORNADO,
};

/**
 * Check hardcoded known-malicious token list.
 * @param {string} tokenAddress
 * @returns {{ signals: Array }}
 */
function checkKnownMaliciousTokens(tokenAddress) {
  const signals = [];
  const addr = (tokenAddress || "").toLowerCase();

  for (const [category, list] of Object.entries(KNOWN_MALICIOUS_PATTERNS)) {
    if (list.includes(addr)) {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: CATEGORY_REASON_CODE[category] || ReasonCodes.THREAT_MALICIOUS,
        reason: `Known ${category} token`,
        score: 95,
      });
      break;
    }
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

  // Map chain IDs to GoPlus chain identifiers.
  // Unichain Sepolia (1301) is not yet supported by GoPlus; skip to avoid wrong-chain data.
  const chainMap = { 1: "1", 8453: "8453", 10: "10", 42161: "42161", 84532: "84532" };
  if (!chainMap[chainId]) return { signals };
  const gpChain = chainMap[chainId];

  const url = `https://api.gopluslabs.io/api/v1/token_security/${gpChain}?contract_addresses=${addr}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { signals };
    const data = await res.json();
    const result = data.result?.[addr.toLowerCase()];
    if (!result) return { signals };

    // Honeypot detection
    if (result.is_honeypot === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_HONEYPOT,
        reason: "Honeypot token (GoPlus)",
        score: 90,
      });
    }

    // Can't sell/buy indicates likely honeypot or transfer restrictions
    if (result.cannot_sell_all === "1" || result.cannot_buy === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_TRADING_RESTRICTED,
        reason: "Token trading restricted (GoPlus)",
        score: 80,
      });
    }

    // High buy/sell tax
    const buyTax = parseFloat(result.buy_tax || "0");
    const sellTax = parseFloat(result.sell_tax || "0");
    if (buyTax > 0.1 || sellTax > 0.1) {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_TAX,
        reason: `High token tax: buy=${(buyTax * 100).toFixed(1)}% sell=${(sellTax * 100).toFixed(1)}%`,
        score: 30,
      });
    }

    // Owner can change balance
    if (result.owner_change_balance === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_OWNER_CHANGE,
        reason: "Owner can change balances",
        score: 40,
      });
    }

    // Not open source
    if (result.is_open_source === "0") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_NOT_OPEN_SOURCE,
        reason: "Token contract not open source",
        score: 15,
      });
    }

    // Has proxy
    if (result.is_proxy === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_PROXY,
        reason: "Token uses proxy pattern",
        score: 10,
      });
    }

    if (result.mintable === "1" || result.mint_able === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_MINTABLE,
        reason: "Token supply is mintable",
        score: 20,
      });
    }

    if (result.can_take_back_ownership === "1" || result.owner_take_back_ownership === "1" || result.burn_able === "1") {
      signals.push({
        type: "THREAT_INTEL",
        reasonCode: ReasonCodes.THREAT_BURNABLE,
        reason: "Token has owner-privileged burn/reclaim controls",
        score: 15,
      });
    }
  } catch (_) {
    // API failure: rely on other layers
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
