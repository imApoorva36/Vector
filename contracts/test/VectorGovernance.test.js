const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VectorGovernance", function () {
  let gov, owner, newOwner;

  before(async function () {
    [owner, newOwner] = await ethers.getSigners();
    const VectorGovernance = await ethers.getContractFactory("VectorGovernance");
    gov = await VectorGovernance.deploy(owner.address);
  });

  it("sets initial owner", async function () {
    expect(await gov.owner()).to.equal(owner.address);
  });

  it("owner can transfer ownership (Ownable2Step)", async function () {
    await gov.transferOwnership(newOwner.address);
    expect(await gov.pendingOwner()).to.equal(newOwner.address);
    await gov.connect(newOwner).acceptOwnership();
    expect(await gov.owner()).to.equal(newOwner.address);
    await gov.connect(newOwner).transferOwnership(owner.address);
    await gov.connect(owner).acceptOwnership();
  });
});
