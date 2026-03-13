// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IVectorRiskRegistry {
    function verifyAttestation(
        bytes32 poolId,
        bool zeroForOne,
        int256 amountSpecified,
        bytes calldata attestation
    ) external view returns (bool allowed);

    function getPoolProtection(bytes32 poolId)
        external
        view
        returns (uint8 mode, uint256 blockThreshold, uint256 warnThreshold);

    function getSigner() external view returns (address);

    function isTEEConfigured() external view returns (bool);

    function isBlacklisted(address token) external view returns (bool);

    function setTokenBlacklist(address token, bool blacklisted) external;

    function batchSetTokenBlacklist(address[] calldata tokens, bool blacklisted) external;
}
