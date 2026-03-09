import { NextRequest, NextResponse } from "next/server";
import { getSigner, getDefaultProvider } from "./shared";

const NONCE_WINDOW_MS = parseInt(process.env.NONCE_WINDOW_MS || "300000", 10);
const seenNonces = new Map<string, number>();

function getAssessSwapRisk() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("risk-engine").assessSwapRisk;
}

export async function handleRiskScoreRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const {
      poolId,
      token0: t0,
      token1: t1,
      tokenIn,
      tokenOut,
      zeroForOne,
      amountSpecified,
      amountIn,
      sender,
      chainId = 1,
      rpcUrl,
      nonce,
    } = body;
    const token0 = t0 ?? tokenIn;
    const token1 = t1 ?? tokenOut;
    const amount = amountSpecified ?? amountIn ?? "0";

    if (nonce != null && nonce !== "") {
      const key = String(nonce);
      const now = Date.now();
      if (seenNonces.has(key) && (seenNonces.get(key) ?? 0) > now) {
        return NextResponse.json(
          { error: "Nonce already used", code: "REPLAY" },
          { status: 409 }
        );
      }
      seenNonces.set(key, now + NONCE_WINDOW_MS);
    }

    if (!poolId || !token0 || !token1) {
      return NextResponse.json(
        { error: "Missing required fields: poolId, token0/tokenIn, token1/tokenOut" },
        { status: 400 }
      );
    }

    let provider = getDefaultProvider();
    if (rpcUrl && typeof rpcUrl === "string") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ethers } = require("ethers");
      provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    const assessSwapRisk = getAssessSwapRisk();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ethers } = require("ethers");

    const assessment = await assessSwapRisk({
      poolId,
      token0,
      token1,
      zeroForOne: zeroForOne ?? true,
      amountSpecified: amount,
      sender: sender ?? ethers.ZeroAddress,
      chainId,
      provider: provider || undefined,
    });

    const signer = getSigner();
    let attestation: { signature: string; expiry: number; signer: string } | null = null;
    if (signer) {
      const expiry = Math.floor(Date.now() / 1000) + 300;
      const signed = await signer.sign({
        poolId,
        zeroForOne: zeroForOne ?? true,
        amountSpecified: amount,
        riskScore: assessment.riskScore,
        expiry,
        chainId,
      }) as { signature: string; expiry: number; signerAddress: string };
      attestation = {
        signature: signed.signature,
        expiry: signed.expiry,
        signer: signed.signerAddress ?? signer.address,
      };
    }

    const breakdown = (assessment.signals || []).map((s: { type?: string; reasonCode?: string; score?: number; reason?: string }) => ({
      layer: s.type ?? "SIGNAL",
      reasonCode: s.reasonCode ?? null,
      score: s.score ?? 0,
      details: s.reason ?? "",
    }));

    return NextResponse.json({
      riskScore: assessment.riskScore,
      decision: assessment.decision,
      breakdown,
      attestation,
      assessment,
      signerAddress: signer?.address ?? null,
    });
  } catch (err) {
    console.error("Risk score error", err);
    return NextResponse.json(
      { error: "Internal risk engine error" },
      { status: 500 }
    );
  }
}
