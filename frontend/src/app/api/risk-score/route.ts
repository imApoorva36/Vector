import { NextRequest } from "next/server";
import { handleRiskScoreRequest } from "../risk-engine/riskScoreHandler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleRiskScoreRequest(req);
}
