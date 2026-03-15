const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VectorReactiveCallback", function () {
  let callback;
  let owner;
  let rsc;
  let user;

  before(async function () {
    [owner, rsc, user] = await ethers.getSigners();
    const VectorReactiveCallback = await ethers.getContractFactory("VectorReactiveCallback");
    callback = await VectorReactiveCallback.deploy();
  });

  it("reverts when caller is not authorized RSC", async function () {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "bytes32", "address", "uint256", "string"],
      [84532, ethers.zeroPadValue("0x01", 32), user.address, 85, "Repeated blocks"]
    );
    await expect(
      callback.reactiveCallback(rsc.address, payload)
    ).to.be.revertedWithCustomError(callback, "UnauthorizedRSC");
  });

  it("owner can authorize RSC", async function () {
    await expect(callback.authorizeRSC(rsc.address))
      .to.emit(callback, "RSCAuthorized")
      .withArgs(rsc.address);
    expect(await callback.authorizedRSCs(rsc.address)).to.be.true;
  });

  it("authorized RSC can trigger callback and emit CrossChainRiskAlert", async function () {
    const poolId = ethers.zeroPadValue("0x01", 32);
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "bytes32", "address", "uint256", "string"],
      [84532, poolId, user.address, 85, "Repeated blocks (3): Policy engine blocked"]
    );

    await expect(
      callback.connect(rsc).reactiveCallback(rsc.address, payload)
    )
      .to.emit(callback, "CrossChainRiskAlert")
      .withArgs(84532, poolId, user.address, 85, "Repeated blocks (3): Policy engine blocked");

    expect(await callback.getAlertCount()).to.equal(1);
    const alert = await callback.getLatestAlert(poolId);
    expect(alert.sourceChainId).to.equal(84532);
    expect(alert.actor).to.equal(user.address);
    expect(alert.riskScore).to.equal(85);
  });

  it("owner can revoke RSC", async function () {
    await expect(callback.revokeRSC(rsc.address))
      .to.emit(callback, "RSCRevoked")
      .withArgs(rsc.address);
    expect(await callback.authorizedRSCs(rsc.address)).to.be.false;
  });

  it("after revoke, callback reverts", async function () {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "bytes32", "address", "uint256", "string"],
      [84532, ethers.zeroPadValue("0x02", 32), user.address, 90, "Test"]
    );
    await expect(
      callback.connect(rsc).reactiveCallback(rsc.address, payload)
    ).to.be.revertedWithCustomError(callback, "UnauthorizedRSC");
  });

  it("getLatestAlert returns empty struct for poolId with no alert", async function () {
    const unknownPoolId = ethers.zeroPadValue("0x99", 32);
    const alert = await callback.getLatestAlert(unknownPoolId);
    expect(alert.sourceChainId).to.equal(0);
    expect(alert.poolId).to.equal(ethers.ZeroHash);
    expect(alert.actor).to.equal(ethers.ZeroAddress);
    expect(alert.riskScore).to.equal(0);
    expect(alert.timestamp).to.equal(0);
    expect(alert.reason).to.equal("");
  });

  it("getAlertCount increments for each callback", async function () {
    await callback.authorizeRSC(rsc.address);
    const poolId2 = ethers.zeroPadValue("0x02", 32);
    const payload2 = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "bytes32", "address", "uint256", "string"],
      [84532, poolId2, user.address, 90, "Second alert"]
    );
    await callback.connect(rsc).reactiveCallback(rsc.address, payload2);
    expect(await callback.getAlertCount()).to.be.gte(2);
    const alert2 = await callback.getLatestAlert(poolId2);
    expect(alert2.riskScore).to.equal(90);
    expect(alert2.reason).to.equal("Second alert");
  });
});
