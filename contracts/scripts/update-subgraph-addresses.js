/**
 * Update subgraph manifests with contract addresses from deployments/<network>.json.
 * Run after deploy: node scripts/update-subgraph-addresses.js [network]
 * - baseSepolia: updates subgraph.yaml (base-sepolia)
 * - unichainSepolia: writes subgraph-unichain.yaml (unichain-sepolia) for separate deploy
 */

const fs = require("fs");
const path = require("path");

const deploymentsDir = path.join(__dirname, "../deployments");
const subgraphDir = path.join(__dirname, "../../subgraph");
const subgraphYamlPath = path.join(subgraphDir, "subgraph.yaml");
const subgraphUnichainPath = path.join(subgraphDir, "subgraph-unichain.yaml");

const ADDRESS_KEYS = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];
const DATA_SOURCE_NAMES = ["VectorHook", "PolicyEngine", "VectorRiskRegistry", "VectorReactiveCallback"];

function main() {
  const network = process.argv[2] || process.env.NETWORK || "baseSepolia";
  const isUnichain = network === "unichainSepolia";
  const graphNetwork = isUnichain ? "unichain-sepolia" : "base-sepolia";

  let jsonPath = path.join(deploymentsDir, `${network}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error("No deployments/" + network + ".json found. Run deploy first.");
    process.exit(1);
  }
  const addresses = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (isUnichain) {
    // Build Unichain manifest from base subgraph.yaml: swap network and addresses
    let yaml = fs.readFileSync(subgraphYamlPath, "utf8");
    yaml = yaml.replace(/network: base-sepolia/g, "network: unichain-sepolia");
    const addrs = ADDRESS_KEYS.map((k) => addresses[k]);
    let idx = 0;
    yaml = yaml.replace(/address: "0x[a-fA-F0-9]+"/g, () => {
      const addr = addrs[idx] || "";
      idx++;
      return `address: "${addr}"`;
    });
    fs.writeFileSync(subgraphUnichainPath, yaml);
    ADDRESS_KEYS.forEach((k, i) => console.log("Set", DATA_SOURCE_NAMES[i], "->", addresses[k]));
    console.log("Wrote", subgraphUnichainPath, "for network", graphNetwork);
    return;
  }

  // Base Sepolia: update subgraph.yaml in place
  let yaml = fs.readFileSync(subgraphYamlPath, "utf8");
  for (let i = 0; i < DATA_SOURCE_NAMES.length; i++) {
    const name = DATA_SOURCE_NAMES[i];
    const addr = addresses[ADDRESS_KEYS[i]];
    if (!addr) continue;
    const regex = new RegExp(
      `(name: ${name}\\s+network: base-sepolia\\s+source:\\s+)(#?\\s*address:.*?\\n)?(\\s+abi:)`,
      "s"
    );
    const replacement = `$1address: "${addr}"\n$3`;
    if (regex.test(yaml)) {
      yaml = yaml.replace(regex, replacement);
      console.log("Set", name, "->", addr);
    }
  }
  fs.writeFileSync(subgraphYamlPath, yaml);
  console.log("Updated", subgraphYamlPath, "for network", graphNetwork);
}

main();
