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

    it("getSigner returns TEE signer address", async function () {
      expect(await registry.getSigner()).to.equal(teeSigner.address);
    });

    it("returns default config for unknown pool", async function () {
      const unknownPoolId = ethers.zeroPadValue("0xff", 32);
      const [mode, blockThresh, warnThresh] = await registry.getPoolProtection(unknownPoolId);
      expect(mode).to.equal(0);
      expect(blockThresh).to.equal(70);
      expect(warnThresh).to.equal(31);
    });

    it("owner can set risk threshold", async function () {
      await expect(registry.setRiskThreshold(50))
        .to.emit(registry, "RiskThresholdUpdated")
        .withArgs(70, 50);
      expect(await registry.riskThreshold()).to.equal(50);
      await registry.setRiskThreshold(70);
    });

    it("setRiskThreshold reverts when threshold > 100", async function () {
      await expect(registry.setRiskThreshold(101)).to.be.revertedWith("Threshold must be <= 100");
    });

    it("verifyAttestation uses default threshold 70 when riskThreshold is 0", async function () {
      await registry.setRiskThreshold(0);
      const amountSpecified = 10n ** 18n;
      const riskScore = 20;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = await buildHookData(teeSigner, POOL_ID, true, amountSpecified, riskScore, expiry, chainId);
      const decision = await hook.evaluateSwap.staticCall(POOL_ID, user.address, true, amountSpecified, hookData);
      expect(decision).to.equal(0);
      await registry.setRiskThreshold(70);
    });

    it("owner can remove pool protection", async function () {
      await expect(registry.removePoolProtection(POOL_ID))
        .to.emit(registry, "PoolProtectionRemoved")
        .withArgs(POOL_ID);
      const [mode] = await registry.getPoolProtection(POOL_ID);
      expect(mode).to.equal(0);
      await registry.setPoolProtection(POOL_ID, 1, 70, 31);
    });

    it("setPoolProtection reverts when warnThreshold >= blockThreshold", async function () {
      await expect(
        registry.setPoolProtection(ethers.zeroPadValue("0x03", 32), 1, 30, 31)
      ).to.be.revertedWith("Warn must be < block");
    });

    it("setPoolProtection reverts when mode > 1", async function () {
      await expect(
        registry.setPoolProtection(ethers.zeroPadValue("0x03", 32), 2, 70, 31)
      ).to.be.revertedWith("Invalid mode");
    });

    it("setTokenBlacklist reverts for zero address", async function () {
      await expect(
        registry.setTokenBlacklist(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Invalid token");
    });

    it("batchSetTokenBlacklist skips zero address", async function () {
      const token = "0x1234567890123456789012345678901234567891";
      await registry.batchSetTokenBlacklist([ethers.ZeroAddress, token], true);
      expect(await registry.isBlacklisted(token)).to.equal(true);
      expect(await registry.isBlacklisted(ethers.ZeroAddress)).to.equal(false);
      await registry.batchSetTokenBlacklist([token], false);
    });

    it("verifyAttestation reverts when TEE not configured", async function () {
      const VectorRiskRegistry = await ethers.getContractFactory("VectorRiskRegistry");
      const regNoTEE = await VectorRiskRegistry.deploy(owner.address);
      const attestation = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "bytes"],
        [20, Math.floor(Date.now() / 1000) + 300, "0x" + "00".repeat(65)]
      );
      await expect(
        regNoTEE.verifyAttestation(POOL_ID, true, 1n, attestation)
      ).to.be.revertedWithCustomError(regNoTEE, "TEENotConfigured");
    });

    it("verifyAttestation reverts when signature length is invalid", async function () {
      const shortSig = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "bytes"],
        [20, Math.floor(Date.now() / 1000) + 300, "0x1234"]
      );
      await expect(
        registry.verifyAttestation(POOL_ID, true, 10n ** 18n, shortSig)
      ).to.be.revertedWith("Invalid signature length");
    });

    it("verifyAttestation reverts when signature v is invalid", async function () {
      const badV = "0x" + "00".repeat(64) + "1a";
      const attestationBadV = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "bytes"],
        [20, Math.floor(Date.now() / 1000) + 300, badV]
      );
      await expect(
        registry.verifyAttestation(POOL_ID, true, 10n ** 18n, attestationBadV)
      ).to.be.revertedWith("Invalid signature v");
    });

    it("supports owner-managed on-chain token blacklist", async function () {
      const token = "0x000000000000000000000000000000000000dEaD";

      expect(await registry.isBlacklisted(token)).to.equal(false);
      await expect(registry.setTokenBlacklist(token, true))
        .to.emit(registry, "TokenBlacklistUpdated")
        .withArgs(token, true);
      expect(await registry.isBlacklisted(token)).to.equal(true);

      await registry.batchSetTokenBlacklist([token], false);
      expect(await registry.isBlacklisted(token)).to.equal(false);
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

    it("evaluate returns ALLOW for unprotected pool with low score and no attestation", async function () {
      const decision = await policy.evaluate.staticCall(
        POOL_ID_OTHER,
        user.address,
        false,
        0,
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

    it("evaluate returns WARN for unprotected pool when score >= blockThreshold", async function () {
      const decision = await policy.evaluate.staticCall(
        POOL_ID_OTHER,
        user.address,
        true,
        0, // unprotected
        85  // above block 70
      );
      expect(decision).to.equal(1); // WARN
    });

    it("owner can setThresholds", async function () {
      await expect(policy.setThresholds(80, 40))
        .to.emit(policy, "ThresholdsUpdated")
        .withArgs(80, 40);
      expect(await policy.blockThreshold()).to.equal(80);
      expect(await policy.warnThreshold()).to.equal(40);
      await policy.setThresholds(70, 31);
    });

    it("setThresholds reverts when warn >= block", async function () {
      await expect(policy.setThresholds(30, 31)).to.be.revertedWith("Warn must be < block");
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

    it("evaluateSwap reverts when attestation valid but riskScore >= threshold", async function () {
      const amountSpecified = 10n ** 18n;
      const riskScore = 80; // above block 70
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
      await expect(
        hook.evaluateSwap(POOL_ID, user.address, true, amountSpecified, hookData)
      ).to.be.revertedWithCustomError(hook, "SwapBlocked");
    });

    it("evaluateSwap uses hookData score only (no sig) for unprotected pool when TEE not configured", async function () {
      const VectorRiskRegistry = await ethers.getContractFactory("VectorRiskRegistry");
      const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
      const VectorHook = await ethers.getContractFactory("VectorHook");
      const regNoTEE = await VectorRiskRegistry.deploy(owner.address);
      const policyNoTEE = await PolicyEngine.deploy(owner.address);
      const hookNoTEE = await VectorHook.deploy(await regNoTEE.getAddress(), await policyNoTEE.getAddress());
      await regNoTEE.setPoolProtection(POOL_ID_OTHER, 0, 70, 31);
      const riskScore = 50;
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const hookData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "bytes"],
        [riskScore, expiry, "0x"]
      );
      const decision = await hookNoTEE.evaluateSwap.staticCall(
        POOL_ID_OTHER,
        user.address,
        true,
        10n ** 18n,
        hookData
      );
      expect(decision).to.equal(1); // WARN
    });

    it("emitSwapExecuted emits SwapExecuted", async function () {
      await expect(
        hook.emitSwapExecuted(POOL_ID, user.address, 100, -200)
      )
        .to.emit(hook, "SwapExecuted")
        .withArgs(POOL_ID, user.address, 100, -200);
    });
  });
});
