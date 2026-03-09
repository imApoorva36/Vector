/**
 * Integration test: Risk API → attestation → hook.evaluateSwap (expect ALLOW).
 *
 * Prerequisites:
 *   1. Frontend running with TEE_SIGNER_KEY set (the built-in /api/risk-score handles attestation)
 *   2. Run against Hardhat node or a network where contracts are deployed
 *
 * Usage:
 *   # Terminal 1: start frontend (with TEE_SIGNER_KEY env var)
 *   cd frontend && TEE_SIGNER_KEY=0x... npm run dev
 *
 *   # Terminal 2: start Hardhat node (optional, for local deploy)
 *   cd contracts && npx hardhat node
 *
 *   # Terminal 3: run integration test
 *   cd contracts && npx hardhat run scripts/integration-test.js --network localhost
 *
 *   # Override API URL if frontend runs on a different port:
 *   RISK_API_URL=http://localhost:3000 npx hardhat run scripts/integration-test.js --network localhost
 *
 *   # Or point to the deployed Vercel frontend:
 *   RISK_API_URL=https://your-app.vercel.app npx hardhat run scripts/integration-test.js --network baseSepolia
 *
 *   # Or with existing deployment (set HOOK_ADDRESS, REGISTRY_ADDRESS, POLICY_ADDRESS in .env)
 */

const { ethers } = require("hardhat");

const RISK_API_URL = process.env.RISK_API_URL || "http://localhost:3000";

async function main() {
  const [owner] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  // 1) Get signer address from risk engine (must match TEE_SIGNER_KEY)
  const healthRes = await fetch(`${RISK_API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Risk API not reachable at ${RISK_API_URL}. Start the frontend: cd frontend && npm run dev`);
  }
  const health = await healthRes.json();
  if (!health.signerConfigured) {
    throw new Error("TEE_SIGNER_KEY not set. Add it to frontend/.env");
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
    // Use trusted tokens so the allowlist layer returns ALLOW deterministically.
    token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
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
  if (decision !== 0n) {
    throw new Error(`Expected ALLOW (0), got decision ${decision}`);
  }
  console.log("Integration test passed: hook.evaluateSwap returned ALLOW.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
