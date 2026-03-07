// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

type BalanceDelta is int256;

library BalanceDeltaLibrary {
    function amount0(BalanceDelta d) internal pure returns (int128 a0) {
        assembly ("memory-safe") {
            a0 := sar(128, d)
        }
    }

    function amount1(BalanceDelta d) internal pure returns (int128 a1) {
        assembly ("memory-safe") {
            a1 := signextend(15, d)
        }
    }
}
