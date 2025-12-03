/**
 * Distributed Tracing System
 * OpenTelemetry-compatible tracing for edge functions
 */

import { Logger } from '../monitoring/Logger.ts';

const logger = new Logger('Tracer');

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  context: SpanContext;
  name: string;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
  status: SpanStatus;
  duration?: number;
}

export enum SpanKind {
  INTERNAL = 'INTERNAL',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
}

export enum SpanStatus {
  UNSET = 'UNSET',
  OK = 'OK',
  ERROR = 'ERROR',
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

/**
 * Distributed tracing system
 */
export class Tracer {
  private spans: Map<string, Span> = new Map();
  private activeSpanId?: string;
  private serviceName: string;

  constructor(serviceName: string = 'loopgpt') {
    this.serviceName = serviceName;
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: SpanAttributes;
      parentSpanId?: string;
    }
  ): Span {
    const context = this.createSpanContext(options?.parentSpanId);

    const span: Span = {
      context,
      name,
      kind: options?.kind || SpanKind.INTERNAL,
      startTime: Date.now(),
      attributes: {
        'service.name': this.serviceName,
        ...options?.attributes,
      },
      events: [],
      status: SpanStatus.UNSET,
    };

    this.spans.set(context.spanId, span);
    this.activeSpanId = context.spanId;

    logger.debug('Span started', {
      traceId: context.traceId,
      spanId: context.spanId,
      name,
    });

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, status: SpanStatus = SpanStatus.OK): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    logger.debug('Span ended', {
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      name: span.name,
      duration: span.duration,
      status,
    });

    // Export span (in production, send to OpenTelemetry collector)
    this.exportSpan(span);

    // Clear active span if this was it
    if (this.activeSpanId === span.context.spanId) {
      this.activeSpanId = span.context.parentSpanId;
    }
  }

  /**
   * Add event to span
   */
  addEvent(span: Span, name: string, attributes?: SpanAttributes): void {
    const event: SpanEvent = {
      name,
      timestamp: Date.now(),
      attributes,
    };

    span.events.push(event);

    logger.debug('Span event added', {
      spanId: span.context.spanId,
      event: name,
    });
  }

  /**
   * Set span attributes
   */
  setAttributes(span: Span, attributes: SpanAttributes): void {
    Object.assign(span.attributes, attributes);
  }

  /**
   * Record exception in span
   */
  recordException(span: Span, error: Error): void {
    this.addEvent(span, 'exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack,
    });

    span.status = SpanStatus.ERROR;
  }

  /**
   * Get active span
   */
  getActiveSpan(): Span | undefined {
    if (!this.activeSpanId) {
      return undefined;
    }

    return this.spans.get(this.activeSpanId);
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): Span[] {
    const spans: Span[] = [];

    for (const span of this.spans.values()) {
      if (span.context.traceId === traceId) {
        spans.push(span);
      }
    }

    return spans.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Create span context
   */
  private createSpanContext(parentSpanId?: string): SpanContext {
    const activeSpan = this.getActiveSpan();

    // If no parent specified, use active span as parent
    const actualParentSpanId = parentSpanId || activeSpan?.context.spanId;

    // If parent exists, use its trace ID, otherwise generate new one
    const traceId = activeSpan?.context.traceId || this.generateId(32);

    return {
      traceId,
      spanId: this.generateId(16),
      parentSpanId: actualParentSpanId,
      traceFlags: 1, // Sampled
    };
  }

  /**
   * Generate random ID
   */
  private generateId(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  /**
   * Export span to OpenTelemetry collector
   */
  private exportSpan(span: Span): void {
    // In production, send to OpenTelemetry collector
    // For now, just log
    logger.info('Span exported', {
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      name: span.name,
      duration: span.duration,
      status: span.status,
    });

    // TODO: Send to OpenTelemetry collector
    // const otlpEndpoint = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT');
    // if (otlpEndpoint) {
    //   await fetch(`${otlpEndpoint}/v1/traces`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(this.formatSpanForOTLP(span)),
    //   });
    // }
  }

  /**
   * Format span for OTLP export
   */
  private formatSpanForOTLP(span: Span): any {
    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
          ],
        },
        scopeSpans: [{
          spans: [{
            traceId: span.context.traceId,
            spanId: span.context.spanId,
            parentSpanId: span.context.parentSpanId,
            name: span.name,
            kind: span.kind,
            startTimeUnixNano: span.startTime * 1000000,
            endTimeUnixNano: span.endTime ? span.endTime * 1000000 : undefined,
            attributes: Object.entries(span.attributes).map(([key, value]) => ({
              key,
              value: this.formatAttributeValue(value),
            })),
            events: span.events.map(event => ({
              timeUnixNano: event.timestamp * 1000000,
              name: event.name,
              attributes: event.attributes ? Object.entries(event.attributes).map(([key, value]) => ({
                key,
                value: this.formatAttributeValue(value),
              })) : [],
            })),
            status: {
              code: span.status === SpanStatus.OK ? 1 : span.status === SpanStatus.ERROR ? 2 : 0,
            },
          }],
        }],
      }],
    };
  }

  /**
   * Format attribute value for OTLP
   */
  private formatAttributeValue(value: any): any {
    if (typeof value === 'string') {
      return { stringValue: value };
    } else if (typeof value === 'number') {
      return Number.isInteger(value) ? { intValue: value } : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      return { boolValue: value };
    } else {
      return { stringValue: String(value) };
    }
  }
}

/**
 * Global tracer instance
 */
export const tracer = new Tracer('loopgpt');

/**
 * Decorator to automatically trace function calls
 */
export function trace(name?: string, kind: SpanKind = SpanKind.INTERNAL) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const span = tracer.startSpan(spanName, { kind });

      try {
        const result = await originalMethod.apply(this, args);
        tracer.endSpan(span, SpanStatus.OK);
        return result;
      } catch (error) {
        tracer.recordException(span, error as Error);
        tracer.endSpan(span, SpanStatus.ERROR);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper to trace async operations
 */
export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    kind?: SpanKind;
    attributes?: SpanAttributes;
  }
): Promise<T> {
  const span = tracer.startSpan(name, options);

  try {
    const result = await fn(span);
    tracer.endSpan(span, SpanStatus.OK);
    return result;
  } catch (error) {
    tracer.recordException(span, error as Error);
    tracer.endSpan(span, SpanStatus.ERROR);
    throw error;
  }
}

/**
 * Helper to trace sync operations
 */
export function traceSync<T>(
  name: string,
  fn: (span: Span) => T,
  options?: {
    kind?: SpanKind;
    attributes?: SpanAttributes;
  }
): T {
  const span = tracer.startSpan(name, options);

  try {
    const result = fn(span);
    tracer.endSpan(span, SpanStatus.OK);
    return result;
  } catch (error) {
    tracer.recordException(span, error as Error);
    tracer.endSpan(span, SpanStatus.ERROR);
    throw error;
  }
}

/**
 * Standard span attributes
 */
export const SpanAttributes = {
  // HTTP attributes
  HTTP_METHOD: 'http.method',
  HTTP_URL: 'http.url',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',

  // Database attributes
  DB_SYSTEM: 'db.system',
  DB_NAME: 'db.name',
  DB_STATEMENT: 'db.statement',
  DB_OPERATION: 'db.operation',

  // RPC attributes
  RPC_SERVICE: 'rpc.service',
  RPC_METHOD: 'rpc.method',

  // User attributes
  USER_ID: 'user.id',
  USER_EMAIL: 'user.email',

  // Custom attributes
  ORDER_ID: 'order.id',
  PROVIDER: 'provider',
  CACHE_HIT: 'cache.hit',
};
