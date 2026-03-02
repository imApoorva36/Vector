// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVectorRiskRegistry} from "./interfaces/IVectorRiskRegistry.sol";
import {IPolicyEngine} from "./interfaces/IPolicyEngine.sol";

/// @title VectorHook
/// @notice Core hook logic for Uniswap v4 liquidity protection. Validates attestation and policy, emits events.
/// @dev When used with v4 PoolManager, beforeSwap/afterSwap will call _evaluateSwap and _emitSwapExecuted.
///      This contract exposes the same events and validation logic for testing and for a standalone validator.
contract VectorHook {
    IVectorRiskRegistry public immutable registry;
    IPolicyEngine public immutable policyEngine;

    event HookSwapEvaluated(bytes32 indexed poolId, address indexed sender, uint8 decision, uint256 riskScore);
    event SwapExecuted(bytes32 indexed poolId, address indexed sender, int128 amount0Delta, int128 amount1Delta);
    event SwapBlockedByPolicy(bytes32 poolId, uint256 riskScore, string reason);

    error SwapBlocked(string reason);

    constructor(address _registry, address _policyEngine) {
        registry = IVectorRiskRegistry(_registry);
        policyEngine = IPolicyEngine(_policyEngine);
    }

    /// @notice Full swap evaluation: decode hookData, verify attestation, evaluate policy. Reverts on BLOCK.
    /// @param poolId Pool identifier
    /// @param sender Swap initiator
    /// @param zeroForOne Swap direction
    /// @param amountSpecified Swap amount (signed)
    /// @param hookData ABI-encoded (riskScore, expiry, signature) or empty for no attestation
    /// @return decision 0=ALLOW, 1=WARN, 2=BLOCK (reverts before return for BLOCK)
    function evaluateSwap(
        bytes32 poolId,
        address sender,
        bool zeroForOne,
        int256 amountSpecified,
        bytes calldata hookData
    ) external returns (uint8 decision) {
        (uint8 protectionMode, uint256 blockThreshold, uint256 warnThreshold) =
            registry.getPoolProtection(poolId);

        bool hasAttestation = false;
        uint256 riskScore = 0;

        if (hookData.length >= 32) {
            (uint256 decodedScore,,) = abi.decode(hookData, (uint256, uint256, bytes));
            riskScore = decodedScore;

            if (registry.isTEEConfigured() && hookData.length > 64) {
                bool allowed = registry.verifyAttestation(poolId, zeroForOne, amountSpecified, hookData);
                if (!allowed) revert SwapBlocked("Invalid or high-risk attestation");
                hasAttestation = true;
            }
        }

        IPolicyEngine.Decision result = policyEngine.evaluate(
            poolId,
            sender,
            hasAttestation,
            protectionMode,
            riskScore
        );

        emit HookSwapEvaluated(poolId, sender, uint8(result), riskScore);

        if (result == IPolicyEngine.Decision.BLOCK) {
            emit SwapBlockedByPolicy(poolId, riskScore, "Policy engine blocked");
            revert SwapBlocked("Policy engine blocked");
        }

        return uint8(result);
    }

    /// @notice Emit SwapExecuted (called by afterSwap in v4 integration).
    function emitSwapExecuted(
        bytes32 poolId,
        address sender,
        int128 amount0Delta,
        int128 amount1Delta
    ) external {
        emit SwapExecuted(poolId, sender, amount0Delta, amount1Delta);
    }
}
