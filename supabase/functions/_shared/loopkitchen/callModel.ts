/**
 * OpenAI Model Helper for LoopGPT
 * 
 * Wrapper for calling OpenAI chat completions with JSON mode.
 * Adapted from LoopKitchen for Deno/Supabase environment.
 */

import { OpenAI } from 'https://deno.land/x/openai@v4.24.0/mod.ts';

/**
 * Initialize OpenAI client
 */
const getOpenAIClient = () => {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({ apiKey });
};

/**
 * Default model to use for completions
 */
const DEFAULT_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

/**
 * Call OpenAI model with system and user prompts
 * 
 * @param systemPrompt - System message defining the AI's role and output format
 * @param userPrompt - User message with the specific request
 * @param options - Optional configuration
 * @returns Parsed JSON response
 */
export async function callModel<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 1500,
  } = options;

  const openai = getOpenAIClient();

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    return parsed as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error('OpenAI API error:', error.message);
      throw new Error(`Failed to call OpenAI: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Call model with retry logic
 * 
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param options - Configuration options
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Parsed JSON response
 */
export async function callModelWithRetry<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callModel<T>(systemPrompt, userPrompt, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        console.error(`Attempt ${attempt + 1} failed, retrying...`);
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to call model after retries');
}
