// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IReactiveCallback} from "./interfaces/IReactive.sol";

/// @title VectorReactiveCallback
/// @notice Destination-chain contract that receives cross-chain callbacks from the
///         Reactive Smart Contract (VectorReactiveRSC). Updates risk parameters or
///         triggers policy actions based on events observed on other chains.
///
/// @dev Deployed on the same chain as VectorHook / VectorRiskRegistry.
///      The RSC on Reactive Network monitors events (e.g. repeated blocked swaps,
///      risk threshold breaches) and triggers callbacks here to update pool risk
///      caches or flag suspicious actors cross-chain.
contract VectorReactiveCallback is IReactiveCallback, Ownable {
    // ─── State ───────────────────────────────────────────────────────────

    /// @notice Authorized RSC addresses that can trigger callbacks
    mapping(address => bool) public authorizedRSCs;

    /// @notice Cross-chain risk alerts received
    struct RiskAlert {
        uint256 sourceChainId;
        bytes32 poolId;
        address actor;
        uint256 riskScore;
        uint256 timestamp;
        string reason;
    }

    /// @notice Most recent alerts per pool
    mapping(bytes32 => RiskAlert) public latestAlert;

    /// @notice All alerts for enumeration
    RiskAlert[] public alerts;

    // ─── Events ──────────────────────────────────────────────────────────

    event RSCAuthorized(address indexed rsc);
    event RSCRevoked(address indexed rsc);
    event CrossChainRiskAlert(
        uint256 indexed sourceChainId,
        bytes32 indexed poolId,
        address indexed actor,
        uint256 riskScore,
        string reason
    );
    event PolicyActionTriggered(bytes32 indexed poolId, string action);

    // ─── Errors ──────────────────────────────────────────────────────────

    error UnauthorizedRSC(address caller);

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Reactive Callback ───────────────────────────────────────────────

    /// @inheritdoc IReactiveCallback
    /// @dev Payload encoding: abi.encode(sourceChainId, poolId, actor, riskScore, reason)
    function reactiveCallback(address sender, bytes calldata payload) external override {
        if (!authorizedRSCs[sender]) revert UnauthorizedRSC(sender);

        (
            uint256 sourceChainId,
            bytes32 poolId,
            address actor,
            uint256 riskScore,
            string memory reason
        ) = abi.decode(payload, (uint256, bytes32, address, uint256, string));

        RiskAlert memory alert = RiskAlert({
            sourceChainId: sourceChainId,
            poolId: poolId,
            actor: actor,
            riskScore: riskScore,
            timestamp: block.timestamp,
            reason: reason
        });

        latestAlert[poolId] = alert;
        alerts.push(alert);

        emit CrossChainRiskAlert(sourceChainId, poolId, actor, riskScore, reason);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getAlertCount() external view returns (uint256) {
        return alerts.length;
    }

    function getLatestAlert(bytes32 poolId) external view returns (RiskAlert memory) {
        return latestAlert[poolId];
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function authorizeRSC(address rsc) external onlyOwner {
        authorizedRSCs[rsc] = true;
        emit RSCAuthorized(rsc);
    }

    function revokeRSC(address rsc) external onlyOwner {
        authorizedRSCs[rsc] = false;
        emit RSCRevoked(rsc);
    }
}
