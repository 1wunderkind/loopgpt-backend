// Logging middleware for Edge Functions

export interface LogContext {
  functionName?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export function logInfo(message: string, context?: LogContext) {
  console.log(JSON.stringify({
    level: 'info',
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  console.error(JSON.stringify({
    level: 'error',
    message,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export function logWarning(message: string, context?: LogContext) {
  console.warn(JSON.stringify({
    level: 'warning',
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export function logDebug(message: string, context?: LogContext) {
  if (Deno.env.get('DEBUG') === 'true') {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      ...context,
      timestamp: new Date().toISOString(),
    }));
  }
}

