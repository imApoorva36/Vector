// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}
