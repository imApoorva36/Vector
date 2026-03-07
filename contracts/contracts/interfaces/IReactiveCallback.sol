// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IReactiveCallback
/// @notice Interface for the destination-chain contract that receives callbacks from RSCs.
interface IReactiveCallback {
    /// @notice Process a callback triggered by a Reactive Smart Contract
    /// @param sender The RSC address that triggered this callback
    /// @param payload Encoded callback data
    function reactiveCallback(address sender, bytes calldata payload) external;
}
