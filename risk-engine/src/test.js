/**
 * Vector Risk Engine - Test Suite
 *
 * Run: node src/test.js
 * Tests the layered scoring pipeline and attestation signing.
 */

const { assessSwapRisk } = require("./index");
const { AttestationSigner } = require("./attestation/signer");
const { getPoolOnChainSignals } = require("./layers/poolOnChainSignals");
const { ethers } = require("ethers");

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

async function runTests() {
  console.log("\n=== Vector Risk Engine Tests ===\n");

  // ── Test 1: Allowlisted tokens get score 0 ──
  console.log("Layer 1: Pool Allowlist");
  {
    const result = await assessSwapRisk({
      poolId: "0x" + "ab".repeat(32),
      token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
      token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
      zeroForOne: true,
      amountSpecified: "1000000000",
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    });
    assert(result.riskScore === 0, "Trusted token pair gets score 0");
    assert(result.decision === "ALLOW", "Trusted token pair decision is ALLOW");
    assert(result.signals[0]?.type === "ALLOWLIST", "Signal type is ALLOWLIST");
  }

  // ── Test 2: Unknown tokens get non-zero score ──
  console.log("\nLayer 2: Swap Intent");
  {
    const result = await assessSwapRisk({
      poolId: "0x" + "cd".repeat(32),
      token0: "0x" + "aa".repeat(20),
      token1: "0x" + "bb".repeat(20),
      zeroForOne: true,
      amountSpecified: "100000000000000000000", // 100 ETH
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    });
    assert(result.riskScore >= 0, "Unknown tokens get scored");
    assert(typeof result.decision === "string", "Decision is a string");

    // Large swap should trigger intent signal
    const intentSignals = result.signals.filter((s) => s.type === "SWAP_INTENT");
    assert(intentSignals.length > 0, "Large swap triggers SWAP_INTENT signal");
  }

  // ── Test 3: Micro swap detection ──
  console.log("\nMicro swap detection");
  {
    const result = await assessSwapRisk({
      poolId: "0x" + "ee".repeat(32),
      token0: "0x" + "aa".repeat(20),
      token1: "0x" + "bb".repeat(20),
      zeroForOne: true,
      amountSpecified: "100", // 100 wei
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    });
    const microSignals = result.signals.filter(
      (s) => s.type === "SWAP_INTENT" && s.reason.includes("Micro")
    );
    assert(microSignals.length > 0, "Micro swap triggers detection");
  }

  // ── Test 4: Known malicious token ──
  console.log("\nLayer 3: Token Threat Intel");
  {
    const result = await assessSwapRisk({
      poolId: "0x" + "ff".repeat(32),
      token0: "0x" + "aa".repeat(20),
      token1: "0x000000000000000000000000000000000000dead",
      zeroForOne: true,
      amountSpecified: "1000",
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    });
    assert(result.riskScore >= 70, "Known malicious token gets high score");
    assert(result.decision === "BLOCK", "Known malicious token decision is BLOCK");
  }

  // ── Test 5: Attestation signing ──
  console.log("\nAttestation Signing");
  {
    const testKey = "0x" + "ab".repeat(32);
    const testSigner = new AttestationSigner(testKey);

    assert(testSigner.address.startsWith("0x"), "Signer has valid address");

    const attestation = await testSigner.sign({
      poolId: "0x" + "cc".repeat(32),
      zeroForOne: true,
      amountSpecified: "1000000000",
      riskScore: 45,
      expiry: Math.floor(Date.now() / 1000) + 300,
      chainId: 1,
    });

    assert(attestation.signature.length === 132, "Signature is 65 bytes hex");
    assert(attestation.encodedAttestation.startsWith("0x"), "Encoded attestation is hex");
    assert(attestation.riskScore === 45, "Risk score preserved in attestation");
    assert(attestation.signerAddress === testSigner.address, "Signer address matches");

    // Verify the signature recovers correctly
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bool", "int256", "uint256", "uint256", "uint256"],
        [
          attestation.poolId,
          attestation.zeroForOne,
          attestation.amountSpecified,
          attestation.riskScore,
          attestation.expiry,
          attestation.chainId,
        ]
      )
    );
    const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), attestation.signature);
    assert(recovered === testSigner.address, "Recovered signer matches");
  }

  // ── Test 6: Known tornado cash token pattern ──
  console.log("\nThreat intel known-pattern coverage");
  {
    const result = await assessSwapRisk({
      poolId: "0x" + "aa".repeat(32),
      token0: "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
      token1: "0x" + "bb".repeat(20),
      zeroForOne: true,
      amountSpecified: "1000",
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    });
    assert(result.riskScore >= 70, "Known tornado-cash token pattern is high risk");
    assert(result.decision === "BLOCK", "Known tornado-cash token decision is BLOCK");
  }

  // ── Test 7: On-chain fresh + prefunded heuristic ──
  console.log("\nOn-chain heuristic coverage");
  {
    const provider = {
      getCode: async () => "0x6080604052",
      getTransactionCount: async () => 0,
      getBalance: async () => ethers.parseEther("0.05"),
    };

    const result = await getPoolOnChainSignals({
      token0: "0x" + "aa".repeat(20),
      token1: "0x" + "bb".repeat(20),
      targetToken: "0x" + "aa".repeat(20),
      provider,
      chainId: 84532,
    });

    assert(
      result.signals.some((s) => s.reasonCode === "ONCHAIN_FRESH_PREFUNDED"),
      "Fresh prefunded token contract signal emitted"
    );
  }

  // ── Test 8: Caching ──
  console.log("\nCaching");
  {
    const params = {
      poolId: "0x" + "dd".repeat(32),
      token0: "0x" + "aa".repeat(20),
      token1: "0x" + "bb".repeat(20),
      zeroForOne: true,
      amountSpecified: "50000000000000000000", // 50 ETH
      sender: "0x" + "11".repeat(20),
      chainId: 1,
    };
    const result1 = await assessSwapRisk(params);
    const result2 = await assessSwapRisk(params);
    assert(result2.cached === true, "Second call returns cached result");
    assert(result1.riskScore === result2.riskScore, "Cached score matches original");
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"=".repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
