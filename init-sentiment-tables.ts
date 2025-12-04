#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qmagnwxeijctkksqbcqz.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log("🔧 Initializing Sentiment Layer Tables...\n");

// Create sentiment_events table
console.log("Creating sentiment_events table...");
const createEventsTable = `
CREATE TABLE IF NOT EXISTS sentiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('HELPFUL', 'NOT_HELPFUL', 'RATED', 'FAVORITED', 'UNFAVORITED')),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rating_required_for_rated CHECK (
    (event_type = 'RATED' AND rating IS NOT NULL) OR (event_type != 'RATED')
  )
);

CREATE INDEX IF NOT EXISTS idx_sentiment_events_user_id ON sentiment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_content ON sentiment_events(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_type ON sentiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sentiment_events_timestamp ON sentiment_events(timestamp DESC);
`;

try {
  const { error: eventsError } = await supabase.rpc("exec_sql", { sql: createEventsTable });
  if (eventsError) {
    console.error("❌ Failed to create sentiment_events:", eventsError.message);
  } else {
    console.log("✅ sentiment_events table created");
  }
} catch (err) {
  console.error("❌ Exception:", err.message);
}

// Create user_favorites table
console.log("\nCreating user_favorites table...");
const createFavoritesTable = `
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('recipe', 'mealplan', 'grocery', 'other')),
  content_id TEXT NOT NULL,
  content_name TEXT,
  content_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id, created_at DESC);
`;

try {
  const { error: favoritesError } = await supabase.rpc("exec_sql", { sql: createFavoritesTable });
  if (favoritesError) {
    console.error("❌ Failed to create user_favorites:", favoritesError.message);
  } else {
    console.log("✅ user_favorites table created");
  }
} catch (err) {
  console.error("❌ Exception:", err.message);
}

// Verify tables exist
console.log("\nVerifying tables...");
const { data: eventsData, error: eventsCheckError } = await supabase
  .from("sentiment_events")
  .select("*")
  .limit(0);

if (!eventsCheckError) {
  console.log("✅ sentiment_events table verified");
} else {
  console.log("❌ sentiment_events table not found:", eventsCheckError.message);
}

const { data: favoritesData, error: favoritesCheckError } = await supabase
  .from("user_favorites")
  .select("*")
  .limit(0);

if (!favoritesCheckError) {
  console.log("✅ user_favorites table verified");
} else {
  console.log("❌ user_favorites table not found:", favoritesCheckError.message);
}

console.log("\n🎉 Sentiment Layer Tables Initialized!");
