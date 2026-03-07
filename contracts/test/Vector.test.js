const { expect } = require("chai");
const { ethers } = require("hardhat");

/** Build hookData (abi.encode(riskScore, expiry, signature)) for on-chain verification. */
async function buildHookData(teeSigner, poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId) {
  const messageHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bool", "int256", "uint256", "uint256", "uint256"],
      [poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId]
    )
  );
  const signature = await teeSigner.signMessage(ethers.getBytes(messageHash));
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "bytes"],
    [riskScore, expiry, signature]
  );
}

describe("Vector", function () {
  let registry, policy, hook, owner, teeSigner, user;
  const POOL_ID = ethers.zeroPadValue("0x01", 32);
  const POOL_ID_OTHER = ethers.zeroPadValue("0x02", 32);

  before(async function () {
    [owner, teeSigner, user] = await ethers.getSigners();

    const VectorRiskRegistry = await ethers.getContractFactory("VectorRiskRegistry");
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const VectorHook = await ethers.getContractFactory("VectorHook");

    registry = await VectorRiskRegistry.deploy(owner.address);
    policy = await PolicyEngine.deploy(owner.address);
    hook = await VectorHook.deploy(await registry.getAddress(), await policy.getAddress());

    await registry.setTEESigner(teeSigner.address);
    await registry.setPoolProtection(POOL_ID, 1, 70, 31); // Protected pool
    await registry.setPoolProtection(POOL_ID_OTHER, 0, 70, 31); // Unprotected pool
  });

  describe("VectorRiskRegistry", function () {
    it("returns pool protection config", async function () {
      const [mode, blockThresh, warnThresh] = await registry.getPoolProtection(POOL_ID);
      expect(mode).to.equal(1);
      expect(blockThresh).to.equal(70);
      expect(warnThresh).to.equal(31);
    });
  });

  describe("PolicyEngine", function () {
    it("evaluate returns ALLOW for low score with attestation", async function () {
      const decision = await policy.evaluate.staticCall(
        POOL_ID,
        user.address,
        true,
        1,
        20
      );
      expect(decision).to.equal(0); // ALLOW
    });

    it("evaluate returns BLOCK for high score on protected pool", async function () {
      await expect(
        policy.evaluate(POOL_ID, user.address, true, 1, 85)
      ).to.emit(policy, "SwapBlocked");
    });

    it("evaluate returns BLOCK when paused regardless of attestation", async function () {
      await policy.pause();
      const decision = await policy.evaluate.staticCall(
        POOL_ID,
        user.address,
        true,
        1,
        10
      );
      expect(decision).to.equal(2); // BLOCK
      await policy.unpause();
    });
  });

  describe("VectorHook", function () {
    it("evaluateSwap reverts when protected pool has no valid attestation", async function () {
      await expect(
        hook.evaluateSwap(POOL_ID, user.address, true, 1e18.toString(), "0x")
      ).to.be.revertedWithCustomError(hook, "SwapBlocked");
    });

    it("evaluateSwap ALLOWs when protected pool has valid attestation (low risk)", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 20;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = await buildHookData(
        teeSigner,
        POOL_ID,
        true,
        amountSpecified,
        riskScore,
        expiry,
        chainId
      );
      const decision = await hook.evaluateSwap.staticCall(
        POOL_ID,
        user.address,
        true,
        amountSpecified,
        hookData
      );
      expect(decision).to.equal(0); // ALLOW
    });

    it("evaluateSwap reverts on attestation replay (wrong poolId)", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 20;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = await buildHookData(
        teeSigner,
        POOL_ID,
        true,
        amountSpecified,
        riskScore,
        expiry,
        chainId
      );
      // Replay same attestation for a different pool: registry reverts (invalid signer for this pool)
      await expect(
        hook.evaluateSwap(POOL_ID_OTHER, user.address, true, amountSpecified, hookData)
      ).to.be.revertedWithCustomError(registry, "InvalidTEEAttestation");
    });

    it("evaluateSwap reverts when PolicyEngine is paused", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 20;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = await buildHookData(
        teeSigner,
        POOL_ID,
        true,
        amountSpecified,
        riskScore,
        expiry,
        chainId
      );
      await policy.pause();
      await expect(
        hook.evaluateSwap(POOL_ID, user.address, true, amountSpecified, hookData)
      ).to.be.revertedWithCustomError(hook, "SwapBlocked");
      await policy.unpause();
    });

    it("evaluateSwap reverts when attestation is expired", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 20;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) - 60; // 1 min ago
      const hookData = await buildHookData(
        teeSigner,
        POOL_ID,
        true,
        amountSpecified,
        riskScore,
        expiry,
        chainId
      );
      await expect(
        hook.evaluateSwap(POOL_ID, user.address, true, amountSpecified, hookData)
      ).to.be.revertedWithCustomError(registry, "AttestationExpired");
    });

    it("evaluateSwap returns WARN for unprotected pool with score in warn range", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 50; // between warn 31 and block 70
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = await buildHookData(
        teeSigner,
        POOL_ID_OTHER,
        true,
        amountSpecified,
        riskScore,
        expiry,
        chainId
      );
      const decision = await hook.evaluateSwap.staticCall(
        POOL_ID_OTHER,
        user.address,
        true,
        amountSpecified,
        hookData
      );
      expect(decision).to.equal(1); // WARN
    });
  });
});
