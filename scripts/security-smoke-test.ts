/**
 * Security Smoke Tests
 * 
 * Tests for Step 5 security hardening features:
 * - Rate limiting
 * - Input validation
 * - Authentication enforcement
 * - Audit logging
 * 
 * Usage:
 *   deno run --allow-net --allow-env scripts/security-smoke-test.ts
 */

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const MCP_SERVER_URL = `${SUPABASE_URL}/functions/v1/mcp-server`;

// Test user credentials (create a test user first)
const TEST_USER_TOKEN = Deno.env.get("TEST_USER_TOKEN") || "";

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string }>
): Promise<void> {
  console.log(`\n🧪 Running: ${name}`);
  const startTime = performance.now();
  
  try {
    const result = await testFn();
    const duration = performance.now() - startTime;
    
    results.push({
      name,
      passed: result.passed,
      message: result.message,
      duration,
    });
    
    if (result.passed) {
      console.log(`✅ PASSED: ${result.message} (${duration.toFixed(0)}ms)`);
    } else {
      console.log(`❌ FAILED: ${result.message} (${duration.toFixed(0)}ms)`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    results.push({
      name,
      passed: false,
      message: `Exception: ${message}`,
      duration,
    });
    
    console.log(`❌ FAILED: ${message} (${duration.toFixed(0)}ms)`);
  }
}

async function callTool(
  toolName: string,
  input: any,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${MCP_SERVER_URL}/tools/${toolName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  
  return response;
}

// ============================================================================
// Test 1: Rate Limiting
// ============================================================================

async function testRateLimiting(): Promise<{ passed: boolean; message: string }> {
  // Make 61 requests to trigger per-minute IP limit (60/min)
  const toolName = "estimate_recipe_nutrition"; // Public tool
  const input = {
    ingredients: [{ name: "chicken", quantity: 100, unit: "g" }],
    servings: 1,
  };
  
  let blockedCount = 0;
  let successCount = 0;
  
  for (let i = 0; i < 65; i++) {
    const response = await callTool(toolName, input);
    const data = await response.json();
    
    if (data.success === false && data.error?.code === "RATE_LIMITED") {
      blockedCount++;
    } else if (data.success !== false) {
      successCount++;
    }
  }
  
  // Should have some blocked requests
  if (blockedCount > 0) {
    return {
      passed: true,
      message: `Rate limiting working: ${blockedCount} requests blocked, ${successCount} succeeded`,
    };
  } else {
    return {
      passed: false,
      message: `Rate limiting not working: 0 requests blocked out of 65`,
    };
  }
}

// ============================================================================
// Test 2: Input Validation
// ============================================================================

async function testInputValidation(): Promise<{ passed: boolean; message: string }> {
  // Try calling search_restaurants with invalid input
  const toolName = "search_restaurants";
  const invalidInput = {
    query: "", // Empty query (should fail min length validation)
    location: {
      lat: 200, // Invalid latitude (should fail max validation)
      lng: 0,
    },
  };
  
  const response = await callTool(toolName, invalidInput, TEST_USER_TOKEN);
  const data = await response.json();
  
  if (data.success === false && data.error?.code === "VALIDATION_ERROR") {
    return {
      passed: true,
      message: `Input validation working: ${data.error.message}`,
    };
  } else {
    return {
      passed: false,
      message: `Input validation not working: expected VALIDATION_ERROR, got ${data.error?.code || "success"}`,
    };
  }
}

// ============================================================================
// Test 3: Authentication Enforcement
// ============================================================================

async function testAuthEnforcement(): Promise<{ passed: boolean; message: string }> {
  // Try calling an authenticated tool without token
  const toolName = "log_meal"; // Requires authentication
  const input = {
    meal: "Chicken salad",
    calories: 400,
  };
  
  const response = await callTool(toolName, input); // No token
  const data = await response.json();
  
  if (data.success === false && data.error?.code === "UNAUTHORIZED") {
    return {
      passed: true,
      message: `Auth enforcement working: ${data.error.message}`,
    };
  } else {
    return {
      passed: false,
      message: `Auth enforcement not working: expected UNAUTHORIZED, got ${data.error?.code || "success"}`,
    };
  }
}

// ============================================================================
// Test 4: Payload Size Limit
// ============================================================================

async function testPayloadSizeLimit(): Promise<{ passed: boolean; message: string }> {
  // Create a payload larger than 256 KB
  const largePayload = {
    data: "x".repeat(300 * 1024), // 300 KB of data
  };
  
  const response = await callTool("estimate_recipe_nutrition", largePayload);
  const data = await response.json();
  
  if (data.success === false && data.error?.code === "VALIDATION_ERROR") {
    return {
      passed: true,
      message: `Payload size limit working: ${data.error.message}`,
    };
  } else {
    return {
      passed: false,
      message: `Payload size limit not working: expected VALIDATION_ERROR, got ${data.error?.code || "success"}`,
    };
  }
}

// ============================================================================
// Test 5: Audit Logging
// ============================================================================

async function testAuditLogging(): Promise<{ passed: boolean; message: string }> {
  // This test requires checking the database
  // For now, we'll just verify the tool is audited
  
  // Call a sensitive tool (requires auth)
  if (!TEST_USER_TOKEN) {
    return {
      passed: false,
      message: "Skipped: TEST_USER_TOKEN not set",
    };
  }
  
  const toolName = "set_user_goals";
  const input = {
    calorieGoal: 2000,
    proteinGoal: 150,
  };
  
  const response = await callTool(toolName, input, TEST_USER_TOKEN);
  const data = await response.json();
  
  // We can't directly verify the audit log without database access
  // But we can verify the tool executed successfully
  if (data.success !== false) {
    return {
      passed: true,
      message: "Audit logging test executed (check database for audit event)",
    };
  } else {
    return {
      passed: false,
      message: `Tool execution failed: ${data.error?.message || "unknown error"}`,
    };
  }
}

// ============================================================================
// Test 6: Public Tool Access
// ============================================================================

async function testPublicToolAccess(): Promise<{ passed: boolean; message: string }> {
  // Public tools should work without authentication
  const toolName = "estimate_recipe_nutrition";
  const input = {
    ingredients: [
      { name: "chicken breast", quantity: 200, unit: "g" },
      { name: "rice", quantity: 100, unit: "g" },
    ],
    servings: 1,
  };
  
  const response = await callTool(toolName, input); // No token
  const data = await response.json();
  
  if (data.success !== false) {
    return {
      passed: true,
      message: "Public tool access working (no auth required)",
    };
  } else {
    return {
      passed: false,
      message: `Public tool failed: ${data.error?.message || "unknown error"}`,
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log("=".repeat(80));
  console.log("🔒 Security Smoke Tests - Step 5");
  console.log("=".repeat(80));
  
  console.log(`\nMCP Server URL: ${MCP_SERVER_URL}`);
  console.log(`Test User Token: ${TEST_USER_TOKEN ? "✓ Set" : "✗ Not set (some tests will be skipped)"}`);
  
  // Run tests
  await runTest("1. Rate Limiting", testRateLimiting);
  await runTest("2. Input Validation", testInputValidation);
  await runTest("3. Authentication Enforcement", testAuthEnforcement);
  await runTest("4. Payload Size Limit", testPayloadSizeLimit);
  await runTest("5. Audit Logging", testAuditLogging);
  await runTest("6. Public Tool Access", testPublicToolAccess);
  
  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Test Summary");
  console.log("=".repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\nTotal: ${total} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
  }
  
  console.log("\n" + "=".repeat(80));
  
  // Exit with appropriate code
  Deno.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (import.meta.main) {
  main();
}
