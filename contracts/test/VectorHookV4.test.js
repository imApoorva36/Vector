const { expect } = require("chai");
const { ethers } = require("hardhat");

function makePoolKey(currency0, currency1, fee, tickSpacing, hooks) {
  return { currency0, currency1, fee, tickSpacing, hooks };
}

function encodeBalanceDelta(amount0, amount1) {
  const a0 = BigInt(amount0);
  const a1 = BigInt(amount1);
  const low = a1 >= 0 ? a1 : (2n ** 128n + a1);
  return (a0 << 128n) | low;
}

describe("VectorHookV4", function () {
  let hookV4, vectorHook, registry, policy, poolManager, owner, user;

  before(async function () {
    [owner, poolManager, user] = await ethers.getSigners();

    const VectorRiskRegistry = await ethers.getContractFactory("VectorRiskRegistry");
    const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
    const VectorHook = await ethers.getContractFactory("VectorHook");
    const VectorHookV4 = await ethers.getContractFactory("VectorHookV4");

    registry = await VectorRiskRegistry.deploy(owner.address);
    policy = await PolicyEngine.deploy(owner.address);
    vectorHook = await VectorHook.deploy(await registry.getAddress(), await policy.getAddress());
    hookV4 = await VectorHookV4.deploy(poolManager.address, await vectorHook.getAddress());
  });

  const key = makePoolKey(
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
    3000,
    60,
    ethers.ZeroAddress
  );
  const params = {
    zeroForOne: true,
    amountSpecified: 10n ** 18n,
    sqrtPriceLimitX96: 0,
  };

  it("reverts when non-PoolManager calls beforeSwap", async function () {
    await expect(
      hookV4.connect(user).beforeSwap(user.address, key, params, "0x")
    ).to.be.revertedWithCustomError(hookV4, "NotPoolManager");
  });

  it("reverts when non-PoolManager calls afterSwap", async function () {
    const delta = encodeBalanceDelta(100, -200);
    await expect(
      hookV4.connect(user).afterSwap(user.address, key, params, delta, "0x")
    ).to.be.revertedWithCustomError(hookV4, "NotPoolManager");
  });

  it("PoolManager can call beforeSwap and reverts when hook blocks", async function () {
    const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    ));
    await registry.setPoolProtection(poolId, 1, 70, 31);
    await expect(
      hookV4.connect(poolManager).beforeSwap(user.address, key, params, "0x")
    ).to.be.revertedWithCustomError(vectorHook, "SwapBlocked");
  });

  it("PoolManager can call beforeSwap and succeeds when hook allows", async function () {
    const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    ));
    await registry.setPoolProtection(poolId, 0, 70, 31);
    await registry.setTEESigner(owner.address);
    const expiry = Math.floor(Date.now() / 1000) + 300;
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bool", "int256", "uint256", "uint256", "uint256"],
        [poolId, true, params.amountSpecified, 20, expiry, chainId]
      )
    );
    const sig = await owner.signMessage(ethers.getBytes(messageHash));
    const hookData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "bytes"],
      [20, expiry, sig]
    );
    const tx = await hookV4.connect(poolManager).beforeSwap(user.address, key, params, hookData);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it("PoolManager can call afterSwap and emits SwapExecuted", async function () {
    const delta = encodeBalanceDelta(100, -200);
    const poolId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24", "int24", "address"],
        [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
      )
    );
    await expect(
      hookV4.connect(poolManager).afterSwap(user.address, key, params, delta, "0x")
    )
      .to.emit(vectorHook, "SwapExecuted")
      .withArgs(poolId, user.address, 100, -200);
  });

  it("exposes poolManager and vectorHook immutables", async function () {
    expect(await hookV4.poolManager()).to.equal(poolManager.address);
    expect(await hookV4.vectorHook()).to.equal(await vectorHook.getAddress());
  });
});
