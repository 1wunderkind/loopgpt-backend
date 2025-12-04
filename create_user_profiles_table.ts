import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qmagnwxeijctkksqbcqz.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseKey!);

const sql = `
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  diet_tags TEXT[],
  calories_per_day INTEGER,
  cuisines TEXT[],
  last_plan_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_plan_date ON user_profiles(last_plan_date);
`;

console.log("Running migration...");
const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

if (error) {
  console.error("Migration failed:", error);
  Deno.exit(1);
}

console.log("✅ Migration successful!");
