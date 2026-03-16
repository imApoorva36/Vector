/**
 * Deploy Vector contracts: VectorGovernance, VectorRiskRegistry, PolicyEngine, VectorHook, VectorReactiveCallback.
 * Writes addresses to deployments/<network>.json and optionally updates subgraph/frontend.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network baseSepolia
 *   npx hardhat run scripts/deploy.js --network unichainSepolia
 *   npx hardhat run scripts/deploy.js  # hardhat (in-process) for local
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Network:", hre.network.name);

  const VectorGovernance = await hre.ethers.getContractFactory("VectorGovernance");
  const VectorRiskRegistry = await hre.ethers.getContractFactory("VectorRiskRegistry");
  const PolicyEngine = await hre.ethers.getContractFactory("PolicyEngine");
  const VectorHook = await hre.ethers.getContractFactory("VectorHook");
  const VectorReactiveCallback = await hre.ethers.getContractFactory("VectorReactiveCallback");

  const gov = await VectorGovernance.deploy(deployer.address);
  await gov.waitForDeployment();
  const govAddress = await gov.getAddress();
  console.log("VectorGovernance:", govAddress);

  // Use the deployer EOA as the owner for admin-only actions (pool protection, thresholds, signer config).
  // Governance is deployed for future consolidation, but it does not currently forward calls.
  const registry = await VectorRiskRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("VectorRiskRegistry:", registryAddress);

  const policy = await PolicyEngine.deploy(deployer.address);
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();
  console.log("PolicyEngine:", policyAddress);

  const hook = await VectorHook.deploy(registryAddress, policyAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("VectorHook:", hookAddress);

  let hookV4Address = null;
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS;
  if (poolManagerAddress) {
    const VectorHookV4 = await hre.ethers.getContractFactory("VectorHookV4");
    const hookV4 = await VectorHookV4.deploy(poolManagerAddress, hookAddress);
    await hookV4.waitForDeployment();
    hookV4Address = await hookV4.getAddress();
    console.log("VectorHookV4:", hookV4Address);
  } else {
    console.log("VectorHookV4: skipped (set POOL_MANAGER_ADDRESS to deploy)");
  }

  const callback = await VectorReactiveCallback.deploy();
  await callback.waitForDeployment();
  const callbackAddress = await callback.getAddress();
  console.log("VectorReactiveCallback:", callbackAddress);

  const addresses = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    VectorGovernance: govAddress,
    VectorRiskRegistry: registryAddress,
    PolicyEngine: policyAddress,
    VectorHook: hookAddress,
    VectorHookV4: hookV4Address || undefined,
    VectorReactiveCallback: callbackAddress,
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));
  console.log("Wrote", outFile);

  console.log("\n--- Summary ---");
  console.log("VectorGovernance:", govAddress);
  console.log("VectorRiskRegistry:", registryAddress);
  console.log("PolicyEngine:", policyAddress);
  console.log("VectorHook:", hookAddress);
  console.log("VectorReactiveCallback:", callbackAddress);
  console.log("\nNext: npm run copy-abis && node scripts/update-subgraph-addresses.js " + hre.network.name);
  console.log("Set TEE signer: registry.setTEESigner(<teeSignerAddress>)");
  console.log("Set pool protection: registry.setPoolProtection(poolId, mode, blockThreshold, warnThreshold)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
