/**
 * Vector Attestation Signer
 *
 * Signs risk attestations that the VectorHook contract verifies on-chain.
 * Message format matches VectorRiskRegistry.verifyAttestation():
 *   keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId))
 *
 * TEE Abstraction: In production, this runs inside a Phala CVM or similar TEE enclave.
 * For development/testing, it runs as a standard Node.js signer with the same payload format.
 */

const { ethers } = require("ethers");

class AttestationSigner {
  /**
   * @param {string} privateKey - Hex private key (TEE_SIGNER_KEY)
   */
  constructor(privateKey) {
    if (!privateKey) throw new Error("AttestationSigner requires a private key");
    this.wallet = new ethers.Wallet(privateKey);
  }

  get address() {
    return this.wallet.address;
  }

  /**
   * Sign an attestation for on-chain verification.
   * @param {object} params
   * @param {string} params.poolId - bytes32 hex
   * @param {boolean} params.zeroForOne
   * @param {string} params.amountSpecified - int256 as string
   * @param {number} params.riskScore - 0-100
   * @param {number} params.expiry - Unix timestamp
   * @param {number} params.chainId
   * @returns {Promise<object>} { signature, encodedAttestation, messageHash }
   */
  async sign({ poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId }) {
    // Must match on-chain: keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId))
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bool", "int256", "uint256", "uint256", "uint256"],
        [poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId]
      )
    );

    // Sign the hash using EIP-191 personal sign (matches toEthSignedMessageHash on-chain)
    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

    // Encode for hookData: abi.encode(riskScore, expiry, signature)
    const encodedAttestation = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "bytes"],
      [riskScore, expiry, signature]
    );

    return {
      poolId,
      zeroForOne,
      amountSpecified,
      riskScore,
      expiry,
      chainId,
      signature,
      encodedAttestation,
      messageHash,
      signerAddress: this.address,
    };
  }
}

module.exports = { AttestationSigner };
