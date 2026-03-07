// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title VectorGovernance
/// @notice Lightweight owner/admin for Vector contracts. Registry and PolicyEngine have their own owners; this can be used as a single admin address.
contract VectorGovernance is Ownable2Step {
    constructor(address initialOwner) Ownable(initialOwner) {}
}
