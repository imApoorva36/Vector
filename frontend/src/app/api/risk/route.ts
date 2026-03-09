import { NextRequest } from "next/server";
import { handleRiskScoreRequest } from "../risk-engine/riskScoreHandler";

export const dynamic = "force-dynamic";

/** POST /api/risk — same as /api/risk-score (assess swap risk, optional attestation). */
export async function POST(req: NextRequest) {
  return handleRiskScoreRequest(req);
}
