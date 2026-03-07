// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {VectorHook} from "./VectorHook.sol";
import {IVectorHooks} from "./v4/IVectorHooks.sol";
import {PoolKey} from "./v4/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "./v4/PoolId.sol";
import {SwapParams} from "./v4/PoolOperation.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "./v4/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "./v4/BeforeSwapDelta.sol";

/// @title VectorHookV4
/// @notice Uniswap v4 hook that gates swaps via Vector risk and policy. Implements beforeSwap and afterSwap.
/// @dev Deploy at an address whose low 14 bits match BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG (e.g. via CREATE2 + HookMiner) for use with v4 PoolManager.
contract VectorHookV4 is IVectorHooks {
    address public immutable poolManager;
    VectorHook public immutable vectorHook;

    error NotPoolManager();

    modifier onlyPoolManager() {
        if (msg.sender != poolManager) revert NotPoolManager();
        _;
    }

    constructor(address _poolManager, address _vectorHook) {
        poolManager = _poolManager;
        vectorHook = VectorHook(payable(_vectorHook));
    }

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        bytes32 poolId = PoolId.unwrap(PoolIdLibrary.toId(key));
        vectorHook.evaluateSwap(poolId, sender, params.zeroForOne, params.amountSpecified, hookData);
        return (IVectorHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external onlyPoolManager returns (bytes4, int128) {
        bytes32 poolId = PoolId.unwrap(PoolIdLibrary.toId(key));
        vectorHook.emitSwapExecuted(
            poolId,
            sender,
            BalanceDeltaLibrary.amount0(delta),
            BalanceDeltaLibrary.amount1(delta)
        );
        return (IVectorHooks.afterSwap.selector, 0);
    }
}
