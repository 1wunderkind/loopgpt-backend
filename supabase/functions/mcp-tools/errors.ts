/**
 * Error classes for MCP Tools
 */

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CacheError";
  }
}
