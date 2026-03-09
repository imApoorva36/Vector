const path = require("path");
// Load .env from risk-engine directory (works whether started from risk-engine/ or repo root)
const envPath = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: envPath, quiet: true });

/**
 * Vector Risk Engine - Express API Server
 *
 * Endpoints:
 *   POST /api/risk-score     - Assess swap risk and return attested score
 *   GET  /api/health         - Health check with signer address and cache stats
 *
 * Environment:
 *   TEE_SIGNER_KEY           - Private key for attestation signing (required)
 *   RPC_URL                  - Default RPC URL for on-chain lookups (optional)
 *   PORT                     - Server port (default: 3001)
 *   RATE_LIMIT_WINDOW_MS     - Rate limit window (default: 60000)
 *   RATE_LIMIT_MAX           - Max requests per window (default: 100)
 */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const { assessSwapRisk } = require("./index");
const { AttestationSigner } = require("./attestation/signer");
const { size: cacheSize } = require("./cache");
const logger = require("./logger");

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

// Initialize signer (trim to avoid spaces from .env)
const TEE_SIGNER_KEY = (process.env.TEE_SIGNER_KEY || "").trim();
let signer = null;
if (TEE_SIGNER_KEY) {
  try {
    signer = new AttestationSigner(TEE_SIGNER_KEY);
    logger.info("TEE signer initialized", { signerAddress: signer.address });
  } catch (err) {
    logger.warn("TEE_SIGNER_KEY invalid; attestations unavailable", { error: err.message });
  }
} else {
  logger.warn("TEE_SIGNER_KEY not set; attestations will be unavailable. Set it in risk-engine/.env and restart.");
}

// Default provider
const RPC_URL = process.env.RPC_URL;
let defaultProvider = null;
if (RPC_URL) {
  defaultProvider = new ethers.JsonRpcProvider(RPC_URL);
}

// Optional request nonce for replay protection (if client sends nonce, duplicates rejected within window)
const NONCE_WINDOW_MS = parseInt(process.env.NONCE_WINDOW_MS || "300000"); // 5 min
const seenNonces = new Map(); // nonce -> expiry timestamp
setInterval(() => {
  const now = Date.now();
  for (const [key, exp] of seenNonces.entries()) {
    if (exp < now) seenNonces.delete(key);
  }
}, 60000);

// ─── POST /api/risk-score ────────────────────────────────────────────

app.post("/api/risk-score", async (req, res) => {
  try {
    const {
      poolId,
      token0: t0,
      token1: t1,
      tokenIn,
      tokenOut,
      zeroForOne,
      amountSpecified,
      sender,
      chainId = 1,
      rpcUrl,
      nonce,
    } = req.body;
    const token0 = t0 || tokenIn;
    const token1 = t1 || tokenOut;

    if (nonce != null && nonce !== "") {
      const key = String(nonce);
      const now = Date.now();
      if (seenNonces.has(key) && seenNonces.get(key) > now) {
        return res.status(409).json({ error: "Nonce already used", code: "REPLAY" });
      }
      seenNonces.set(key, now + NONCE_WINDOW_MS);
    }

    if (!poolId || !token0 || !token1) {
      return res.status(400).json({ error: "Missing required fields: poolId, token0/tokenIn, token1/tokenOut" });
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
      amountSpecified: amountSpecified || req.body.amountIn || "0",
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
        amountSpecified: amountSpecified || req.body.amountIn || "0",
        riskScore: assessment.riskScore,
        expiry,
        chainId,
      });
    }

    const breakdown = (assessment.signals || []).map((s) => ({
      layer: s.type || "SIGNAL",
      reasonCode: s.reasonCode || null,
      score: s.score ?? 0,
      details: s.reason || "",
    }));

    return res.json({
      riskScore: assessment.riskScore,
      decision: assessment.decision,
      breakdown,
      attestation: attestation
        ? {
            signature: attestation.signature,
            expiry: attestation.expiry,
            signer: attestation.signerAddress || signer?.address,
          }
        : null,
      assessment,
      signerAddress: signer?.address || null,
    });
  } catch (err) {
    logger.error("Risk score error", { error: err.message, stack: err.stack });
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
    ...(!signer && { hint: "Set TEE_SIGNER_KEY in risk-engine/.env and restart the risk engine." }),
  });
});

// ─── Start ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001");
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info("Risk engine listening", { port: PORT });
  });
}

module.exports = { app };
