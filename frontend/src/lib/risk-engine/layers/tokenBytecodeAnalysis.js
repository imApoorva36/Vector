/**
 * Layer 5: Token bytecode analysis.
 */

function analyzeTokenBytecode(bytecode) {
  const signals = [];
  if (!bytecode || bytecode === "0x") return { signals };

  const raw = (bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode).toLowerCase();
  const len = raw.length / 2;

  let selfDestructCount = 0;
  for (let i = 0; i < raw.length - 1; i += 2) {
    if (raw[i] === "f" && raw[i + 1] === "f") selfDestructCount++;
  }
  if (selfDestructCount > 0) {
    signals.push({ type: "BYTECODE", reason: "SELFDESTRUCT opcode detected in token contract", score: 20 });
  }

  let delegateCallCount = 0;
  for (let i = 0; i < raw.length - 1; i += 2) {
    if (raw[i] === "f" && raw[i + 1] === "4") delegateCallCount++;
  }
  if (len > 0 && delegateCallCount >= 3 && delegateCallCount / len > 0.01) {
    signals.push({ type: "BYTECODE", reason: "High DELEGATECALL density; potential proxy/hijack", score: 15 });
  }

  if (len > 0 && len < 100) {
    signals.push({ type: "BYTECODE", reason: "Minimal proxy / very small bytecode", score: 15 });
  }

  if (len > 25000) {
    signals.push({ type: "BYTECODE", reason: "Very large bytecode (>25KB); complex contract", score: 5 });
  }

  return { signals };
}

module.exports = { analyzeTokenBytecode };
