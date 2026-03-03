/**
 * Vector Risk Engine — Express API Server
 *
 * Endpoints:
 *   POST /api/risk-score     — Assess swap risk and return attested score
 *   GET  /api/health         — Health check with signer address and cache stats
 *
 * Environment:
 *   TEE_SIGNER_KEY           — Private key for attestation signing (required)
 *   RPC_URL                  — Default RPC URL for on-chain lookups (optional)
 *   PORT                     — Server port (default: 3001)
 *   RATE_LIMIT_WINDOW_MS     — Rate limit window (default: 60000)
 *   RATE_LIMIT_MAX           — Max requests per window (default: 100)
 */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const { assessSwapRisk } = require("./index");
const { AttestationSigner } = require("./attestation/signer");
const { size: cacheSize } = require("./cache");

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
});
app.use("/api/", limiter);

// Initialize signer
const TEE_SIGNER_KEY = process.env.TEE_SIGNER_KEY;
let signer = null;
if (TEE_SIGNER_KEY) {
  signer = new AttestationSigner(TEE_SIGNER_KEY);
  console.log(`[Vector] TEE signer initialized: ${signer.address}`);
} else {
  console.warn("[Vector] WARNING: TEE_SIGNER_KEY not set — attestations will be unavailable");
}

// Default provider
const RPC_URL = process.env.RPC_URL;
let defaultProvider = null;
if (RPC_URL) {
  defaultProvider = new ethers.JsonRpcProvider(RPC_URL);
}

// ─── POST /api/risk-score ────────────────────────────────────────────

app.post("/api/risk-score", async (req, res) => {
  try {
    const {
      poolId,
      token0,
      token1,
      zeroForOne,
      amountSpecified,
      sender,
      chainId = 1,
      rpcUrl,
    } = req.body;

    if (!poolId || !token0 || !token1) {
      return res.status(400).json({ error: "Missing required fields: poolId, token0, token1" });
    }

    // Use request-provided RPC or default
    let provider = defaultProvider;
    if (rpcUrl) {
      provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    // Assess risk
    const assessment = await assessSwapRisk({
      poolId,
      token0,
      token1,
      zeroForOne: zeroForOne ?? true,
      amountSpecified: amountSpecified || "0",
      sender: sender || ethers.ZeroAddress,
      chainId,
      provider,
    });

    // Sign attestation if signer is available
    let attestation = null;
    if (signer) {
      const expiry = Math.floor(Date.now() / 1000) + 300; // 5 min TTL
      attestation = await signer.sign({
        poolId,
        zeroForOne: zeroForOne ?? true,
        amountSpecified: amountSpecified || "0",
        riskScore: assessment.riskScore,
        expiry,
        chainId,
      });
    }

    return res.json({
      assessment,
      attestation,
      signerAddress: signer?.address || null,
    });
  } catch (err) {
    console.error("[Vector] Risk score error:", err.message);
    return res.status(500).json({ error: "Internal risk engine error" });
  }
});

// ─── GET /api/health ─────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    signerAddress: signer?.address || null,
    signerConfigured: !!signer,
    rpcConfigured: !!defaultProvider,
    cacheSize: cacheSize(),
    timestamp: Math.floor(Date.now() / 1000),
  });
});

// ─── Start ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001");
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Vector Risk Engine] Running on port ${PORT}`);
  });
}

module.exports = { app };
