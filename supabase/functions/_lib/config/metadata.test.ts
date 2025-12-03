/**
 * TheLoopGPT Metadata Validation Tests
 * 
 * Ensures metadata configuration is complete, consistent, and correct.
 * Run with: deno test metadata.test.ts
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  THELOOPGPT_METADATA,
  ALL_TOOL_DESCRIPTIONS,
  ROUTING_METADATA,
  getCompleteMetadata,
  getToolDescription,
  getToolsByCategory,
  getAllToolIds,
  getToolCount,
  getToolWithRouting,
  getRecommendedTool,
  searchTools,
  validateToolInvocation,
  TOOL_SUMMARY
} from "./index.ts";

// ============================================================================
// APP METADATA TESTS
// ============================================================================

Deno.test("App metadata - has required fields", () => {
  assertExists(THELOOPGPT_METADATA.name);
  assertExists(THELOOPGPT_METADATA.tagline);
  assertExists(THELOOPGPT_METADATA.shortDescription);
  assertExists(THELOOPGPT_METADATA.longDescription);
  assertExists(THELOOPGPT_METADATA.keywords);
  assertExists(THELOOPGPT_METADATA.categories);
  
  assert(THELOOPGPT_METADATA.keywords.length > 0, "Keywords should not be empty");
  assert(THELOOPGPT_METADATA.categories.length > 0, "Categories should not be empty");
});

Deno.test("App metadata - description lengths are appropriate", () => {
  assert(THELOOPGPT_METADATA.shortDescription.length <= 200, "Short description should be <= 200 chars");
  assert(THELOOPGPT_METADATA.longDescription.length >= 100, "Long description should be >= 100 chars");
  assert(THELOOPGPT_METADATA.tagline.length <= 80, "Tagline should be <= 80 chars");
});

Deno.test("App metadata - keywords are valid", () => {
  for (const keyword of THELOOPGPT_METADATA.keywords) {
    assert(keyword.length > 0, "Keyword should not be empty");
    assert(keyword.length <= 50, "Keyword should be <= 50 chars");
  }
});

// ============================================================================
// TOOL DESCRIPTIONS TESTS
// ============================================================================

Deno.test("Tool descriptions - all 50 tools documented", () => {
  const toolCount = getToolCount();
  assertEquals(toolCount, 50, `Expected 50 tools, got ${toolCount}`);
});

Deno.test("Tool descriptions - all tools have required fields", () => {
  for (const [toolId, tool] of Object.entries(ALL_TOOL_DESCRIPTIONS)) {
    assertExists(tool.toolId, `Tool ${toolId} missing toolId`);
    assertExists(tool.displayName, `Tool ${toolId} missing displayName`);
    assertExists(tool.brandedName, `Tool ${toolId} missing brandedName`);
    assertExists(tool.category, `Tool ${toolId} missing category`);
    assertExists(tool.primaryDescription, `Tool ${toolId} missing primaryDescription`);
    assertExists(tool.whenToUse, `Tool ${toolId} missing whenToUse`);
    assertExists(tool.whenNotToUse, `Tool ${toolId} missing whenNotToUse`);
    assertExists(tool.uniqueCapabilities, `Tool ${toolId} missing uniqueCapabilities`);
    assertExists(tool.requiredParams, `Tool ${toolId} missing requiredParams`);
    assertExists(tool.optionalParams, `Tool ${toolId} missing optionalParams`);
    assertExists(tool.returnFormat, `Tool ${toolId} missing returnFormat`);
    
    // Validate arrays are not empty where expected
    assert(tool.whenToUse.length > 0, `Tool ${toolId} whenToUse should not be empty`);
    assert(tool.whenNotToUse.length > 0, `Tool ${toolId} whenNotToUse should not be empty`);
    assert(tool.uniqueCapabilities.length > 0, `Tool ${toolId} uniqueCapabilities should not be empty`);
  }
});

Deno.test("Tool descriptions - primary descriptions are meaningful", () => {
  for (const [toolId, tool] of Object.entries(ALL_TOOL_DESCRIPTIONS)) {
    assert(
      tool.primaryDescription.length >= 50,
      `Tool ${toolId} primaryDescription too short (${tool.primaryDescription.length} chars)`
    );
    assert(
      tool.primaryDescription.length <= 500,
      `Tool ${toolId} primaryDescription too long (${tool.primaryDescription.length} chars)`
    );
  }
});

Deno.test("Tool descriptions - parameters have required fields", () => {
  for (const [toolId, tool] of Object.entries(ALL_TOOL_DESCRIPTIONS)) {
    for (const param of tool.requiredParams) {
      assertExists(param.name, `Tool ${toolId} required param missing name`);
      assertExists(param.type, `Tool ${toolId} required param missing type`);
      assertExists(param.description, `Tool ${toolId} required param missing description`);
      assertExists(param.example, `Tool ${toolId} required param missing example`);
    }
    
    for (const param of tool.optionalParams) {
      assertExists(param.name, `Tool ${toolId} optional param missing name`);
      assertExists(param.type, `Tool ${toolId} optional param missing type`);
      assertExists(param.description, `Tool ${toolId} optional param missing description`);
    }
  }
});

Deno.test("Tool descriptions - return formats are documented", () => {
  for (const [toolId, tool] of Object.entries(ALL_TOOL_DESCRIPTIONS)) {
    assertExists(tool.returnFormat.description, `Tool ${toolId} returnFormat missing description`);
    assertExists(tool.returnFormat.fields, `Tool ${toolId} returnFormat missing fields`);
    assert(
      tool.returnFormat.fields.length > 0,
      `Tool ${toolId} returnFormat.fields should not be empty`
    );
  }
});

Deno.test("Tool descriptions - categories are valid", () => {
  const validCategories = [
    "recipes",
    "nutrition",
    "tracking",
    "planning",
    "user",
    "delivery",
    "commerce",
    "intelligence",
    "affiliate",
    "location",
    "compliance",
    "payments",
    "system",
    "webhooks"
  ];
  
  for (const [toolId, tool] of Object.entries(ALL_TOOL_DESCRIPTIONS)) {
    assert(
      validCategories.includes(tool.category),
      `Tool ${toolId} has invalid category: ${tool.category}`
    );
  }
});

// ============================================================================
// ROUTING HINTS TESTS
// ============================================================================

Deno.test("Routing hints - has trigger hints", () => {
  assertExists(ROUTING_METADATA.triggerHints);
  const hintCount = Object.keys(ROUTING_METADATA.triggerHints).length;
  assert(hintCount >= 15, `Expected at least 15 trigger hints, got ${hintCount}`);
});

Deno.test("Routing hints - all hints have required fields", () => {
  for (const [hintKey, hint] of Object.entries(ROUTING_METADATA.triggerHints)) {
    assertExists(hint.description, `Hint ${hintKey} missing description`);
    assertExists(hint.examples, `Hint ${hintKey} missing examples`);
    assertExists(hint.priority, `Hint ${hintKey} missing priority`);
    assertExists(hint.confidence, `Hint ${hintKey} missing confidence`);
    assertExists(hint.relatedTools, `Hint ${hintKey} missing relatedTools`);
    
    assert(hint.examples.length >= 5, `Hint ${hintKey} should have at least 5 examples`);
    assert(hint.confidence >= 0 && hint.confidence <= 1, `Hint ${hintKey} confidence should be 0-1`);
    assert(hint.relatedTools.length > 0, `Hint ${hintKey} should have at least 1 related tool`);
  }
});

Deno.test("Routing hints - examples are diverse", () => {
  for (const [hintKey, hint] of Object.entries(ROUTING_METADATA.triggerHints)) {
    const examples = hint.examples;
    const uniqueStarts = new Set(examples.map(ex => ex.slice(0, 10).toLowerCase()));
    
    assert(
      uniqueStarts.size >= Math.min(5, examples.length),
      `Hint ${hintKey} examples should be more diverse`
    );
  }
});

Deno.test("Routing hints - related tools exist", () => {
  const allToolIds = getAllToolIds();
  
  for (const [hintKey, hint] of Object.entries(ROUTING_METADATA.triggerHints)) {
    for (const toolId of hint.relatedTools) {
      assert(
        allToolIds.includes(toolId),
        `Hint ${hintKey} references non-existent tool: ${toolId}`
      );
    }
  }
});

Deno.test("Routing hints - negative hints are documented", () => {
  assertExists(ROUTING_METADATA.negativeHints);
  assert(ROUTING_METADATA.negativeHints.length >= 5, "Should have at least 5 negative hints");
  
  for (const negHint of ROUTING_METADATA.negativeHints) {
    assertExists(negHint.description);
    assertExists(negHint.examples);
    assertExists(negHint.reason);
    assert(negHint.examples.length >= 3, "Negative hint should have at least 3 examples");
  }
});

Deno.test("Routing hints - tool chains are valid", () => {
  assertExists(ROUTING_METADATA.toolChains);
  const allToolIds = getAllToolIds();
  
  for (const chain of ROUTING_METADATA.toolChains) {
    assertExists(chain.name);
    assertExists(chain.description);
    assertExists(chain.sequence);
    assertExists(chain.trigger);
    
    assert(chain.sequence.length >= 2, `Tool chain ${chain.name} should have at least 2 tools`);
    
    for (const toolId of chain.sequence) {
      assert(
        allToolIds.includes(toolId),
        `Tool chain ${chain.name} references non-existent tool: ${toolId}`
      );
    }
  }
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

Deno.test("getToolDescription - returns correct tool", () => {
  const tool = getToolDescription("plan_generate_from_leftovers");
  assertExists(tool);
  assertEquals(tool?.toolId, "plan_generate_from_leftovers");
  assertEquals(tool?.displayName, "Recipe Generator");
});

Deno.test("getToolDescription - returns null for non-existent tool", () => {
  const tool = getToolDescription("non_existent_tool");
  assertEquals(tool, undefined);
});

Deno.test("getToolsByCategory - returns correct tools", () => {
  const recipeTools = getToolsByCategory("recipes");
  assert(recipeTools.length > 0, "Should have recipe tools");
  
  for (const tool of recipeTools) {
    assertEquals(tool.category, "recipes");
  }
});

Deno.test("getAllToolIds - returns all tool IDs", () => {
  const toolIds = getAllToolIds();
  assertEquals(toolIds.length, 50);
  assert(toolIds.includes("plan_generate_from_leftovers"));
  assert(toolIds.includes("nutrition_analyze_food"));
  assert(toolIds.includes("tracker_log_meal"));
});

Deno.test("getToolWithRouting - includes routing hints", () => {
  const toolWithRouting = getToolWithRouting("plan_generate_from_leftovers");
  assertExists(toolWithRouting);
  assertExists(toolWithRouting.routingHints);
  assert(Array.isArray(toolWithRouting.routingHints));
});

Deno.test("getRecommendedTool - finds matching tool", () => {
  const recommendation = getRecommendedTool("What can I make with chicken and rice?");
  assertExists(recommendation);
  assertExists(recommendation.toolId);
  assertExists(recommendation.confidence);
  assertExists(recommendation.reason);
  assert(recommendation.confidence > 0 && recommendation.confidence <= 1);
});

Deno.test("searchTools - finds tools by keyword", () => {
  const results = searchTools("recipe");
  assert(results.length > 0, "Should find recipe-related tools");
  
  const results2 = searchTools("nutrition");
  assert(results2.length > 0, "Should find nutrition-related tools");
});

Deno.test("validateToolInvocation - validates required params", () => {
  const result1 = validateToolInvocation("plan_generate_from_leftovers", {
    ingredients: ["chicken", "rice"]
  });
  assertEquals(result1.valid, true);
  assertEquals(result1.errors.length, 0);
  
  const result2 = validateToolInvocation("plan_generate_from_leftovers", {});
  assertEquals(result2.valid, false);
  assert(result2.errors.length > 0);
});

Deno.test("getCompleteMetadata - returns all metadata", () => {
  const metadata = getCompleteMetadata();
  assertExists(metadata.app);
  assertExists(metadata.tools);
  assertExists(metadata.routing);
  assertExists(metadata.summary);
  
  assertEquals(metadata.summary.toolCount, 50);
});

// ============================================================================
// TOOL SUMMARY TESTS
// ============================================================================

Deno.test("Tool summary - matches actual tool count", () => {
  const actualCount = getToolCount();
  assertEquals(TOOL_SUMMARY.total, actualCount);
});

Deno.test("Tool summary - category counts are accurate", () => {
  const categories = TOOL_SUMMARY.categories;
  const totalFromCategories = Object.values(categories).reduce((sum: number, count) => sum + (count as number), 0);
  
  assertEquals(totalFromCategories, TOOL_SUMMARY.total, "Category counts should sum to total");
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

Deno.test("Integration - all trigger hints reference valid tools", () => {
  const allToolIds = getAllToolIds();
  let totalReferences = 0;
  let validReferences = 0;
  
  for (const hint of Object.values(ROUTING_METADATA.triggerHints)) {
    for (const toolId of hint.relatedTools) {
      totalReferences++;
      if (allToolIds.includes(toolId)) {
        validReferences++;
      }
    }
  }
  
  assertEquals(
    validReferences,
    totalReferences,
    `All ${totalReferences} tool references in routing hints should be valid`
  );
});

Deno.test("Integration - all tool chains reference valid tools", () => {
  const allToolIds = getAllToolIds();
  
  for (const chain of ROUTING_METADATA.toolChains) {
    for (const toolId of chain.sequence) {
      assert(
        allToolIds.includes(toolId),
        `Tool chain ${chain.name} references invalid tool: ${toolId}`
      );
    }
  }
});

Deno.test("Integration - critical tools are well documented", () => {
  const criticalTools = [
    "plan_generate_from_leftovers",
    "nutrition_analyze_food",
    "tracker_log_meal",
    "plan_create_meal_plan"
  ];
  
  for (const toolId of criticalTools) {
    const tool = getToolDescription(toolId);
    assertExists(tool, `Critical tool ${toolId} should exist`);
    
    assert(
      tool!.primaryDescription.length >= 100,
      `Critical tool ${toolId} should have detailed description`
    );
    
    assert(
      tool!.whenToUse.length >= 5,
      `Critical tool ${toolId} should have at least 5 use cases`
    );
  }
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

Deno.test("Performance - getToolDescription is fast", () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    getToolDescription("plan_generate_from_leftovers");
  }
  const duration = performance.now() - start;
  
  assert(duration < 100, `1000 lookups should take < 100ms, took ${duration}ms`);
});

Deno.test("Performance - searchTools is reasonable", () => {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    searchTools("recipe");
  }
  const duration = performance.now() - start;
  
  assert(duration < 500, `100 searches should take < 500ms, took ${duration}ms`);
});

// ============================================================================
// CONSOLE SUMMARY
// ============================================================================

console.log("\n=".repeat(80));
console.log("TheLoopGPT Metadata Validation Summary");
console.log("=".repeat(80));
console.log(`✅ Total Tools: ${getToolCount()}`);
console.log(`✅ Trigger Hints: ${Object.keys(ROUTING_METADATA.triggerHints).length}`);
console.log(`✅ Negative Hints: ${ROUTING_METADATA.negativeHints.length}`);
console.log(`✅ Tool Chains: ${ROUTING_METADATA.toolChains.length}`);
console.log(`✅ Categories: ${Object.keys(TOOL_SUMMARY.categories).length}`);
console.log("=".repeat(80));
console.log("All metadata validation tests passed! 🎉");
console.log("=".repeat(80) + "\n");
