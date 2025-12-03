/**
 * Logger
 * Structured logging utility for edge functions
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  functionName?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Structured logger for edge functions
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {};

    this.log(LogLevel.ERROR, message, { ...context, ...errorContext });
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {};

    this.log(LogLevel.FATAL, message, { ...context, ...errorContext });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Skip if below minimum level
    if (this.shouldSkip(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    // Output to console (structured JSON for production)
    if (Deno.env.get('ENVIRONMENT') === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // Pretty print for development
      this.prettyPrint(entry);
    }

    // Send to external logging service (Better Stack, etc.)
    this.sendToExternalService(entry);
  }

  /**
   * Check if log should be skipped based on level
   */
  private shouldSkip(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ];

    const currentIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);

    return currentIndex < minIndex;
  }

  /**
   * Pretty print log entry for development
   */
  private prettyPrint(entry: LogEntry): void {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m', // Green
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level];

    console.log(
      `${color}[${entry.level}]${reset} ${entry.timestamp} - ${entry.message}`
    );

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('  Context:', entry.context);
    }

    if (entry.error) {
      console.log('  Error:', entry.error);
    }
  }

  /**
   * Send log to external logging service
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Only send WARN and above to external service
    if (
      entry.level !== LogLevel.WARN &&
      entry.level !== LogLevel.ERROR &&
      entry.level !== LogLevel.FATAL
    ) {
      return;
    }

    try {
      const logtailToken = Deno.env.get('LOGTAIL_TOKEN');
      if (!logtailToken) {
        return; // No token configured, skip
      }

      // Send to Better Stack (Logtail)
      await fetch('https://in.logtail.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${logtailToken}`,
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Don't throw if logging fails
      console.error('Failed to send log to external service:', error);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: Request, context?: LogContext): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      ...context,
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(res: Response, duration: number, context?: LogContext): void {
    this.info('HTTP Response', {
      status: res.status,
      duration,
      ...context,
    });
  }

  /**
   * Log function execution time
   */
  async logExecutionTime<T>(
    fn: () => Promise<T>,
    operation: string,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.info(`${operation} completed`, {
        duration,
        ...context,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(
        `${operation} failed`,
        error instanceof Error ? error : undefined,
        {
          duration,
          ...context,
        }
      );

      throw error;
    }
  }

  /**
   * Create request ID for tracing
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Extract user ID from request
   */
  static extractUserId(req: Request): string | undefined {
    // Try to extract from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      // This is a simplified example - in production, decode JWT
      return authHeader.split('_')[1] || 'unknown';
    }
    return undefined;
  }

  /**
   * Create logger from request
   */
  static fromRequest(req: Request, functionName: string): Logger {
    const requestId = Logger.generateRequestId();
    const userId = Logger.extractUserId(req);

    return new Logger({
      requestId,
      userId,
      functionName,
      method: req.method,
      url: req.url,
    });
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Middleware to add logging to edge functions
 */
export function withLogging(
  handler: (req: Request, logger: Logger) => Promise<Response>,
  functionName: string
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const logger = Logger.fromRequest(req, functionName);
    const startTime = Date.now();

    try {
      logger.logRequest(req);

      const response = await handler(req, logger);
      const duration = Date.now() - startTime;

      logger.logResponse(response, duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(
        'Request failed',
        error instanceof Error ? error : undefined,
        { duration }
      );

      throw error;
    }
  };
}
