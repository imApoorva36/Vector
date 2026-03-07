// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVectorRiskRegistry} from "./interfaces/IVectorRiskRegistry.sol";

/// @title VectorRiskRegistry
/// @notice On-chain pool config and TEE attestation verification for Vector Hook.
/// @dev Attestation message format matches risk-engine signer: keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId))
contract VectorRiskRegistry is IVectorRiskRegistry, Ownable {
    // ─── Pool protection config ─────────────────────────────────────────────
    struct PoolConfig {
        uint8 mode; // 0 = Unprotected, 1 = Protected
        uint256 blockThreshold;
        uint256 warnThreshold;
        bool exists;
    }
    mapping(bytes32 => PoolConfig) public poolConfigs;

    // ─── TEE signer (attestation verification) ──────────────────────────────
    address public teeSignerAddress;
    uint256 public riskThreshold; // default block above this (e.g. 70)

    // ─── Events ─────────────────────────────────────────────────────────────
    event PoolProtectionSet(bytes32 indexed poolId, uint8 mode, uint256 blockThreshold, uint256 warnThreshold);
    event PoolProtectionRemoved(bytes32 indexed poolId);
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event RiskThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ─── Errors ─────────────────────────────────────────────────────────────
    error TEENotConfigured();
    error InvalidTEEAttestation();
    error AttestationExpired();

    constructor(address initialOwner) Ownable(initialOwner) {
        riskThreshold = 70;
    }

    // Attestation verification (TEE signer, swap-bound message)
    /// @inheritdoc IVectorRiskRegistry
    function verifyAttestation(
        bytes32 poolId,
        bool zeroForOne,
        int256 amountSpecified,
        bytes calldata attestation
    ) external view returns (bool allowed) {
        if (teeSignerAddress == address(0)) revert TEENotConfigured();

        (uint256 riskScore, uint256 expiry, bytes memory signature) =
            abi.decode(attestation, (uint256, uint256, bytes));

        if (block.timestamp > expiry) revert AttestationExpired();

        // Must match risk-engine signer: keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainid))
        bytes32 messageHash = keccak256(
            abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, block.chainid)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recovered = _recoverSigner(ethSignedHash, signature);
        if (recovered != teeSignerAddress) revert InvalidTEEAttestation();

        uint256 threshold = riskThreshold > 0 ? riskThreshold : 70;
        return riskScore < threshold;
    }

    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v");
        return ecrecover(hash, v, r, s);
    }

    /// @inheritdoc IVectorRiskRegistry
    function getPoolProtection(bytes32 poolId)
        external
        view
        returns (uint8 mode, uint256 blockThreshold, uint256 warnThreshold)
    {
        PoolConfig memory c = poolConfigs[poolId];
        if (!c.exists) {
            return (0, 70, 31); // Unprotected defaults
        }
        return (c.mode, c.blockThreshold, c.warnThreshold);
    }

    /// @inheritdoc IVectorRiskRegistry
    function getSigner() external view returns (address) {
        return teeSignerAddress;
    }

    /// @inheritdoc IVectorRiskRegistry
    function isTEEConfigured() external view returns (bool) {
        return teeSignerAddress != address(0);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────
    function setTEESigner(address signer) external onlyOwner {
        address old = teeSignerAddress;
        teeSignerAddress = signer;
        emit SignerUpdated(old, signer);
    }

    function setRiskThreshold(uint256 threshold) external onlyOwner {
        require(threshold <= 100, "Threshold must be <= 100");
        uint256 old = riskThreshold;
        riskThreshold = threshold;
        emit RiskThresholdUpdated(old, threshold);
    }

    function setPoolProtection(
        bytes32 poolId,
        uint8 mode,
        uint256 blockThreshold,
        uint256 warnThreshold
    ) external onlyOwner {
        require(mode <= 1, "Invalid mode");
        require(warnThreshold < blockThreshold, "Warn must be < block");
        poolConfigs[poolId] = PoolConfig({
            mode: mode,
            blockThreshold: blockThreshold,
            warnThreshold: warnThreshold,
            exists: true
        });
        emit PoolProtectionSet(poolId, mode, blockThreshold, warnThreshold);
    }

    function removePoolProtection(bytes32 poolId) external onlyOwner {
        delete poolConfigs[poolId];
        emit PoolProtectionRemoved(poolId);
    }
}
