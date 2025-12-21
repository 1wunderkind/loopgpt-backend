
/**
 * LeftoverGPT Safety Guards
 * 
 * Enforces explicit user intent for sensitive actions (commerce).
 */

export class CommerceGuard {
  /**
   * Validates that a commerce action is explicitly requested by the user.
   * In a real implementation, this might check semantic intent or session state.
   * For this adapter, we ensure the input is valid and non-empty.
   */
  static validateOrderRequest(ingredients: string[]): boolean {
    if (!ingredients || ingredients.length === 0) {
      throw new Error("Cannot create order link: No ingredients specified.");
    }
    
    // Additional safety checks can go here
    // e.g. preventing orders for prohibited items if we had an item list
    
    return true;
  }

  /**
   * Ensures we don't accidentally expose internal provider IDs
   */
  static sanitizeProviderName(providerId: string): string {
    // Map internal provider IDs to generic user-friendly names if needed
    // or just return a generic string to hide the specific backend partner
    return "Grocery Partner";
  }
}
