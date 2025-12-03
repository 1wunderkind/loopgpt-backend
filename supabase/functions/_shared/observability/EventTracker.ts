/**
 * Custom Event Tracking System
 * Track business events, user actions, and system events
 */

import { Logger } from '../monitoring/Logger.ts';

const logger = new Logger('EventTracker');

export interface Event {
  id: string;
  name: string;
  category: EventCategory;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  metadata: EventMetadata;
}

export enum EventCategory {
  USER = 'user',
  SYSTEM = 'system',
  BUSINESS = 'business',
  PERFORMANCE = 'performance',
  ERROR = 'error',
}

export interface EventMetadata {
  source: string;
  environment: string;
  version: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface EventFilter {
  category?: EventCategory;
  name?: string;
  userId?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Event tracking system
 */
export class EventTracker {
  private events: Event[] = [];
  private maxEvents: number = 1000;
  private environment: string;
  private version: string;

  constructor() {
    this.environment = Deno.env.get('ENVIRONMENT') || 'development';
    this.version = Deno.env.get('VERSION') || '1.0.0';
  }

  /**
   * Track an event
   */
  track(
    name: string,
    properties: Record<string, any> = {},
    options?: {
      category?: EventCategory;
      userId?: string;
      sessionId?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Event {
    const event: Event = {
      id: this.generateEventId(),
      name,
      category: options?.category || EventCategory.SYSTEM,
      timestamp: Date.now(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      properties,
      metadata: {
        source: 'loopgpt',
        environment: this.environment,
        version: this.version,
        userAgent: options?.userAgent,
        ipAddress: options?.ipAddress,
      },
    };

    this.events.push(event);

    // Keep only last N events in memory
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    logger.info('Event tracked', {
      name,
      category: event.category,
      userId: event.userId,
    });

    // Export event (in production, send to analytics service)
    this.exportEvent(event);

    return event;
  }

  /**
   * Track user event
   */
  trackUser(
    name: string,
    userId: string,
    properties: Record<string, any> = {}
  ): Event {
    return this.track(name, properties, {
      category: EventCategory.USER,
      userId,
    });
  }

  /**
   * Track business event
   */
  trackBusiness(
    name: string,
    properties: Record<string, any> = {}
  ): Event {
    return this.track(name, properties, {
      category: EventCategory.BUSINESS,
    });
  }

  /**
   * Track performance event
   */
  trackPerformance(
    name: string,
    duration: number,
    properties: Record<string, any> = {}
  ): Event {
    return this.track(name, { duration, ...properties }, {
      category: EventCategory.PERFORMANCE,
    });
  }

  /**
   * Track error event
   */
  trackError(
    name: string,
    error: Error,
    properties: Record<string, any> = {}
  ): Event {
    return this.track(name, {
      error: error.message,
      stack: error.stack,
      ...properties,
    }, {
      category: EventCategory.ERROR,
    });
  }

  /**
   * Get events
   */
  getEvents(filter?: EventFilter): Event[] {
    let filtered = this.events;

    if (filter) {
      if (filter.category) {
        filtered = filtered.filter(e => e.category === filter.category);
      }

      if (filter.name) {
        filtered = filtered.filter(e => e.name === filter.name);
      }

      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId);
      }

      if (filter.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
      }

      if (filter.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return filtered;
  }

  /**
   * Get event counts by category
   */
  getEventCounts(): Record<EventCategory, number> {
    const counts: Record<EventCategory, number> = {
      [EventCategory.USER]: 0,
      [EventCategory.SYSTEM]: 0,
      [EventCategory.BUSINESS]: 0,
      [EventCategory.PERFORMANCE]: 0,
      [EventCategory.ERROR]: 0,
    };

    for (const event of this.events) {
      counts[event.category]++;
    }

    return counts;
  }

  /**
   * Clear events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export event to analytics service
   */
  private exportEvent(event: Event): void {
    // In production, send to analytics service (Mixpanel, Amplitude, etc.)
    // For now, just log
    logger.debug('Event exported', {
      id: event.id,
      name: event.name,
      category: event.category,
    });

    // TODO: Send to analytics service
    // const analyticsEndpoint = Deno.env.get('ANALYTICS_ENDPOINT');
    // if (analyticsEndpoint) {
    //   await fetch(analyticsEndpoint, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(event),
    //   });
    // }
  }
}

/**
 * Global event tracker instance
 */
export const eventTracker = new EventTracker();

/**
 * Standard event names
 */
export const Events = {
  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  USER_UPDATED_PROFILE: 'user.updated_profile',
  USER_DELETED_ACCOUNT: 'user.deleted_account',

  // Food events
  FOOD_SEARCHED: 'food.searched',
  FOOD_VIEWED: 'food.viewed',
  MEAL_LOGGED: 'meal.logged',
  MEAL_PLAN_CREATED: 'meal_plan.created',

  // Weight events
  WEIGHT_LOGGED: 'weight.logged',
  WEIGHT_GOAL_SET: 'weight.goal_set',
  WEIGHT_GOAL_REACHED: 'weight.goal_reached',

  // Order events
  ORDER_INITIATED: 'order.initiated',
  ORDER_QUOTED: 'order.quoted',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  ORDER_FAILED: 'order.failed',

  // Provider events
  PROVIDER_QUERIED: 'provider.queried',
  PROVIDER_SELECTED: 'provider.selected',
  PROVIDER_FALLBACK: 'provider.fallback',

  // Performance events
  API_REQUEST: 'api.request',
  API_RESPONSE: 'api.response',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  DB_QUERY: 'db.query',

  // Error events
  ERROR_VALIDATION: 'error.validation',
  ERROR_AUTHENTICATION: 'error.authentication',
  ERROR_AUTHORIZATION: 'error.authorization',
  ERROR_NOT_FOUND: 'error.not_found',
  ERROR_INTERNAL: 'error.internal',
  ERROR_EXTERNAL: 'error.external',

  // Business events
  REVENUE_GENERATED: 'revenue.generated',
  SUBSCRIPTION_STARTED: 'subscription.started',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  REFERRAL_COMPLETED: 'referral.completed',
};

/**
 * Helper functions for common event tracking
 */
export const trackUserAction = (
  action: string,
  userId: string,
  properties?: Record<string, any>
) => eventTracker.trackUser(action, userId, properties);

export const trackOrderEvent = (
  event: string,
  orderId: string,
  properties?: Record<string, any>
) => eventTracker.trackBusiness(event, { orderId, ...properties });

export const trackProviderEvent = (
  event: string,
  provider: string,
  properties?: Record<string, any>
) => eventTracker.trackBusiness(event, { provider, ...properties });

export const trackCacheEvent = (
  hit: boolean,
  key: string,
  properties?: Record<string, any>
) => eventTracker.trackPerformance(
  hit ? Events.CACHE_HIT : Events.CACHE_MISS,
  0,
  { key, ...properties }
);

export const trackApiRequest = (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) => eventTracker.trackPerformance(Events.API_REQUEST, duration, {
  endpoint,
  method,
  statusCode,
});
