/**
 * Location Utilities
 * 
 * Shared utilities for geolocation and affiliate routing across the ecosystem.
 * 
 * Purpose: Provide reusable location detection and affiliate routing logic
 * Pattern: Can be used by any GPT in the ecosystem (LeftoverGPT, K-Cal GPT, etc.)
 */

/**
 * Language to country defaults
 * 
 * Used as fallback when no geo hint is available.
 * These are statistical defaults, not assumptions.
 */
export const LANGUAGE_TO_COUNTRY_DEFAULTS: Record<string, string> = {
  'en': 'US',  // English → United States
  'es': 'ES',  // Spanish → Spain
  'pt': 'BR',  // Portuguese → Brazil
  'de': 'DE',  // German → Germany
  'fr': 'FR',  // French → France
  'it': 'IT',  // Italian → Italy
  'hi': 'IN',  // Hindi → India
  'zh': 'CN',  // Chinese → China
  'ja': 'JP',  // Japanese → Japan
  'ko': 'KR',  // Korean → South Korea
  'ar': 'SA',  // Arabic → Saudi Arabia
  'ru': 'RU',  // Russian → Russia
  'th': 'TH',  // Thai → Thailand
  'vi': 'VN',  // Vietnamese → Vietnam
  'id': 'ID',  // Indonesian → Indonesia
  'tr': 'TR',  // Turkish → Turkey
  'pl': 'PL',  // Polish → Poland
  'nl': 'NL',  // Dutch → Netherlands
  'sv': 'SE',  // Swedish → Sweden
  'no': 'NO',  // Norwegian → Norway
  'da': 'DK',  // Danish → Denmark
  'fi': 'FI',  // Finnish → Finland
};

/**
 * Country names for display
 */
export const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'IN': 'India',
  'ES': 'Spain',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CN': 'China',
  'JP': 'Japan',
  'KR': 'South Korea',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'RU': 'Russia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'ID': 'Indonesia',
  'TR': 'Turkey',
  'PL': 'Poland',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
};

/**
 * Country emojis for display
 */
export const COUNTRY_EMOJIS: Record<string, string> = {
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'IN': '🇮🇳',
  'ES': '🇪🇸',
  'FR': '🇫🇷',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'BR': '🇧🇷',
  'MX': '🇲🇽',
  'AR': '🇦🇷',
  'CN': '🇨🇳',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'SA': '🇸🇦',
  'AE': '🇦🇪',
  'RU': '🇷🇺',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'ID': '🇮🇩',
  'TR': '🇹🇷',
  'PL': '🇵🇱',
  'NL': '🇳🇱',
  'SE': '🇸🇪',
  'NO': '🇳🇴',
  'DK': '🇩🇰',
  'FI': '🇫🇮',
};

/**
 * Get default country for a language
 * 
 * @param languageCode - ISO language code (en, es, zh, etc.)
 * @returns ISO country code (US, ES, CN, etc.)
 */
export function getDefaultCountryForLanguage(languageCode: string): string {
  return LANGUAGE_TO_COUNTRY_DEFAULTS[languageCode] || 'US';
}

/**
 * Get country name
 * 
 * @param countryCode - ISO country code (US, IN, ES, etc.)
 * @returns Human-readable country name
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode] || countryCode;
}

/**
 * Get country emoji
 * 
 * @param countryCode - ISO country code (US, IN, ES, etc.)
 * @returns Country flag emoji
 */
export function getCountryEmoji(countryCode: string): string {
  return COUNTRY_EMOJIS[countryCode] || '🌍';
}

/**
 * Format country for display
 * 
 * @param countryCode - ISO country code (US, IN, ES, etc.)
 * @returns Formatted string with emoji and name (e.g., "🇺🇸 United States")
 */
export function formatCountryDisplay(countryCode: string): string {
  const emoji = getCountryEmoji(countryCode);
  const name = getCountryName(countryCode);
  return `${emoji} ${name}`;
}

/**
 * Validate country code format
 * 
 * @param countryCode - Country code to validate
 * @returns true if valid 2-letter ISO code
 */
export function isValidCountryCode(countryCode: string): boolean {
  return /^[A-Z]{2}$/.test(countryCode);
}

/**
 * Normalize country code to uppercase
 * 
 * @param countryCode - Country code (may be lowercase)
 * @returns Uppercase country code
 */
export function normalizeCountryCode(countryCode: string): string {
  return countryCode.toUpperCase();
}

/**
 * Calculate confidence score for location detection
 * 
 * @param source - Source of location data
 * @param languageMatchesCountry - Whether detected language matches country default
 * @returns Confidence score (0-1)
 */
export function calculateLocationConfidence(
  source: "stored_profile" | "geo_hint" | "language_default" | "not_found",
  languageMatchesCountry: boolean = false
): number {
  switch (source) {
    case "stored_profile":
      return 0.95; // Very confident (user confirmed)
    case "geo_hint":
      return languageMatchesCountry ? 0.85 : 0.70; // High confidence, higher if language matches
    case "language_default":
      return 0.50; // Low confidence (just a guess)
    case "not_found":
      return 0.00; // No confidence
    default:
      return 0.00;
  }
}

/**
 * Determine if location confirmation is needed
 * 
 * @param confidence - Confidence score (0-1)
 * @param threshold - Threshold for requiring confirmation (default 0.80)
 * @returns true if confirmation needed
 */
export function needsLocationConfirmation(confidence: number, threshold: number = 0.80): boolean {
  return confidence < threshold;
}

/**
 * Generate location confirmation prompt
 * 
 * @param detectedLanguage - ISO language code
 * @param suggestedCountry - Suggested country code
 * @param alternativeCountries - Alternative country options
 * @returns Confirmation prompt text
 */
export function generateLocationConfirmationPrompt(
  detectedLanguage: string,
  suggestedCountry: string,
  alternativeCountries: string[] = []
): string {
  const languageName = getLanguageName(detectedLanguage);
  const suggestedDisplay = formatCountryDisplay(suggestedCountry);
  
  if (alternativeCountries.length === 0) {
    return `I see you're chatting in ${languageName}. Should I show you delivery options for ${suggestedDisplay}?`;
  }
  
  const alternatives = alternativeCountries.map(formatCountryDisplay).join(" or ");
  return `I see you're chatting in ${languageName}. Should I show you delivery options for ${suggestedDisplay} or ${alternatives}?`;
}

/**
 * Get language name from ISO code
 * 
 * @param languageCode - ISO language code
 * @returns Human-readable language name
 */
function getLanguageName(languageCode: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'de': 'German',
    'fr': 'French',
    'it': 'Italian',
    'hi': 'Hindi',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'ru': 'Russian',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'tr': 'Turkish',
    'pl': 'Polish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
  };
  
  return languages[languageCode] || languageCode.toUpperCase();
}

/**
 * Common country pairs for language-location mismatch scenarios
 * 
 * These are common scenarios where language ≠ location:
 * - Immigrants (Hindi speaker in US)
 * - Expats (Brazilian in Spain)
 * - International students (Chinese in Australia)
 * - Travelers (German in UK)
 */
export const COMMON_MISMATCH_SCENARIOS: Record<string, string[]> = {
  'hi': ['IN', 'US', 'GB', 'CA', 'AU'],  // Hindi speakers often in English-speaking countries
  'es': ['ES', 'US', 'MX', 'AR', 'GB'],  // Spanish speakers in various countries
  'pt': ['BR', 'PT', 'ES', 'US', 'GB'],  // Portuguese speakers
  'zh': ['CN', 'US', 'CA', 'AU', 'GB'],  // Chinese speakers abroad
  'ar': ['SA', 'AE', 'US', 'GB', 'FR'],  // Arabic speakers
  'de': ['DE', 'GB', 'US', 'CH', 'AT'],  // German speakers
  'fr': ['FR', 'CA', 'BE', 'CH', 'US'],  // French speakers
  'en': ['US', 'GB', 'CA', 'AU', 'IN'],  // English speakers (most global)
};

/**
 * Get alternative country suggestions for a language
 * 
 * @param languageCode - ISO language code
 * @param excludeCountry - Country to exclude from suggestions
 * @param limit - Maximum number of suggestions
 * @returns Array of country codes
 */
export function getAlternativeCountries(
  languageCode: string,
  excludeCountry?: string,
  limit: number = 2
): string[] {
  const scenarios = COMMON_MISMATCH_SCENARIOS[languageCode] || [];
  const filtered = excludeCountry 
    ? scenarios.filter(c => c !== excludeCountry)
    : scenarios;
  return filtered.slice(0, limit);
}

