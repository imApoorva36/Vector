// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPolicyEngine {
    enum Decision {
        ALLOW,
        WARN,
        BLOCK
    }

    function evaluate(
        bytes32 poolId,
        address sender,
        bool hasAttestation,
        uint8 protectionMode,
        uint256 riskScore
    ) external returns (Decision decision);

    function paused() external view returns (bool);

    function warnThreshold() external view returns (uint256);

    function blockThreshold() external view returns (uint256);
}
