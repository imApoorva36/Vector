/**
 * Copy contract ABIs to subgraph/abis for The Graph.
 * Run after: npx hardhat compile
 *
 *   node scripts/copy-abis.js
 */

const fs = require("fs");
const path = require("path");

const ARTIFACTS = path.join(__dirname, "../artifacts/contracts");
const OUT = path.join(__dirname, "../../subgraph/abis");

const CONTRACTS = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];

function main() {
  if (!fs.existsSync(ARTIFACTS)) {
    console.error("Run 'npx hardhat compile' first.");
    process.exit(1);
  }
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  for (const name of CONTRACTS) {
    // Hardhat artifact path: artifacts/contracts/VectorHook.sol/VectorHook.json
    const artifactPath = path.join(ARTIFACTS, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(artifactPath)) {
      console.warn(`Skip ${name} (not found at ${artifactPath})`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiOnly = JSON.stringify(artifact.abi, null, 2);
    fs.writeFileSync(path.join(OUT, `${name}.json`), abiOnly);
    console.log(`Written subgraph/abis/${name}.json`);
  }
  console.log("VectorReactiveCallback is in reactive/; copy manually if needed.");
}

main();
