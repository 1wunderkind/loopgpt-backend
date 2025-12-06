/**
 * Phase 1 Validation Tests
 * 
 * Validates that all LoopKitchen components are properly imported and functional.
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Test imports
import {
  // Types
  RecipeCardCompact,
  RecipeCardDetailed,
  WeekPlanner,
  NutritionSummary,
  GroceryList,
  InfoMessage,
  Widget,
  isRecipeCardCompact,
  isRecipeCardDetailed,
  isWeekPlanner,
  isNutritionSummary,
  isGroceryList,
  isInfoMessage,
  // Prompts
  LEFTOVERGPT_LIST_SYSTEM,
  LEFTOVERGPT_LIST_USER,
  LEFTOVERGPT_DETAIL_SYSTEM,
  LEFTOVERGPT_DETAIL_USER,
  NUTRITIONGPT_SYSTEM,
  NUTRITIONGPT_USER,
  GROCERYGPT_SYSTEM,
  GROCERYGPT_USER,
  MEALPLANNERGPT_SYSTEM,
  MEALPLANNERGPT_USER,
  // Utilities
  callModel,
  callModelWithRetry,
} from '../../_shared/loopkitchen/index.ts';

Deno.test('Phase 1 - Type imports are available', () => {
  // Just checking that imports don't throw
  assertExists(isRecipeCardCompact);
  assertExists(isRecipeCardDetailed);
  assertExists(isWeekPlanner);
  assertExists(isNutritionSummary);
  assertExists(isGroceryList);
  assertExists(isInfoMessage);
});

Deno.test('Phase 1 - Prompt templates are available', () => {
  assertExists(LEFTOVERGPT_LIST_SYSTEM);
  assertExists(LEFTOVERGPT_DETAIL_SYSTEM);
  assertExists(NUTRITIONGPT_SYSTEM);
  assertExists(GROCERYGPT_SYSTEM);
  assertExists(MEALPLANNERGPT_SYSTEM);
});

Deno.test('Phase 1 - Prompt functions generate correct output', () => {
  const userPrompt = LEFTOVERGPT_LIST_USER(
    ['chicken', 'rice', 'broccoli'],
    ['Comfort', 'Fast'],
    30,
    ['gluten-free'],
    'Quick dinner'
  );
  
  assertExists(userPrompt);
  assertEquals(userPrompt.includes('chicken'), true);
  assertEquals(userPrompt.includes('Comfort'), true);
  assertEquals(userPrompt.includes('30'), true);
});

Deno.test('Phase 1 - Type guards work correctly', () => {
  const compactRecipe: RecipeCardCompact = {
    id: 'test-recipe',
    type: 'RecipeCardCompact',
    title: 'Test Recipe',
    chaosRating: 5,
    timeMinutes: 30,
    difficulty: 'easy',
    dietTags: ['vegetarian'],
  };
  
  const widget: Widget = compactRecipe;
  
  assertEquals(isRecipeCardCompact(widget), true);
  assertEquals(isRecipeCardDetailed(widget), false);
  assertEquals(isWeekPlanner(widget), false);
});

Deno.test('Phase 1 - Utility functions are available', () => {
  assertExists(callModel);
  assertExists(callModelWithRetry);
});

console.log('✅ Phase 1 validation complete - all imports successful!');
