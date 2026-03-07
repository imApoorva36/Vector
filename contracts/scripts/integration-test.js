/**
 * Integration test: Risk API → attestation → hook.evaluateSwap (expect ALLOW).
 *
 * Prerequisites:
 *   1. Risk engine running with TEE_SIGNER_KEY (e.g. node risk-engine/src/server.js)
 *   2. Run against Hardhat node or a network where contracts are deployed
 *
 * Usage:
 *   # Terminal 1: start risk engine
 *   cd risk-engine && node src/server.js
 *
 *   # Terminal 2: start Hardhat node (optional, for local deploy)
 *   cd contracts && npx hardhat node
 *
 *   # Terminal 3: run integration test (deploys to localhost, then calls API + hook)
 *   cd contracts && RISK_API_URL=http://localhost:3001 npx hardhat run scripts/integration-test.js --network localhost
 *
 *   # Or with existing deployment (set HOOK_ADDRESS, REGISTRY_ADDRESS, POLICY_ADDRESS in .env)
 */

const { ethers } = require("hardhat");

const RISK_API_URL = process.env.RISK_API_URL || "http://localhost:3001";

async function main() {
  const [owner] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  // 1) Get signer address from risk engine (must match TEE_SIGNER_KEY)
  const healthRes = await fetch(`${RISK_API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Risk engine not reachable at ${RISK_API_URL}. Start it with: cd risk-engine && node src/server.js`);
  }
  const health = await healthRes.json();
  if (!health.signerConfigured) {
    throw new Error("Risk engine has no TEE_SIGNER_KEY. Set it in risk-engine/.env");
  }
  const teeSignerAddress = health.signerAddress;
  console.log("Risk engine signer:", teeSignerAddress);

  let hook;
  let registry;
  const hookAddress = process.env.HOOK_ADDRESS;
  const registryAddress = process.env.REGISTRY_ADDRESS;
  const policyAddress = process.env.POLICY_ADDRESS;

  if (hookAddress && registryAddress && policyAddress) {
    hook = await ethers.getContractAt("VectorHook", hookAddress);
    registry = await ethers.getContractAt("VectorRiskRegistry", registryAddress);
    console.log("Using existing deployment: Hook", hookAddress);
  } else {
    // Deploy fresh and configure
    const VectorRiskRegistry = await ethers.getContractFactory("VectorRiskRegistry");
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const VectorHook = await ethers.getContractFactory("VectorHook");
    registry = await VectorRiskRegistry.deploy(owner.address);
    const policy = await PolicyEngine.deploy(owner.address);
    hook = await VectorHook.deploy(await registry.getAddress(), await policy.getAddress());
    await registry.setTEESigner(teeSignerAddress);
    const poolIdConfig = ethers.zeroPadValue("0x01", 32);
    await registry.setPoolProtection(poolIdConfig, 1, 70, 31);
    console.log("Deployed Hook:", await hook.getAddress());
  }

  const poolId = ethers.zeroPadValue("0x01", 32);
  const sender = owner.address;
  const zeroForOne = true;
  const amountSpecified = 10n ** 18n;

  // 2) Get attestation from risk API
  const body = {
    poolId,
    token0: "0x" + "00".repeat(20),
    token1: "0x" + "00".repeat(20),
    zeroForOne,
    amountSpecified: amountSpecified.toString(),
    sender,
    chainId,
  };
  const riskRes = await fetch(`${RISK_API_URL}/api/risk-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!riskRes.ok) {
    const err = await riskRes.text();
    throw new Error(`Risk API error: ${riskRes.status} ${err}`);
  }
  const data = await riskRes.json();
  if (!data.attestation || !data.attestation.encodedAttestation) {
    throw new Error("API did not return attestation.encodedAttestation");
  }
  const hookData = data.attestation.encodedAttestation;

  // 3) Call hook
  const decision = await hook.evaluateSwap.staticCall(
    poolId,
    sender,
    zeroForOne,
    amountSpecified,
    hookData
  );
  if (decision !== 0) {
    throw new Error(`Expected ALLOW (0), got decision ${decision}`);
  }
  console.log("Integration test passed: hook.evaluateSwap returned ALLOW.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
