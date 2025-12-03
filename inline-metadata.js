#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mcpServerFile = path.join(__dirname, 'supabase/functions/mcp-server/index.ts');
const bundledFile = path.join(__dirname, 'supabase/functions/mcp-server/metadata_bundled.ts');

console.log('📦 Inlining metadata into MCP server...');

// Read the current MCP server
let mcpServer = fs.readFileSync(mcpServerFile, 'utf8');

// Read the bundled metadata
const bundled = fs.readFileSync(bundledFile, 'utf8');

// Find and remove the entire import block (multiline)
const importStart = mcpServer.indexOf('// Import TheLoopGPT metadata configuration');
const importEnd = mcpServer.indexOf('} from "./metadata_bundled.ts";');

if (importStart === -1 || importEnd === -1) {
  console.error('❌ Could not find import statement');
  process.exit(1);
}

// Remove the import block
const beforeImport = mcpServer.substring(0, importStart);
const afterImport = mcpServer.substring(importEnd + '} from "./metadata_bundled.ts";'.length);

// Find where to insert the metadata (after the other imports, before Environment Configuration)
const insertPoint = afterImport.indexOf('// ============================================================================\n// Environment Configuration');

if (insertPoint === -1) {
  console.error('❌ Could not find insertion point');
  process.exit(1);
}

// Build the final file
const final = 
  beforeImport +
  '// TheLoopGPT metadata inlined below (to avoid bundling issues)\n\n' +
  '// ============================================================================\n' +
  '// INLINED METADATA\n' +
  '// ============================================================================\n' +
  bundled + '\n\n' +
  afterImport;

// Write the new file
fs.writeFileSync(mcpServerFile, final);

console.log('✅ Metadata inlined successfully');
console.log('📊 New file size:', (fs.statSync(mcpServerFile).size / 1024).toFixed(2), 'KB');
console.log('📊 Line count:', final.split('\n').length);
