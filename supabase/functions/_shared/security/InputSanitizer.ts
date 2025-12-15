/**
 * Input Sanitization
 * Utilities to sanitize user input and prevent injection attacks.
 */

export class InputSanitizer {
  /**
   * Sanitizes a string to remove potential XSS vectors.
   * Basic implementation - for robust needs use a library like DOMPurify (if in browser) or similar.
   * Here we just escape HTML entities.
   */
  static sanitizeString(input: string): string {
    if (!input) return input;
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Recursively sanitizes an object or array.
   */
  static sanitize(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitize(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.sanitize(value);
      }
      return result;
    }
    
    return input;
  }

  /**
   * Validates that a string contains only safe characters (alphanumeric, spaces, basic punctuation).
   * Useful for search queries or names.
   */
  static isSafeText(input: string): boolean {
    // Allow alphanumeric, spaces, and common punctuation: . , - _ ! ? @
    const safePattern = /^[a-zA-Z0-9\s.,\-_!?@]*$/;
    return safePattern.test(input);
  }
}
