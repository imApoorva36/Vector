/**
 * Test risk engine with demo scenarios. Run from frontend: node scripts/test-risk-scenarios.js
 */

const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.RPC_URL || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const assessSwapRisk = require("../src/lib/risk-engine").assessSwapRisk;

  const poolId = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const chainId = 84532; // Base Sepolia
  const amount = "1000000000000000000";
  const sender = "0x0000000000000000000000000000000000000001";
  const zeroForOne = true;

  // 1) ALLOW: USDC + WETH (both allowlisted)
  const allowPayload = {
    poolId,
    token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    zeroForOne,
    amountSpecified: amount,
    sender,
    chainId,
    provider,
  };
  const allowResult = await assessSwapRisk(allowPayload);
  console.log("ALLOW scenario (USDC + WETH):", allowResult.decision, "score:", allowResult.riskScore);

  // 2) BLOCK: known malicious (0xdead in honeypot list)
  const blockPayload = {
    poolId,
    token0: "0x000000000000000000000000000000000000dead",
    token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    zeroForOne,
    amountSpecified: amount,
    sender,
    chainId,
    provider,
  };
  const blockResult = await assessSwapRisk(blockPayload);
  console.log("BLOCK scenario (0xdead):", blockResult.decision, "score:", blockResult.riskScore);

  // 3) WARN: chainId 1301 so GoPlus skipped; token1 = EOA (we're receiving it) -> on-chain EOA 50 = WARN.
  const warnChainId = 1301;
  const warnEoaAddress = "0x1234567890123456789012345678901234567890";
  const warnPayload = {
    poolId,
    token0: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    token1: warnEoaAddress,
    zeroForOne: true,
    amountSpecified: amount,
    sender,
    chainId: warnChainId,
    provider,
  };
  const warnResult = await assessSwapRisk(warnPayload);
  console.log("WARN scenario (chainId 1301, receive EOA):", warnResult.decision, "score:", warnResult.riskScore);
  if (warnResult.decision !== "WARN") {
    console.log("  signals:", warnResult.signals?.map((s) => ({ type: s.type, score: s.score })));
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
