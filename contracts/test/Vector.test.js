const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vector", function () {
  let registry, policy, hook, owner, teeSigner, user;
  const POOL_ID = ethers.zeroPadValue("0x01", 32);

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
  });

  describe("VectorHook", function () {
    it("evaluateSwap reverts when protected pool has no valid attestation", async function () {
      await expect(
        hook.evaluateSwap(POOL_ID, user.address, true, 1e18.toString(), "0x")
      ).to.be.revertedWithCustomError(hook, "SwapBlocked");
    });
  });
});
