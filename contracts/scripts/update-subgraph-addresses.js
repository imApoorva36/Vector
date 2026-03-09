/**
 * Update subgraph.yaml with contract addresses from deployments/<network>.json.
 * Run after deploy: node scripts/update-subgraph-addresses.js [network]
 * Networks: baseSepolia (updates base-sepolia sources), unichainSepolia (updates unichain-sepolia sources), hardhat (updates base-sepolia)
 */

const fs = require("fs");
const path = require("path");

const deploymentsDir = path.join(__dirname, "../deployments");
const subgraphYamlPath = path.join(__dirname, "../../subgraph/subgraph.yaml");

const BASE_CONTRACTS = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];
const UNICHAIN_CONTRACTS = ["VectorHook_Unichain", "PolicyEngine_Unichain", "VectorRiskRegistry_Unichain", "VectorReactiveCallback_Unichain"];
const ADDRESS_KEYS = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];

function main() {
  const network = process.argv[2] || process.env.NETWORK || "baseSepolia";
  const isUnichain = network === "unichainSepolia";
  const dataSourceNames = isUnichain ? UNICHAIN_CONTRACTS : BASE_CONTRACTS;
  const graphNetwork = isUnichain ? "unichain-sepolia" : "base-sepolia";

  let jsonPath = path.join(deploymentsDir, `${network}.json`);
  if (!fs.existsSync(jsonPath)) {
    const first = fs.readdirSync(deploymentsDir).find((f) => f.endsWith(".json"));
    if (!first) {
      console.error("No deployments/*.json found. Run deploy first.");
      process.exit(1);
    }
    jsonPath = path.join(deploymentsDir, first);
    console.log("Using", first);
  }
  const addresses = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  let yaml = fs.readFileSync(subgraphYamlPath, "utf8");

  for (let i = 0; i < dataSourceNames.length; i++) {
    const name = dataSourceNames[i];
    const addrKey = ADDRESS_KEYS[i];
    const addr = addresses[addrKey];
    if (!addr) continue;
    const regex = new RegExp(
      `(name: ${name}\\s+network: ${graphNetwork}\\s+source:\\s+)(#?\\s*address:.*?\\n)?(\\s+abi:)`,
      "s"
    );
    const replacement = `$1      address: "${addr}"\n$3`;
    if (regex.test(yaml)) {
      yaml = yaml.replace(regex, replacement);
      console.log("Set", name, "->", addr);
    }
  }

  fs.writeFileSync(subgraphYamlPath, yaml);
  console.log("Updated", subgraphYamlPath, "for network", graphNetwork);
}

main();
