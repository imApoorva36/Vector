// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IPolicyEngine} from "./interfaces/IPolicyEngine.sol";

/// @title PolicyEngine
/// @notice Deterministic policy evaluation: ALLOW, WARN, BLOCK. Hybrid: protected pools fail-closed, unprotected fail-open.
contract PolicyEngine is IPolicyEngine, Ownable, Pausable {
    uint256 public constant DEFAULT_BLOCK_THRESHOLD = 70;
    uint256 public constant DEFAULT_WARN_THRESHOLD = 31;

    uint256 public override blockThreshold = DEFAULT_BLOCK_THRESHOLD;
    uint256 public override warnThreshold = DEFAULT_WARN_THRESHOLD;

    event SwapEvaluated(bytes32 indexed poolId, address indexed sender, uint8 decision, uint256 riskScore);
    event SwapBlocked(bytes32 indexed poolId, address indexed sender, uint256 riskScore, string reason);
    event SwapWarned(bytes32 indexed poolId, address indexed sender, uint256 riskScore, string reason);
    event ThresholdsUpdated(uint256 blockThreshold, uint256 warnThreshold);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc IPolicyEngine
    function evaluate(
        bytes32 poolId,
        address sender,
        bool hasAttestation,
        uint8 protectionMode,
        uint256 riskScore
    ) external returns (Decision decision) {
        if (paused()) {
            _emitBlock(poolId, sender, riskScore, "Policy paused");
            return Decision.BLOCK;
        }

        bool isProtected = (protectionMode == 1);

        if (isProtected && !hasAttestation) {
            _emitBlock(poolId, sender, riskScore, "Protected pool requires attestation");
            return Decision.BLOCK;
        }

        if (riskScore >= blockThreshold) {
            if (isProtected) {
                _emitBlock(poolId, sender, riskScore, "Risk score exceeds block threshold");
                return Decision.BLOCK;
            }
            _emitWarn(poolId, sender, riskScore, "Risk score exceeds block threshold (unprotected)");
            return Decision.WARN;
        }

        if (riskScore >= warnThreshold) {
            _emitWarn(poolId, sender, riskScore, "Risk score in warn range");
            emit SwapEvaluated(poolId, sender, uint8(Decision.WARN), riskScore);
            return Decision.WARN;
        }

        emit SwapEvaluated(poolId, sender, uint8(Decision.ALLOW), riskScore);
        return Decision.ALLOW;
    }

    function _emitBlock(bytes32 poolId, address sender, uint256 riskScore, string memory reason) internal {
        emit SwapBlocked(poolId, sender, riskScore, reason);
        emit SwapEvaluated(poolId, sender, uint8(Decision.BLOCK), riskScore);
    }

    function _emitWarn(bytes32 poolId, address sender, uint256 riskScore, string memory reason) internal {
        emit SwapWarned(poolId, sender, riskScore, reason);
        emit SwapEvaluated(poolId, sender, uint8(Decision.WARN), riskScore);
    }

    function setThresholds(uint256 _blockThreshold, uint256 _warnThreshold) external onlyOwner {
        require(_warnThreshold < _blockThreshold, "Warn must be < block");
        blockThreshold = _blockThreshold;
        warnThreshold = _warnThreshold;
        emit ThresholdsUpdated(_blockThreshold, _warnThreshold);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
