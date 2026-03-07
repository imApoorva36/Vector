// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolKey} from "./PoolKey.sol";
import {BalanceDelta} from "./BalanceDelta.sol";
import {SwapParams} from "./PoolOperation.sol";
import {BeforeSwapDelta} from "./BeforeSwapDelta.sol";

/// @notice Minimal IHooks interface for Vector: beforeSwap and afterSwap only.
interface IVectorHooks {
    function beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        returns (bytes4, BeforeSwapDelta, uint24);

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (bytes4, int128);
}
