// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IReactiveCallback} from "./interfaces/IReactiveCallback.sol";

/// @title VectorReactiveCallback
/// @notice Destination-chain contract that receives cross-chain callbacks from the
///         Reactive Smart Contract (VectorReactiveRSC).
contract VectorReactiveCallback is IReactiveCallback, Ownable {
    mapping(address => bool) public authorizedRSCs;

    struct RiskAlert {
        uint256 sourceChainId;
        bytes32 poolId;
        address actor;
        uint256 riskScore;
        uint256 timestamp;
        string reason;
    }

    mapping(bytes32 => RiskAlert) public latestAlert;
    RiskAlert[] public alerts;

    event RSCAuthorized(address indexed rsc);
    event RSCRevoked(address indexed rsc);
    event CrossChainRiskAlert(
        uint256 indexed sourceChainId,
        bytes32 indexed poolId,
        address indexed actor,
        uint256 riskScore,
        string reason
    );

    error UnauthorizedRSC(address caller);

    constructor() Ownable(msg.sender) {}

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

    function getAlertCount() external view returns (uint256) {
        return alerts.length;
    }

    function getLatestAlert(bytes32 poolId) external view returns (RiskAlert memory) {
        return latestAlert[poolId];
    }

    function authorizeRSC(address rsc) external onlyOwner {
        authorizedRSCs[rsc] = true;
        emit RSCAuthorized(rsc);
    }

    function revokeRSC(address rsc) external onlyOwner {
        authorizedRSCs[rsc] = false;
        emit RSCRevoked(rsc);
    }
}
