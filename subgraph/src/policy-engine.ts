import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SwapEvaluated,
  SwapBlocked,
  SwapWarned,
} from "../generated/PolicyEngine/PolicyEngine";
import { SwapEvaluation, Pool, ProtocolStats } from "../generated/schema";

function getOrCreatePool(poolId: string): Pool {
  let pool = Pool.load(poolId);
  if (!pool) {
    pool = new Pool(poolId);
    pool.token0 = Bytes.empty();
    pool.token1 = Bytes.empty();
    pool.fee = 0;
    pool.protectionMode = "Unprotected";
    pool.blockThreshold = 70;
    pool.warnThreshold = 31;
    pool.totalSwaps = BigInt.zero();
    pool.blockedSwaps = BigInt.zero();
    pool.warnedSwaps = BigInt.zero();
    pool.allowedSwaps = BigInt.zero();
    pool.lastUpdated = BigInt.zero();
  }
  return pool;
}

export function handlePolicySwapEvaluated(event: SwapEvaluated): void {
  // Already handled by VectorHook handler; skip duplicate counting
}

export function handlePolicySwapBlocked(event: SwapBlocked): void {
  // Handled by VectorHook handler (handleSwapBlocked); skip to avoid duplicate SwapEvaluation entities
}

export function handlePolicySwapWarned(event: SwapWarned): void {
  // Handled by VectorHook handler (handleSwapEvaluated); skip to avoid duplicate SwapEvaluation entities
}
