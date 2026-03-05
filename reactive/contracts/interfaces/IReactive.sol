// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IReactive
/// @notice Minimal interface for Reactive Network Smart Contracts (RSCs).
///         RSCs monitor events on source chains and trigger callbacks on destination chains.
/// @dev See https://dev.reactive.network/ for full specification.
interface IReactive {
    /// @notice Called by Reactive Network when a subscribed event is detected.
    /// @param chainId The source chain ID where the event originated
    /// @param contractAddress The contract that emitted the event
    /// @param topic0 First topic (event signature hash)
    /// @param topic1 Second topic (indexed param 1)
    /// @param topic2 Third topic (indexed param 2)
    /// @param topic3 Fourth topic (indexed param 3)
    /// @param data Non-indexed event data
    /// @param blockNumber Block number of the source event
    /// @param opCode Operation code for callback routing
    function react(
        uint256 chainId,
        address contractAddress,
        bytes32 topic0,
        bytes32 topic1,
        bytes32 topic2,
        bytes32 topic3,
        bytes calldata data,
        uint256 blockNumber,
        uint256 opCode
    ) external;
}

/// @title IReactiveCallback
/// @notice Interface for the destination-chain contract that receives callbacks from RSCs.
interface IReactiveCallback {
    /// @notice Process a callback triggered by a Reactive Smart Contract
    /// @param sender The RSC address that triggered this callback
    /// @param payload Encoded callback data
    function reactiveCallback(address sender, bytes calldata payload) external;
}
