import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  HookSwapEvaluated,
  SwapExecuted,
} from "../generated/VectorHook/VectorHook";
import { Pool, SwapEvaluation, SwapExecution, ProtocolStats } from "../generated/schema";

const DECISIONS = ["ALLOW", "WARN", "BLOCK"];

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

function getOrCreateStats(): ProtocolStats {
  let stats = ProtocolStats.load("global");
  if (!stats) {
    stats = new ProtocolStats("global");
    stats.totalPools = 0;
    stats.totalSwapEvaluations = BigInt.zero();
    stats.totalBlockedSwaps = BigInt.zero();
    stats.totalWarnedSwaps = BigInt.zero();
    stats.totalCrossChainAlerts = BigInt.zero();
  }
  return stats;
}

export function handleSwapEvaluated(event: HookSwapEvaluated): void {
  let poolId = event.params.poolId.toHexString();
  let pool = getOrCreatePool(poolId);

  let decision = event.params.decision;
  let decisionStr = decision < 3 ? DECISIONS[decision] : "UNKNOWN";

  pool.totalSwaps = pool.totalSwaps.plus(BigInt.fromI32(1));
  if (decisionStr == "BLOCK") {
    pool.blockedSwaps = pool.blockedSwaps.plus(BigInt.fromI32(1));
  } else if (decisionStr == "WARN") {
    pool.warnedSwaps = pool.warnedSwaps.plus(BigInt.fromI32(1));
  } else {
    pool.allowedSwaps = pool.allowedSwaps.plus(BigInt.fromI32(1));
  }
  pool.lastUpdated = event.block.timestamp;
  pool.save();

  // Create evaluation entity
  let evalId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let evaluation = new SwapEvaluation(evalId);
  evaluation.pool = poolId;
  evaluation.sender = event.params.sender;
  evaluation.decision = decisionStr;
  evaluation.riskScore = event.params.riskScore.toI32();
  evaluation.reason = null;
  evaluation.blockNumber = event.block.number;
  evaluation.timestamp = event.block.timestamp;
  evaluation.transactionHash = event.transaction.hash;
  evaluation.save();

  // Update global stats
  let stats = getOrCreateStats();
  stats.totalSwapEvaluations = stats.totalSwapEvaluations.plus(BigInt.fromI32(1));
  if (decisionStr == "BLOCK") {
    stats.totalBlockedSwaps = stats.totalBlockedSwaps.plus(BigInt.fromI32(1));
  } else if (decisionStr == "WARN") {
    stats.totalWarnedSwaps = stats.totalWarnedSwaps.plus(BigInt.fromI32(1));
  }
  stats.save();
}

export function handleSwapExecuted(event: SwapExecuted): void {
  let poolId = event.params.poolId.toHexString();
  let execId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let execution = new SwapExecution(execId);
  execution.pool = poolId;
  execution.sender = event.params.sender;
  execution.amount0Delta = event.params.amount0Delta;
  execution.amount1Delta = event.params.amount1Delta;
  execution.blockNumber = event.block.number;
  execution.timestamp = event.block.timestamp;
  execution.transactionHash = event.transaction.hash;
  execution.save();
}
