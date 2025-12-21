export const FaultInjection = {
  enabled: Deno.env.get("FAULT_INJECTION") === "true",

  shouldFail(provider: string, operation: string): boolean {
    if (!this.enabled) return false;

    // Example patterns:
    // FAIL_PROVIDER=instacart
    // FAIL_OPERATION=confirm_order
    return (
      Deno.env.get("FAIL_PROVIDER") === provider ||
      Deno.env.get("FAIL_OPERATION") === operation
    );
  },

  shouldTimeout(operation: string): boolean {
    if (!this.enabled) return false;
    return Deno.env.get("TIMEOUT_OPERATION") === operation;
  },

  async injectLatency(operation: string): Promise<void> {
    if (this.shouldTimeout(operation)) {
      console.log(`[FaultInjection] Injecting timeout for ${operation}`);
      await new Promise((res) => setTimeout(res, 15_000)); // 15s timeout
      throw new Error(`Injected timeout for ${operation}`);
    }
  },

  injectFailure(provider: string, operation: string): void {
    if (this.shouldFail(provider, operation)) {
      console.log(
        `[FaultInjection] Injecting failure for ${provider}:${operation}`,
      );
      throw new Error(`Injected failure for ${provider}:${operation}`);
    }
  },
};
