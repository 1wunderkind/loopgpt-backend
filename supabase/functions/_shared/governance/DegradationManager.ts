/**
 * Degradation Manager
 * Controls system behavior under stress or maintenance.
 */

export enum DegradationMode {
  NORMAL = "normal",
  DEGRADED = "degraded", // No retries, shorter timeouts
  SAFE = "safe"          // Read-only, no ordering
}

export class DegradationManager {
  static getMode(): DegradationMode {
    const envMode = Deno.env.get("DEGRADATION_MODE");
    switch (envMode) {
      case "degraded": return DegradationMode.DEGRADED;
      case "safe": return DegradationMode.SAFE;
      default: return DegradationMode.NORMAL;
    }
  }

  static isOrderingEnabled(): boolean {
    return this.getMode() !== DegradationMode.SAFE;
  }

  static shouldRetry(): boolean {
    return this.getMode() === DegradationMode.NORMAL;
  }

  static getTimeoutMultiplier(): number {
    return this.getMode() === DegradationMode.DEGRADED ? 0.5 : 1.0;
  }
}
