/**
 * Update subgraph.yaml with contract addresses from deployments/<network>.json.
 * Run after deploy: node scripts/update-subgraph-addresses.js [network]
 * Default network: baseSepolia (or from deployments folder: first json found)
 */

const fs = require("fs");
const path = require("path");

const deploymentsDir = path.join(__dirname, "../deployments");
const subgraphYamlPath = path.join(__dirname, "../../subgraph/subgraph.yaml");

const contractNames = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];

function main() {
  const network = process.argv[2] || process.env.NETWORK || "baseSepolia";
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

  for (const name of contractNames) {
    const addr = addresses[name];
    if (!addr) continue;
    const regex = new RegExp(
      `(name: ${name}\\s+network: [^\\n]+\\s+source:\\s+)(#?\\s*address:.*?\\n)?(\\s+abi:)`,
      "s"
    );
    const replacement = `$1      address: "${addr}"\n$3`;
    if (regex.test(yaml)) {
      yaml = yaml.replace(regex, replacement);
      console.log("Set", name, "->", addr);
    }
  }

  fs.writeFileSync(subgraphYamlPath, yaml);
  console.log("Updated", subgraphYamlPath);
}

main();
