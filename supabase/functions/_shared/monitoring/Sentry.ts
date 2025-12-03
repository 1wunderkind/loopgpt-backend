/**
 * Sentry Integration
 * Error tracking and monitoring with Sentry
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
}

export interface SentryEvent {
  event_id: string;
  timestamp: number;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  message?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
          colno: number;
        }>;
      };
    }>;
  };
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
}

/**
 * Sentry client for edge functions
 */
export class SentryClient {
  private config: SentryConfig;
  private enabled: boolean;

  constructor(config?: Partial<SentryConfig>) {
    const dsn = config?.dsn || Deno.env.get('SENTRY_DSN') || '';
    const environment =
      config?.environment || Deno.env.get('ENVIRONMENT') || 'development';

    this.config = {
      dsn,
      environment,
      release: config?.release,
      sampleRate: config?.sampleRate || 1.0,
    };

    this.enabled = !!dsn;
  }

  /**
   * Capture exception
   */
  async captureException(
    error: Error,
    context?: {
      user?: { id?: string; email?: string };
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      request?: Request;
    }
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    const event = this.createEvent('error', error, context);

    try {
      await this.sendEvent(event);
    } catch (sendError) {
      console.error('Failed to send error to Sentry:', sendError);
    }
  }

  /**
   * Capture message
   */
  async captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: {
      user?: { id?: string; email?: string };
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const event: SentryEvent = {
      event_id: this.generateEventId(),
      timestamp: Date.now() / 1000,
      level,
      message,
      user: context?.user,
      tags: {
        ...context?.tags,
        environment: this.config.environment,
      },
      extra: context?.extra,
    };

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.error('Failed to send message to Sentry:', error);
    }
  }

  /**
   * Create Sentry event from error
   */
  private createEvent(
    level: 'fatal' | 'error' | 'warning',
    error: Error,
    context?: {
      user?: { id?: string; email?: string };
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      request?: Request;
    }
  ): SentryEvent {
    const event: SentryEvent = {
      event_id: this.generateEventId(),
      timestamp: Date.now() / 1000,
      level,
      exception: {
        values: [
          {
            type: error.name,
            value: error.message,
            stacktrace: this.parseStackTrace(error.stack),
          },
        ],
      },
      user: context?.user,
      tags: {
        ...context?.tags,
        environment: this.config.environment,
      },
      extra: context?.extra,
    };

    // Add request context if available
    if (context?.request) {
      event.request = {
        url: context.request.url,
        method: context.request.method,
        headers: Object.fromEntries(context.request.headers.entries()),
      };
    }

    return event;
  }

  /**
   * Parse stack trace
   */
  private parseStackTrace(stack?: string): {
    frames: Array<{
      filename: string;
      function: string;
      lineno: number;
      colno: number;
    }>;
  } | undefined {
    if (!stack) {
      return undefined;
    }

    const frames = stack
      .split('\n')
      .slice(1) // Skip first line (error message)
      .map((line) => {
        const match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
            colno: parseInt(match[4]),
          };
        }
        return null;
      })
      .filter((frame): frame is NonNullable<typeof frame> => frame !== null);

    return { frames };
  }

  /**
   * Send event to Sentry
   */
  private async sendEvent(event: SentryEvent): Promise<void> {
    const { dsn } = this.config;
    if (!dsn) {
      return;
    }

    // Parse DSN
    const dsnMatch = dsn.match(
      /^https:\/\/([^@]+)@([^\/]+)\/(.+)$/
    );
    if (!dsnMatch) {
      console.error('Invalid Sentry DSN format');
      return;
    }

    const [, publicKey, host, projectId] = dsnMatch;
    const url = `https://${host}/api/${projectId}/store/`;

    // Send to Sentry
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=loopgpt-edge/1.0`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error(
        'Failed to send event to Sentry:',
        response.status,
        await response.text()
      );
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }

  /**
   * Add breadcrumb (for context)
   */
  addBreadcrumb(
    message: string,
    category?: string,
    level?: 'info' | 'warning' | 'error'
  ): void {
    // Breadcrumbs would be stored in memory and sent with next event
    // Simplified for edge functions
    console.log(`[Breadcrumb] ${category || 'default'}: ${message}`);
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    // Store user context for subsequent events
    // Simplified for edge functions
    console.log('[Sentry] User context set:', user);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    // Store tag for subsequent events
    console.log(`[Sentry] Tag set: ${key}=${value}`);
  }
}

/**
 * Global Sentry instance
 */
export const sentry = new SentryClient();

/**
 * Middleware to add Sentry to edge functions
 */
export function withSentry(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      // Capture error in Sentry
      await sentry.captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          request: req,
          tags: {
            function: 'edge_function',
          },
        }
      );

      // Re-throw to be handled by error handler
      throw error;
    }
  };
}
