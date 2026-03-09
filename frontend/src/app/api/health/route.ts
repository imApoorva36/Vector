import { NextResponse } from "next/server";
import { getSigner, getCacheSize } from "../risk-engine/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const signer = getSigner();
  return NextResponse.json({
    status: "ok",
    signerAddress: signer?.address ?? null,
    signerConfigured: !!signer,
    rpcConfigured: !!process.env.RPC_URL,
    cacheSize: getCacheSize(),
    timestamp: Math.floor(Date.now() / 1000),
    ...(!signer && {
      hint: "Set TEE_SIGNER_KEY (and RPC_URL) in your hosting env (e.g. Vercel → Project Settings → Environment Variables). Leave NEXT_PUBLIC_RISK_API_URL empty to use this built-in API.",
    }),
  });
}
