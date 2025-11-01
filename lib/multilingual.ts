/**
 * Multilingual Formatting Utility
 * 
 * Provides formatting functions that use GPT-4.1-mini to generate
 * responses in the user's native language.
 * 
 * Pattern: "SAME LANGUAGE" instruction from LeftoverGPT Ecosystem
 */

import { getOpenAIClient } from "./openai.ts";

/**
 * Language detection helper
 * 
 * Detects language from user input (recipe name, goals, etc.)
 * Returns ISO language code or "en" as default
 */
export function detectLanguage(text: string): string {
  // Simple heuristic: check for non-Latin characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasKorean = /[\uac00-\ud7af]/.test(text);
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const hasCyrillic = /[\u0400-\u04ff]/.test(text);
  
  if (hasChinese) return "zh";
  if (hasJapanese) return "ja";
  if (hasKorean) return "ko";
  if (hasArabic) return "ar";
  if (hasCyrillic) return "ru";
  
  // Default to English
  return "en";
}

/**
 * Get language name from ISO code
 */
export function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    ru: "Russian",
    hi: "Hindi",
    th: "Thai",
  };
  
  return languages[code] || "English";
}

/**
 * Format meal plan in user's language
 * 
 * @param mealPlan - Structured meal plan data
 * @param userInput - Original user input (for language detection)
 * @returns Formatted meal plan in user's language
 */
export async function formatMealPlan(
  mealPlan: any,
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();
  
  const systemPrompt = `You are a professional meal planning expert. Format the following meal plan into a beautiful, easy-to-read markdown response. Use emojis and clear headers to make it engaging and user-friendly.`;
  
  const userPrompt = `
User Input: "${userInput}"

Meal Plan Data:
${JSON.stringify(mealPlan, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, day names, meal names, units, and text must be in that language.
Do NOT use English labels if the user input is in another language.

Format the meal plan with:
- Clear day-by-day breakdown
- Meal names and descriptions
- Nutrition totals per day
- Shopping list with affiliate links
- Engaging emojis and formatting
`;
  
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  
  return completion.choices[0].message.content || "";
}

/**
 * Format delivery recommendations in user's language
 * 
 * @param recommendations - Delivery partner recommendations
 * @param userInput - Original user input (cuisine, diet, etc.)
 * @returns Formatted recommendations in user's language
 */
export async function formatDeliveryRecommendations(
  recommendations: any[],
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();
  
  const systemPrompt = `You are a helpful food delivery assistant. Format the following delivery partner recommendations into a friendly, easy-to-read response.`;
  
  const userPrompt = `
User Input: "${userInput}"

Delivery Recommendations:
${JSON.stringify(recommendations, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All text, labels, partner names, and descriptions must be in that language.

Format the recommendations with:
- Clear partner names with emojis
- Cuisine and diet compatibility
- Affiliate links with call-to-action
- Disclosure about affiliate partnership
`;
  
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  
  return completion.choices[0].message.content || "";
}

/**
 * Format shopping list in user's language
 * 
 * @param shoppingList - Shopping list with affiliate links
 * @param userInput - Original user input
 * @returns Formatted shopping list in user's language
 */
export async function formatShoppingList(
  shoppingList: any,
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();
  
  const systemPrompt = `You are a helpful shopping assistant. Format the following shopping list into a clear, organized response.`;
  
  const userPrompt = `
User Input: "${userInput}"

Shopping List:
${JSON.stringify(shoppingList, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All text, labels, ingredient names, and instructions must be in that language.

Format the shopping list with:
- Categorized ingredients (produce, meat, dairy, etc.)
- Quantities and units
- Affiliate links for easy ordering
- Helpful shopping tips
`;
  
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  
  return completion.choices[0].message.content || "";
}

/**
 * Format confirmation message in user's language
 * 
 * @param action - Action performed (e.g., "meal_logged", "plan_created")
 * @param data - Data related to the action
 * @param userInput - Original user input
 * @returns Formatted confirmation in user's language
 */
export async function formatConfirmation(
  action: string,
  data: any,
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();
  
  const systemPrompt = `You are a helpful assistant. Provide a brief, friendly confirmation message.`;
  
  const userPrompt = `
User Input: "${userInput}"
Action: ${action}
Data: ${JSON.stringify(data, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All text and labels must be in that language.

Provide a brief, friendly confirmation (1-2 sentences) that the action was successful.
`;
  
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  
  return completion.choices[0].message.content || "";
}

/**
 * Format error message in user's language
 * 
 * @param error - Error message or object
 * @param userInput - Original user input
 * @returns Formatted error message in user's language
 */
export async function formatError(
  error: string | Error,
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();
  
  const errorMessage = typeof error === "string" ? error : error.message;
  
  const systemPrompt = `You are a helpful assistant. Provide a friendly error message that helps the user understand what went wrong.`;
  
  const userPrompt = `
User Input: "${userInput}"
Error: ${errorMessage}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All text and labels must be in that language.

Provide a friendly error message (1-2 sentences) that explains what went wrong and suggests what to do next.
`;
  
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  
  return completion.choices[0].message.content || "";
}

