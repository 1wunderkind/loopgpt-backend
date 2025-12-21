#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log("🔧 Applying Sentiment Layer Migration...\n");

// Read the migration file
const migrationSQL = await Deno.readTextFile(
  "./supabase/migrations/20251204_sentiment_layer.sql",
);

// Split into individual statements (rough split by semicolon + newline)
const statements = migrationSQL
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`📝 Found ${statements.length} SQL statements\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i] + ";";

  // Skip comments
  if (stmt.startsWith("--") || stmt.startsWith("COMMENT")) {
    continue;
  }

  try {
    const { error } = await supabase.rpc("exec_sql", { sql: stmt });

    if (error) {
      console.error(`❌ Statement ${i + 1} failed:`, error.message);
      console.error(`   SQL: ${stmt.substring(0, 100)}...`);
      errorCount++;
    } else {
      console.log(`✅ Statement ${i + 1} executed`);
      successCount++;
    }
  } catch (err) {
    console.error(`❌ Statement ${i + 1} exception:`, err.message);
    errorCount++;
  }
}

console.log(`\n📊 Migration Summary:`);
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log("\n🎉 Sentiment Layer Migration Complete!");
} else {
  console.log("\n⚠️  Some statements failed. Checking table creation...");
}

// Verify tables were created
const { data: tables, error: tablesError } = await supabase
  .from("sentiment_events")
  .select("*")
  .limit(0);

if (!tablesError) {
  console.log("✅ sentiment_events table exists");
} else {
  console.log("❌ sentiment_events table not found");
}

Deno.exit(errorCount > 0 ? 1 : 0);
