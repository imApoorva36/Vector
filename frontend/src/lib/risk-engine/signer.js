/**
 * Vector Attestation Signer
 *
 * Signs risk attestations that the VectorHook contract verifies on-chain.
 * Message format matches VectorRiskRegistry.verifyAttestation():
 *   keccak256(abi.encode(poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId))
 */

const { ethers } = require("ethers");

class AttestationSigner {
  constructor(privateKey) {
    if (!privateKey) throw new Error("AttestationSigner requires a private key");
    this.wallet = new ethers.Wallet(privateKey);
  }

  get address() {
    return this.wallet.address;
  }

  async sign({ poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId }) {
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bool", "int256", "uint256", "uint256", "uint256"],
        [poolId, zeroForOne, amountSpecified, riskScore, expiry, chainId]
      )
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

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
