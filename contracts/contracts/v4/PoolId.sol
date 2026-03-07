// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolKey} from "./PoolKey.sol";

type PoolId is bytes32;

library PoolIdLibrary {
    function toId(PoolKey calldata key) internal pure returns (PoolId) {
        return PoolId.wrap(keccak256(abi.encode(key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks)));
    }
}
