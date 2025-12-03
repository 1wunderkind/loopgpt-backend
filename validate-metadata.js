/**
 * Metadata Validation Script (Node.js)
 * 
 * Validates the metadata configuration files for completeness and correctness.
 * Run with: node validate-metadata.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('TheLoopGPT Metadata Validation');
console.log('='.repeat(80) + '\n');

let errors = [];
let warnings = [];
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    errors.push(`${name}: ${error.message}`);
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function warn(message) {
  warnings.push(message);
  console.log(`⚠️  ${message}`);
}

// ============================================================================
// FILE EXISTENCE TESTS
// ============================================================================

console.log('\n📁 Checking file existence...\n');

const configDir = path.join(__dirname, 'supabase/functions/_shared/config');
const requiredFiles = [
  'types.ts',
  'theloopgptMetadata.ts',
  'toolDescriptions.ts',
  'routingHints.ts',
  'index.ts',
  'metadata.test.ts'
];

for (const file of requiredFiles) {
  test(`File exists: ${file}`, () => {
    const filePath = path.join(configDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
  });
}

// ============================================================================
// CONTENT VALIDATION TESTS
// ============================================================================

console.log('\n📝 Validating file contents...\n');

// Read files
const typesContent = fs.readFileSync(path.join(configDir, 'types.ts'), 'utf8');
const metadataContent = fs.readFileSync(path.join(configDir, 'theloopgptMetadata.ts'), 'utf8');
const toolsContent = fs.readFileSync(path.join(configDir, 'toolDescriptions.ts'), 'utf8');
const routingContent = fs.readFileSync(path.join(configDir, 'routingHints.ts'), 'utf8');
const indexContent = fs.readFileSync(path.join(configDir, 'index.ts'), 'utf8');

// Test types.ts
test('types.ts exports ToolDescription', () => {
  if (!typesContent.includes('export type ToolDescription')) {
    throw new Error('Missing ToolDescription type');
  }
});

test('types.ts exports RoutingMetadata', () => {
  if (!typesContent.includes('export type RoutingMetadata')) {
    throw new Error('Missing RoutingMetadata type');
  }
});

// Test theloopgptMetadata.ts
test('theloopgptMetadata.ts exports THELOOPGPT_METADATA', () => {
  if (!metadataContent.includes('export const THELOOPGPT_METADATA')) {
    throw new Error('Missing THELOOPGPT_METADATA export');
  }
});

test('theloopgptMetadata.ts has app name', () => {
  if (!metadataContent.includes('name:') || !metadataContent.includes('TheLoopGPT')) {
    throw new Error('Missing or incorrect app name');
  }
});

test('theloopgptMetadata.ts has tagline', () => {
  if (!metadataContent.includes('tagline:')) {
    throw new Error('Missing tagline');
  }
});

test('theloopgptMetadata.ts has keywords', () => {
  if (!metadataContent.includes('keywords:')) {
    throw new Error('Missing keywords');
  }
});

// Test toolDescriptions.ts
test('toolDescriptions.ts exports ALL_TOOL_DESCRIPTIONS', () => {
  if (!toolsContent.includes('export const ALL_TOOL_DESCRIPTIONS')) {
    throw new Error('Missing ALL_TOOL_DESCRIPTIONS export');
  }
});

// Count tool descriptions
const toolMatches = toolsContent.match(/export const TOOL_\w+: ToolDescription/g);
const toolCount = toolMatches ? toolMatches.length : 0;

test(`toolDescriptions.ts has ${toolCount} tool descriptions`, () => {
  if (toolCount < 40) {
    throw new Error(`Expected at least 40 tools, found ${toolCount}`);
  }
});

console.log(`   Found ${toolCount} tool descriptions`);

// Check critical tools
const criticalTools = [
  'TOOL_PLAN_GENERATE_FROM_LEFTOVERS',
  'TOOL_NUTRITION_ANALYZE_FOOD',
  'TOOL_TRACKER_LOG_MEAL',
  'TOOL_PLAN_CREATE_MEAL_PLAN'
];

for (const tool of criticalTools) {
  test(`toolDescriptions.ts has ${tool}`, () => {
    if (!toolsContent.includes(`export const ${tool}`)) {
      throw new Error(`Missing critical tool: ${tool}`);
    }
  });
}

// Test routingHints.ts
test('routingHints.ts exports ROUTING_METADATA', () => {
  if (!routingContent.includes('export const ROUTING_METADATA')) {
    throw new Error('Missing ROUTING_METADATA export');
  }
});

test('routingHints.ts has triggerHints', () => {
  if (!routingContent.includes('triggerHints:')) {
    throw new Error('Missing triggerHints');
  }
});

test('routingHints.ts has negativeHints', () => {
  if (!routingContent.includes('negativeHints:')) {
    throw new Error('Missing negativeHints');
  }
});

test('routingHints.ts has toolChains', () => {
  if (!routingContent.includes('toolChains:')) {
    throw new Error('Missing toolChains');
  }
});

// Count trigger hints
const triggerHintMatches = routingContent.match(/\w+: \{\s*description:/g);
const triggerHintCount = triggerHintMatches ? triggerHintMatches.length : 0;

test(`routingHints.ts has ${triggerHintCount} trigger hints`, () => {
  if (triggerHintCount < 15) {
    throw new Error(`Expected at least 15 trigger hints, found ${triggerHintCount}`);
  }
});

console.log(`   Found ${triggerHintCount} trigger hints`);

// Count examples in routing hints
const exampleMatches = routingContent.match(/"[^"]{20,}"/g);
const exampleCount = exampleMatches ? exampleMatches.length : 0;

test(`routingHints.ts has ${exampleCount} examples`, () => {
  if (exampleCount < 100) {
    throw new Error(`Expected at least 100 examples, found ${exampleCount}`);
  }
});

console.log(`   Found ${exampleCount} trigger examples`);

// Test index.ts
test('index.ts exports all types', () => {
  if (!indexContent.includes('export type')) {
    throw new Error('Missing type exports');
  }
});

test('index.ts exports metadata', () => {
  if (!indexContent.includes('export {') || !indexContent.includes('THELOOPGPT_METADATA')) {
    throw new Error('Missing metadata exports');
  }
});

test('index.ts exports helper functions', () => {
  if (!indexContent.includes('export function getCompleteMetadata')) {
    throw new Error('Missing helper function exports');
  }
});

test('index.ts has getToolWithRouting', () => {
  if (!indexContent.includes('export function getToolWithRouting')) {
    throw new Error('Missing getToolWithRouting function');
  }
});

test('index.ts has getRecommendedTool', () => {
  if (!indexContent.includes('export function getRecommendedTool')) {
    throw new Error('Missing getRecommendedTool function');
  }
});

// ============================================================================
// MCP SERVER INTEGRATION TESTS
// ============================================================================

console.log('\n🔌 Checking MCP server integration...\n');

const mcpServerPath = path.join(__dirname, 'supabase/functions/mcp-server/index.ts');
const mcpServerContent = fs.readFileSync(mcpServerPath, 'utf8');

test('MCP server imports metadata configuration', () => {
  if (!mcpServerContent.includes('from "../_shared/config/index.ts"')) {
    throw new Error('MCP server not importing metadata configuration');
  }
});

test('MCP server has metadata endpoint', () => {
  if (!mcpServerContent.includes('/metadata')) {
    throw new Error('MCP server missing /metadata endpoint');
  }
});

test('MCP server has tool metadata endpoint', () => {
  if (!mcpServerContent.includes('/metadata/tool')) {
    throw new Error('MCP server missing /metadata/tool endpoint');
  }
});

test('MCP server has recommend endpoint', () => {
  if (!mcpServerContent.includes('/metadata/recommend')) {
    throw new Error('MCP server missing /metadata/recommend endpoint');
  }
});

test('MCP server has routing endpoint', () => {
  if (!mcpServerContent.includes('/metadata/routing')) {
    throw new Error('MCP server missing /metadata/routing endpoint');
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('Validation Summary');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log('='.repeat(80));

if (errors.length > 0) {
  console.log('\n❌ ERRORS:\n');
  errors.forEach(err => console.log(`   - ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  warnings.forEach(warn => console.log(`   - ${warn}`));
}

console.log('\n' + '='.repeat(80));
console.log('Metadata Statistics');
console.log('='.repeat(80));
console.log(`📊 Tool Descriptions: ${toolCount}`);
console.log(`📊 Trigger Hints: ${triggerHintCount}`);
console.log(`📊 Trigger Examples: ${exampleCount}`);
console.log(`📊 Configuration Files: ${requiredFiles.length}`);
console.log('='.repeat(80) + '\n');

if (errors.length === 0) {
  console.log('🎉 All validation checks passed!\n');
  process.exit(0);
} else {
  console.log('❌ Validation failed. Please fix the errors above.\n');
  process.exit(1);
}
