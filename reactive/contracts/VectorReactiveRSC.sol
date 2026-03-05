// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IReactive} from "./interfaces/IReactive.sol";

/// @title VectorReactiveRSC
/// @notice Reactive Smart Contract deployed on Reactive Network.
///         Monitors VectorHook events on the source chain (e.g., SwapBlocked, SwapWarned)
///         and triggers callbacks to VectorReactiveCallback on the destination chain when
///         policy-relevant patterns are detected (repeated blocks, anomalous activity).
///
/// @dev This contract subscribes to VectorHook's events via Reactive Network's event
///      subscription system. When a pattern is detected (e.g., same actor blocked 3+ times),
///      it emits a Callback event that Reactive Network routes to the destination chain's
///      VectorReactiveCallback contract.
///
///      Deployment: Reactive Network (not the destination chain).
///      See: https://dev.reactive.network/education/introduction
contract VectorReactiveRSC is IReactive {
    // ─── Constants ───────────────────────────────────────────────────────

    /// @notice Event signature for VectorHook's SwapBlocked event
    /// keccak256("SwapBlocked(bytes32,address,uint256,string)")
    bytes32 public constant SWAP_BLOCKED_TOPIC = keccak256("SwapBlocked(bytes32,address,uint256,string)");

    /// @notice Event signature for HookSwapEvaluated
    /// keccak256("HookSwapEvaluated(bytes32,address,uint8,uint256)")
    bytes32 public constant SWAP_EVALUATED_TOPIC = keccak256("HookSwapEvaluated(bytes32,address,uint8,uint256)");

    // ─── State ───────────────────────────────────────────────────────────

    /// @notice Destination chain ID for callbacks
    uint256 public immutable destinationChainId;

    /// @notice VectorReactiveCallback address on the destination chain
    address public immutable callbackContract;

    /// @notice VectorHook address on the source chain being monitored
    address public immutable sourceHookAddress;

    /// @notice Source chain ID being monitored
    uint256 public immutable sourceChainId;

    /// @notice Track blocked swap counts per actor per pool for pattern detection
    mapping(bytes32 => mapping(address => uint256)) public blockedCounts;

    /// @notice Threshold of blocked swaps before triggering cross-chain alert
    uint256 public constant ALERT_THRESHOLD = 3;

    // ─── Events ──────────────────────────────────────────────────────────

    /// @notice Emitted to trigger a cross-chain callback via Reactive Network
    event Callback(
        uint256 indexed destinationChainId,
        address indexed callbackContract,
        uint256 gasLimit,
        bytes payload
    );

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(
        uint256 _sourceChainId,
        address _sourceHookAddress,
        uint256 _destinationChainId,
        address _callbackContract
    ) {
        sourceChainId = _sourceChainId;
        sourceHookAddress = _sourceHookAddress;
        destinationChainId = _destinationChainId;
        callbackContract = _callbackContract;
    }

    // ─── Reactive Handler ────────────────────────────────────────────────

    /// @inheritdoc IReactive
    /// @dev Called by Reactive Network when a subscribed event is detected on the source chain.
    ///      Tracks blocked swap patterns and triggers cross-chain alerts when thresholds are met.
    function react(
        uint256 chainId,
        address contractAddress,
        bytes32 topic0,
        bytes32 topic1,  // poolId (indexed)
        bytes32 topic2,  // sender (indexed)
        bytes32, // topic3 unused
        bytes calldata data,
        uint256, // blockNumber
        uint256  // opCode
    ) external override {
        // Only process events from our monitored hook on the correct chain
        if (chainId != sourceChainId || contractAddress != sourceHookAddress) return;

        if (topic0 == SWAP_BLOCKED_TOPIC) {
            bytes32 poolId = topic1;
            address actor = address(uint160(uint256(topic2)));

            // Decode risk score from event data
            (uint256 riskScore, string memory reason) = abi.decode(data, (uint256, string));

            // Increment blocked count for this actor on this pool
            blockedCounts[poolId][actor]++;

            // If threshold met, trigger cross-chain alert
            if (blockedCounts[poolId][actor] >= ALERT_THRESHOLD) {
                bytes memory payload = abi.encode(
                    chainId,
                    poolId,
                    actor,
                    riskScore,
                    string(abi.encodePacked("Repeated blocks (", _uint2str(blockedCounts[poolId][actor]), "): ", reason))
                );

                emit Callback(destinationChainId, callbackContract, 200000, payload);

                // Reset counter after alert
                blockedCounts[poolId][actor] = 0;
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
