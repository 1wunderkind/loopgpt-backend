/**
 * WeightTrackerGPT Multilingual Support
 * 
 * Provides formatting functions for weight tracking responses in 100+ languages
 * using the "SAME LANGUAGE" pattern from the ecosystem.
 * 
 * Pattern: User input (any language) → WeightTracker logic → GPT-4.1-mini formatting → Response (same language)
 */

import { OpenAI } from "https://esm.sh/openai@4.20.1";

// Lazy-loaded OpenAI client (Deno runtime pattern)
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client (lazy-loading pattern)
 * Prevents startup crashes if OPENAI_API_KEY is missing
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Format weight logging confirmation in user's language
 * 
 * @param data - Weight log data (weight_kg, weight_display, date)
 * @param userInput - User's original input (e.g., "165 pounds", "75公斤")
 * @returns Formatted confirmation message in user's language
 */
export async function formatWeightLogConfirmation(
  data: {
    weight_kg: number;
    weight_display: string;
    date: string;
  },
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a helpful weight tracking assistant. Format weight logging confirmations in a friendly, encouraging tone. Use emojis appropriately.`;

  const userPrompt = `
User input: "${userInput}"

Weight log data:
${JSON.stringify(data, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, units, and text must be in that language.

Format as a brief confirmation message with:
- ✅ emoji at the start
- "Weight logged successfully" message (translated)
- Weight value with unit
- Date
- Brief encouraging message (1 sentence)

Keep it concise and friendly.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}

/**
 * Format weekly trend data in user's language
 * 
 * @param data - Trend data (raw series, smoothed series, change)
 * @param userInput - User's original input for language detection
 * @returns Formatted trend summary in user's language
 */
export async function formatWeeklyTrend(
  data: {
    raw_series: Array<{ date: string; weight_kg: number }>;
    smoothed_series: Array<{ date: string; weight_kg: number }>;
    change_kg: number;
    change_rate_kg_per_week: number;
    unit: string;
  },
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a weight tracking expert. Format weekly trend data into a clear, visual summary with emojis and bullet points. Be encouraging and supportive.`;

  const userPrompt = `
User input: "${userInput}"

Weekly trend data:
${JSON.stringify(data, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, units, and text must be in that language.

Format as:
- Header: "Weekly Trend" (translated)
- Start weight and date (from first entry in smoothed_series)
- End weight and date (from last entry in smoothed_series)
- Total change with direction indicator (↓ for loss, ↑ for gain)
- Weekly change rate
- Brief status message based on trend
- Optional: Simple ASCII chart or emoji visualization

Use the unit specified in the data (${data.unit}).
Keep it visual and easy to scan.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}

/**
 * Format plan evaluation with recommendation in user's language
 * 
 * @param data - Evaluation data (target, observed, recommendation)
 * @param userInput - User's original input for language detection
 * @returns Formatted evaluation with recommendation in user's language
 */
export async function formatPlanEvaluation(
  data: {
    target_delta_kg: number;
    observed_delta_kg: number;
    prediction_error_kg: number;
    recommendation_kcal_per_day: number;
    recommendation_text: string;
    rationale: string;
  },
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a nutrition coach. Format plan evaluation results with clear recommendations and encouraging feedback. Be supportive and actionable.`;

  const userPrompt = `
User input: "${userInput}"

Plan evaluation data:
${JSON.stringify(data, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, units, and text must be in that language.

Format as:
- Header: "Plan Evaluation" (translated)
- Target vs. Observed comparison (with emoji indicators)
- Prediction error (how far off the plan was)
- Clear recommendation (maintain, increase, or decrease calories by X kcal/day)
- Rationale (why this adjustment is recommended)
- Encouraging message about progress
- Call to action (e.g., "Accept this adjustment?")

Use emojis to make it visual:
- 🎯 for on target
- ⚠️ for off target
- 📊 for data
- 💡 for recommendation
- 🎉 for encouragement

Keep it actionable and motivating.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}

/**
 * Format preferences confirmation in user's language
 * 
 * @param data - Preferences data (unit, reminder settings, etc.)
 * @param userInput - User's original input for language detection
 * @param isUpdate - Whether this is an update (true) or initial get (false)
 * @returns Formatted preferences message in user's language
 */
export async function formatPreferencesMessage(
  data: {
    unit: string;
    weigh_in_time?: string;
    safe_loss_kg_per_week: number;
    daily_reminder_enabled: boolean;
    reminder_time?: string;
    reminder_timezone?: string;
  },
  userInput: string,
  isUpdate: boolean = false
): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a helpful weight tracking assistant. Format user preferences in a clear, organized way.`;

  const userPrompt = `
User input: "${userInput}"

User preferences:
${JSON.stringify(data, null, 2)}

Is this an update? ${isUpdate}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, units, and text must be in that language.

Format as:
${isUpdate ? "- ✅ Confirmation message: 'Preferences updated successfully' (translated)" : "- Header: 'Your Weight Tracking Preferences' (translated)"}
- Unit preference: ${data.unit}
- Safe loss rate: ${data.safe_loss_kg_per_week} kg/week (convert to user's unit if needed)
- Daily reminders: ${data.daily_reminder_enabled ? "Enabled" : "Disabled"} (translated)
${data.daily_reminder_enabled && data.reminder_time ? `- Reminder time: ${data.reminder_time} ${data.reminder_timezone || ""}` : ""}
${data.weigh_in_time ? `- Preferred weigh-in time: ${data.weigh_in_time}` : ""}

Keep it clear and organized with bullet points or a simple list.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}

/**
 * Format feedback push confirmation in user's language
 * 
 * @param data - Feedback data (meal_plan_id, recommendation applied)
 * @param userInput - User's original input for language detection
 * @returns Formatted confirmation message in user's language
 */
export async function formatFeedbackConfirmation(
  data: {
    meal_plan_id?: string;
    recommendation_kcal_per_day: number;
    applied: boolean;
  },
  userInput: string
): Promise<string> {
  const client = getOpenAIClient();

  const systemPrompt = `You are a helpful weight tracking assistant. Format feedback confirmations in a brief, encouraging way.`;

  const userPrompt = `
User input: "${userInput}"

Feedback data:
${JSON.stringify(data, null, 2)}

CRITICAL: You MUST respond entirely in the SAME LANGUAGE as the user input "${userInput}". 
All headers, labels, units, and text must be in that language.

Format as:
- ✅ emoji
- Brief confirmation: "Recommendation ${data.applied ? "applied" : "recorded"}" (translated)
- Calorie adjustment: ${data.recommendation_kcal_per_day > 0 ? "+" : ""}${data.recommendation_kcal_per_day} kcal/day
- Next step message (e.g., "MealPlanner will adjust your next plan")

Keep it very brief (1-2 sentences).
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || "";
}

/**
 * Detect language from user input
 * Simple heuristic - checks for common language patterns
 * 
 * @param input - User's input text
 * @returns ISO language code (en, zh, es, fr, de, ja, etc.) or "en" as default
 */
export function detectLanguage(input: string): string {
  const lowerInput = input.toLowerCase();

  // Chinese (Simplified/Traditional)
  if (/[\u4e00-\u9fa5]/.test(input)) return "zh";

  // Japanese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(input)) return "ja";

  // Korean
  if (/[\uac00-\ud7af]/.test(input)) return "ko";

  // Arabic
  if (/[\u0600-\u06ff]/.test(input)) return "ar";

  // Russian
  if (/[\u0400-\u04ff]/.test(input)) return "ru";

  // Thai
  if (/[\u0e00-\u0e7f]/.test(input)) return "th";

  // Spanish keywords
  if (/(kilos?|libras?|peso|semana|día)/.test(lowerInput)) return "es";

  // French keywords
  if (/(kilos?|livres?|poids|semaine|jour)/.test(lowerInput)) return "fr";

  // German keywords
  if (/(kilo|pfund|gewicht|woche|tag)/.test(lowerInput)) return "de";

  // Portuguese keywords
  if (/(quilos?|libras?|peso|semana|dia)/.test(lowerInput)) return "pt";

  // Italian keywords
  if (/(chili|libbre|peso|settimana|giorno)/.test(lowerInput)) return "it";

  // Default to English
  return "en";
}

/**
 * Get language name from ISO code
 * 
 * @param code - ISO language code (en, zh, es, etc.)
 * @returns Human-readable language name
 */
export function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: "English",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    ru: "Russian",
    pt: "Portuguese",
    it: "Italian",
    th: "Thai",
    hi: "Hindi",
    nl: "Dutch",
    sv: "Swedish",
    pl: "Polish",
  };

  return languages[code] || "English";
}

