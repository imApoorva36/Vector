import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { CrossChainRiskAlert } from "../generated/VectorReactiveCallback/VectorReactiveCallback";
import { CrossChainAlert, Pool, ProtocolStats } from "../generated/schema";

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

export function handleCrossChainAlert(event: CrossChainRiskAlert): void {
  let alertId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let poolId = event.params.poolId.toHexString();

  // Ensure pool exists
  let pool = getOrCreatePool(poolId);
  pool.lastUpdated = event.block.timestamp;
  pool.save();

  let alert = new CrossChainAlert(alertId);
  alert.sourceChainId = event.params.sourceChainId;
  alert.pool = poolId;
  alert.actor = event.params.actor;
  alert.riskScore = event.params.riskScore.toI32();
  alert.reason = event.params.reason;
  alert.timestamp = event.block.timestamp;
  alert.blockNumber = event.block.number;
  alert.save();

  // Update stats
  let stats = ProtocolStats.load("global");
  if (!stats) {
    stats = new ProtocolStats("global");
    stats.totalPools = 0;
    stats.totalSwapEvaluations = BigInt.zero();
    stats.totalBlockedSwaps = BigInt.zero();
    stats.totalWarnedSwaps = BigInt.zero();
    stats.totalCrossChainAlerts = BigInt.zero();
  }
  stats.totalCrossChainAlerts = stats.totalCrossChainAlerts.plus(BigInt.fromI32(1));
  stats.save();
}
