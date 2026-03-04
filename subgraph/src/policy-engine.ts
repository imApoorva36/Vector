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
  // Already handled by VectorHook handler — skip duplicate counting
}

export function handlePolicySwapBlocked(event: SwapBlocked): void {
  let poolId = event.params.poolId.toHexString();
  let evalId = event.transaction.hash.toHexString() + "-policy-blocked-" + event.logIndex.toString();

  let evaluation = new SwapEvaluation(evalId);
  evaluation.pool = poolId;
  evaluation.sender = event.params.sender;
  evaluation.decision = "BLOCK";
  evaluation.riskScore = event.params.riskScore.toI32();
  evaluation.reason = event.params.reason;
  evaluation.blockNumber = event.block.number;
  evaluation.timestamp = event.block.timestamp;
  evaluation.transactionHash = event.transaction.hash;
  evaluation.save();
}

export function handlePolicySwapWarned(event: SwapWarned): void {
  let poolId = event.params.poolId.toHexString();
  let evalId = event.transaction.hash.toHexString() + "-policy-warned-" + event.logIndex.toString();

  let evaluation = new SwapEvaluation(evalId);
  evaluation.pool = poolId;
  evaluation.sender = event.params.sender;
  evaluation.decision = "WARN";
  evaluation.riskScore = event.params.riskScore.toI32();
  evaluation.reason = event.params.reason;
  evaluation.blockNumber = event.block.number;
  evaluation.timestamp = event.block.timestamp;
  evaluation.transactionHash = event.transaction.hash;
  evaluation.save();
}
