/**
 * Layer 5 — Token Bytecode Analysis
 * Scans token contract bytecode for dangerous opcodes and patterns.
 * Same pattern as Axiom's bytecodeAnalysis but focused on ERC-20 token context.
 */

/**
 * Analyze token bytecode for risk indicators.
 * @param {string} bytecode - Hex string (0x-prefixed)
 * @returns {{ signals: Array<{ type: string, reason: string, score: number }> }}
 */
function analyzeTokenBytecode(bytecode) {
  const signals = [];
  if (!bytecode || bytecode === "0x") return { signals };

  const raw = (bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode).toLowerCase();
  const len = raw.length / 2;

  // SELFDESTRUCT (0xff) — escape hatch for rug pulls
  // Count occurrences (approximate — may count false positives in data sections)
  let selfDestructCount = 0;
  for (let i = 0; i < raw.length - 1; i += 2) {
    if (raw[i] === "f" && raw[i + 1] === "f") selfDestructCount++;
  }
  if (selfDestructCount > 0) {
    signals.push({
      type: "BYTECODE",
      reason: "SELFDESTRUCT opcode detected in token contract",
      score: 20,
    });
  }

  // DELEGATECALL density — proxy/upgrade pattern (might allow arbitrary logic)
  let delegateCallCount = 0;
  for (let i = 0; i < raw.length - 1; i += 2) {
    if (raw[i] === "f" && raw[i + 1] === "4") delegateCallCount++;
  }
  if (len > 0 && delegateCallCount >= 3 && delegateCallCount / len > 0.01) {
    signals.push({
      type: "BYTECODE",
      reason: "High DELEGATECALL density — potential proxy/hijack",
      score: 15,
    });
  }

  // Very small contract — minimal proxy pattern
  if (len > 0 && len < 100) {
    signals.push({
      type: "BYTECODE",
      reason: "Minimal proxy / very small bytecode",
      score: 15,
    });
  }

  // Very large contract — could hide complexity
  if (len > 25000) {
    signals.push({
      type: "BYTECODE",
      reason: "Very large bytecode (>25KB) — complex contract",
      score: 5,
    });
  }

  return { signals };
}

module.exports = { analyzeTokenBytecode };
