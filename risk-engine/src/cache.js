/**
 * In-memory TTL cache for risk assessment results.
 * Keyed on poolId:token + chainId — avoids hammering GoPlus/RPC.
 * TTL: 5 minutes (matches attestation expiry window).
 * Reused from Axiom's cache pattern.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const _cache = new Map();

function getCached(key, chainId) {
  const fullKey = `${(key || "").toLowerCase()}:${chainId}`;
  const entry = _cache.get(fullKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(fullKey);
    return null;
  }
  return entry.value;
}

function setCached(key, chainId, value, ttlMs = DEFAULT_TTL_MS) {
  const fullKey = `${(key || "").toLowerCase()}:${chainId}`;
  _cache.set(fullKey, { value, expiresAt: Date.now() + ttlMs });
}

function invalidateAll() {
  _cache.clear();
}

function invalidate(key) {
  const prefix = (key || "").toLowerCase();
  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k);
  }
}

function size() {
  return _cache.size;
}

module.exports = { getCached, setCached, invalidateAll, invalidate, size };
