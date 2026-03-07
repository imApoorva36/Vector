/**
 * Attestation payload shape for risk engine → hook.
 * On-chain: abi.encode(riskScore, expiry, signature)
 * Signed message: keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId))
 */

/**
 * @typedef {Object} AttestationPayload
 * @property {number} riskScore - 0-100
 * @property {number} expiry - Unix timestamp
 * @property {string} signature - 65-byte hex (r,s,v)
 * @property {string} [encodedAttestation] - abi.encode(riskScore, expiry, signature) for hookData
 */

/**
 * @typedef {Object} RiskAssessmentRequest
 * @property {string} poolId - bytes32 hex
 * @property {string} token0 - token address
 * @property {string} token1 - token address
 * @property {boolean} [zeroForOne]
 * @property {string} [amountSpecified] - wei string
 * @property {string} [sender] - address
 * @property {number} [chainId]
 */

/**
 * @typedef {Object} RiskAssessmentResponse
 * @property {number} riskScore
 * @property {"ALLOW"|"WARN"|"BLOCK"} decision
 * @property {Array<{ type: string, reason: string, score: number }>} signals
 * @property {AttestationPayload|null} [attestation]
 */
