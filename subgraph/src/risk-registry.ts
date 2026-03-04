import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  PoolProtectionSet,
  PoolProtectionRemoved,
  SignerUpdated,
} from "../generated/VectorRiskRegistry/VectorRiskRegistry";
import { Pool, PolicyChange, ProtocolStats } from "../generated/schema";

const MODES = ["Unprotected", "Protected"];

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

export function handlePoolProtectionSet(event: PoolProtectionSet): void {
  let poolId = event.params.poolId.toHexString();
  let pool = getOrCreatePool(poolId);

  let oldMode = pool.protectionMode;
  let modeIdx = event.params.mode;
  let newMode = modeIdx < 2 ? MODES[modeIdx] : "Unknown";

  pool.protectionMode = newMode;
  pool.blockThreshold = event.params.blockThreshold.toI32();
  pool.warnThreshold = event.params.warnThreshold.toI32();
  pool.lastUpdated = event.block.timestamp;
  pool.save();

  // Track policy change
  let changeId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let change = new PolicyChange(changeId);
  change.pool = poolId;
  change.oldMode = oldMode;
  change.newMode = newMode;
  change.blockThreshold = event.params.blockThreshold.toI32();
  change.warnThreshold = event.params.warnThreshold.toI32();
  change.timestamp = event.block.timestamp;
  change.blockNumber = event.block.number;
  change.save();

  // Update stats
  let stats = getOrCreateStats();
  if (oldMode == "Unprotected" && newMode == "Protected") {
    stats.totalPools++;
  }
  stats.save();
}

export function handlePoolProtectionRemoved(event: PoolProtectionRemoved): void {
  let poolId = event.params.poolId.toHexString();
  let pool = getOrCreatePool(poolId);
  pool.protectionMode = "Unprotected";
  pool.lastUpdated = event.block.timestamp;
  pool.save();

  let stats = getOrCreateStats();
  if (stats.totalPools > 0) stats.totalPools--;
  stats.save();
}

export function handleSignerUpdated(event: SignerUpdated): void {
  // Log for observability — no entity needed
}
