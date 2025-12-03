/**
 * Structured Logging for TheLoopGPT MCP Tools
 * JSON-formatted logs for easy parsing
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: any;
}

function log(level: LogLevel, msg: string, meta?: LogMeta) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: msg,
    ...meta,
  };

  const output = JSON.stringify(logEntry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export function logDebug(msg: string, meta?: LogMeta) {
  log("debug", msg, meta);
}

export function logInfo(msg: string, meta?: LogMeta) {
  log("info", msg, meta);
}

export function logWarn(msg: string, meta?: LogMeta) {
  log("warn", msg, meta);
}

export function logError(msg: string, meta?: LogMeta) {
  log("error", msg, meta);
}

/**
 * Log tool execution
 */
export function logToolStart(toolName: string, meta?: LogMeta) {
  logInfo(`Tool started: ${toolName}`, {
    tool: toolName,
    phase: "start",
    ...meta,
  });
}

export function logToolSuccess(toolName: string, durationMs: number, meta?: LogMeta) {
  logInfo(`Tool completed: ${toolName}`, {
    tool: toolName,
    phase: "complete",
    durationMs,
    success: true,
    ...meta,
  });
}

export function logToolError(toolName: string, error: Error, durationMs: number, meta?: LogMeta) {
  logError(`Tool failed: ${toolName}`, {
    tool: toolName,
    phase: "error",
    durationMs,
    success: false,
    error: error.message,
    errorType: error.name,
    stack: error.stack,
    ...meta,
  });
}
