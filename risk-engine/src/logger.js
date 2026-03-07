/**
 * Structured JSON logger for risk engine. One JSON object per line for log aggregation.
 * Set LOG_JSON=1 to enable; otherwise falls back to readable console lines.
 */

const LOG_JSON = process.env.LOG_JSON === "1" || process.env.LOG_JSON === "true";

function log(level, message, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  if (LOG_JSON) {
    console.log(JSON.stringify(entry));
  } else {
    const prefix = `[${entry.ts}] [${level}]`;
    const extra = Object.keys(fields).length ? " " + JSON.stringify(fields) : "";
    console.log(`${prefix} ${message}${extra}`);
  }
}

module.exports = {
  info: (msg, fields) => log("INFO", msg, fields),
  warn: (msg, fields) => log("WARN", msg, fields),
  error: (msg, fields) => log("ERROR", msg, fields),
};
