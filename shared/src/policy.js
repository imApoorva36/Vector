/**
 * Policy decision constants — must match IPolicyEngine.Decision enum (0=ALLOW, 1=WARN, 2=BLOCK).
 */

export const POLICY_DECISION = {
  ALLOW: 0,
  WARN: 1,
  BLOCK: 2,
};

/** @type {readonly ["ALLOW", "WARN", "BLOCK"]} */
export const POLICY_DECISION_LABELS = ["ALLOW", "WARN", "BLOCK"];

/**
 * @param {number} decision
 * @returns {"ALLOW"|"WARN"|"BLOCK"}
 */
export function decisionLabel(decision) {
  return POLICY_DECISION_LABELS[decision] ?? "ALLOW";
}
