// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

type BeforeSwapDelta is int256;

library BeforeSwapDeltaLibrary {
    BeforeSwapDelta public constant ZERO_DELTA = BeforeSwapDelta.wrap(0);
}
