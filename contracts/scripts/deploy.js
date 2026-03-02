/**
 * Deploy Vector contracts: VectorGovernance, VectorRiskRegistry, PolicyEngine, VectorHook.
 * Supports Base Sepolia and Unichain Sepolia.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network baseSepolia
 *   npx hardhat run scripts/deploy.js --network unichainSepolia
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Network:", hre.network.name);

  const VectorGovernance = await hre.ethers.getContractFactory("VectorGovernance");
  const VectorRiskRegistry = await hre.ethers.getContractFactory("VectorRiskRegistry");
  const PolicyEngine = await hre.ethers.getContractFactory("PolicyEngine");
  const VectorHook = await hre.ethers.getContractFactory("VectorHook");

  const gov = await VectorGovernance.deploy(deployer.address);
  await gov.waitForDeployment();
  const govAddress = await gov.getAddress();
  console.log("VectorGovernance:", govAddress);

  const registry = await VectorRiskRegistry.deploy(govAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("VectorRiskRegistry:", registryAddress);

  const policy = await PolicyEngine.deploy(govAddress);
  await policy.waitForDeployment();
  const policyAddress = await policy.getAddress();
  console.log("PolicyEngine:", policyAddress);

  const hook = await VectorHook.deploy(registryAddress, policyAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("VectorHook:", hookAddress);

  console.log("\n--- Summary ---");
  console.log("VectorGovernance:", govAddress);
  console.log("VectorRiskRegistry:", registryAddress);
  console.log("PolicyEngine:", policyAddress);
  console.log("VectorHook:", hookAddress);
  console.log("\nSet TEE signer: registry.setTEESigner(<teeSignerAddress>)");
  console.log("Set pool protection: registry.setPoolProtection(poolId, mode, blockThreshold, warnThreshold)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
