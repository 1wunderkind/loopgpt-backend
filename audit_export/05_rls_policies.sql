supabase/migrations/20241202_phase3_scoring_schema.sql:ALTER TABLE score_calculations ENABLE ROW LEVEL SECURITY;
supabase/migrations/20241202_phase3_scoring_schema.sql:ALTER TABLE order_outcomes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20241202_phase3_scoring_schema.sql:ALTER TABLE weight_adjustments ENABLE ROW LEVEL SECURITY;
supabase/migrations/20241202_phase3_scoring_schema.sql:ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql--- Allow service role full access (for edge functions)
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Service role has full access to score_calculations"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON score_calculations
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR ALL
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO service_role
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true)
supabase/migrations/20241202_phase3_scoring_schema.sql-  WITH CHECK (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Service role has full access to order_outcomes"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON order_outcomes
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR ALL
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO service_role
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true)
supabase/migrations/20241202_phase3_scoring_schema.sql-  WITH CHECK (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Service role has full access to weight_adjustments"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON weight_adjustments
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR ALL
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO service_role
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true)
supabase/migrations/20241202_phase3_scoring_schema.sql-  WITH CHECK (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Service role has full access to provider_metrics"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON provider_metrics
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR ALL
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO service_role
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true)
supabase/migrations/20241202_phase3_scoring_schema.sql-  WITH CHECK (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql--- Allow authenticated users read-only access to summaries
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Authenticated users can read score calculations"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON score_calculations
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR SELECT
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO authenticated
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql:CREATE POLICY "Authenticated users can read provider metrics"
supabase/migrations/20241202_phase3_scoring_schema.sql-  ON provider_metrics
supabase/migrations/20241202_phase3_scoring_schema.sql-  FOR SELECT
supabase/migrations/20241202_phase3_scoring_schema.sql-  TO authenticated
supabase/migrations/20241202_phase3_scoring_schema.sql-  USING (true);
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql--- ============================================================================
supabase/migrations/20241202_phase3_scoring_schema.sql--- 8. Comments for Documentation
supabase/migrations/20241202_phase3_scoring_schema.sql--- ============================================================================
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON TABLE score_calculations IS 'Stores scoring calculations for each provider comparison, enabling analysis of selection patterns';
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON TABLE order_outcomes IS 'Tracks actual order outcomes for learning and improving provider selection';
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON TABLE weight_adjustments IS 'Records changes to scoring weights over time for audit and analysis';
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON TABLE provider_metrics IS 'Daily aggregated metrics for each provider, used for reliability scoring';
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON FUNCTION update_provider_metrics IS 'Atomically updates provider metrics for a given day, handling concurrent updates safely';
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON VIEW provider_performance_summary IS 'Summary of provider scoring performance over last 30 days';
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON VIEW provider_metrics_summary IS 'Summary of provider operational metrics over last 30 days';
supabase/migrations/20241202_phase3_scoring_schema.sql-COMMENT ON VIEW order_outcomes_summary IS 'Summary of order outcomes by provider over last 30 days';
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql--- ============================================================================
supabase/migrations/20241202_phase3_scoring_schema.sql--- Migration Complete
supabase/migrations/20241202_phase3_scoring_schema.sql--- ============================================================================
supabase/migrations/20241202_phase3_scoring_schema.sql-
supabase/migrations/20241202_phase3_scoring_schema.sql--- Verify tables were created
supabase/migrations/20241202_phase3_scoring_schema.sql-DO $$
supabase/migrations/20241202_phase3_scoring_schema.sql-BEGIN
supabase/migrations/20241202_phase3_scoring_schema.sql-  RAISE NOTICE 'Phase 3 schema migration complete!';
supabase/migrations/20241202_phase3_scoring_schema.sql-  RAISE NOTICE 'Created tables: score_calculations, order_outcomes, weight_adjustments, provider_metrics';
supabase/migrations/20241202_phase3_scoring_schema.sql-  RAISE NOTICE 'Created function: update_provider_metrics()';
--
supabase/migrations/20251026150000_add_weight_tracker.sql:ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251026150000_add_weight_tracker.sql:ALTER TABLE plan_outcomes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251026150000_add_weight_tracker.sql:ALTER TABLE weight_prefs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql--- Policies: Users can only access their own data
supabase/migrations/20251026150000_add_weight_tracker.sql--- Note: In production, you'll need to set up proper authentication
supabase/migrations/20251026150000_add_weight_tracker.sql--- For now, these are permissive policies for service role access
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can view their own weight logs"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_logs FOR SELECT
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true); -- Service role has full access
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can insert their own weight logs"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_logs FOR INSERT
supabase/migrations/20251026150000_add_weight_tracker.sql-  WITH CHECK (true); -- Service role has full access
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can update their own weight logs"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_logs FOR UPDATE
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true); -- Service role has full access
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can view their own plan outcomes"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON plan_outcomes FOR SELECT
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can insert their own plan outcomes"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON plan_outcomes FOR INSERT
supabase/migrations/20251026150000_add_weight_tracker.sql-  WITH CHECK (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can update their own plan outcomes"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON plan_outcomes FOR UPDATE
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can view their own preferences"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_prefs FOR SELECT
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can insert their own preferences"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_prefs FOR INSERT
supabase/migrations/20251026150000_add_weight_tracker.sql-  WITH CHECK (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql:CREATE POLICY "Users can update their own preferences"
supabase/migrations/20251026150000_add_weight_tracker.sql-  ON weight_prefs FOR UPDATE
supabase/migrations/20251026150000_add_weight_tracker.sql-  USING (true);
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql--- =====================================================
supabase/migrations/20251026150000_add_weight_tracker.sql--- 7. SEED DATA (Optional)
supabase/migrations/20251026150000_add_weight_tracker.sql--- =====================================================
supabase/migrations/20251026150000_add_weight_tracker.sql--- Insert default preferences for testing
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql--- This will be handled by the application on first use
supabase/migrations/20251026150000_add_weight_tracker.sql-
supabase/migrations/20251026150000_add_weight_tracker.sql--- =====================================================
supabase/migrations/20251026150000_add_weight_tracker.sql--- MIGRATION COMPLETE
supabase/migrations/20251026150000_add_weight_tracker.sql--- =====================================================
supabase/migrations/20251026150000_add_weight_tracker.sql--- Tables created: weight_logs, plan_outcomes, weight_prefs
supabase/migrations/20251026150000_add_weight_tracker.sql--- Views created: plan_outcome_analytics
supabase/migrations/20251026150000_add_weight_tracker.sql--- Functions created: get_latest_weight, get_weight_trend
supabase/migrations/20251026150000_add_weight_tracker.sql--- RLS enabled with permissive policies for service role
supabase/migrations/20251026150000_add_weight_tracker.sql--- =====================================================
supabase/migrations/20251026150000_add_weight_tracker.sql-
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own profile"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.user_profiles FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can update own profile"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.user_profiles FOR UPDATE
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can insert own profile"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.user_profiles FOR INSERT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Auto-create user profile on signup
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE OR REPLACE FUNCTION public.handle_new_user()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-RETURNS TRIGGER AS $$
supabase/migrations/20251101000000_complete_schema_with_auth.sql-BEGIN
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  INSERT INTO public.user_profiles (user_id, email, display_name)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  VALUES (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    NEW.id,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    NEW.email,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  );
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  RETURN NEW;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-END;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-$$ LANGUAGE plpgsql SECURITY DEFINER;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TRIGGER on_auth_user_created
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  AFTER INSERT ON auth.users
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- MEAL PLANNING
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.meal_plans (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  start_date DATE NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  end_date DATE NOT NULL,
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies for meal_plans
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own meal plans"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.meal_plans FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can create own meal plans"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.meal_plans FOR INSERT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can update own meal plans"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.meal_plans FOR UPDATE
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies for meal_plan_items
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own meal plan items"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.meal_plan_items FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (EXISTS (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    SELECT 1 FROM public.meal_plans
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    WHERE meal_plans.plan_id = meal_plan_items.plan_id
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    AND meal_plans.user_id = auth.uid()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ));
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can create own meal plan items"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.meal_plan_items FOR INSERT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (EXISTS (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    SELECT 1 FROM public.meal_plans
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    WHERE meal_plans.plan_id = meal_plan_items.plan_id
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    AND meal_plans.user_id = auth.uid()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ));
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies for recipes (public read)
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Anyone can view recipes"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.recipes FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- WEIGHT TRACKING
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.weight_logs (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  date DATE NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  weight_kg DECIMAL(5,2) NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  notes TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  UNIQUE(user_id, date)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.plan_outcomes (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  outcome_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  week_start DATE NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  week_end DATE NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  target_delta_kg DECIMAL(4,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  actual_delta_kg DECIMAL(4,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  recommended_adjustment_kcal INTEGER,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  applied BOOLEAN DEFAULT FALSE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.plan_outcomes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.weight_prefs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can manage own weight logs"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.weight_logs FOR ALL
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own plan outcomes"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.plan_outcomes FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can manage own weight prefs"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.weight_prefs FOR ALL
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- AFFILIATE LINKS
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.affiliate_links (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ingredient TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  partner TEXT NOT NULL CHECK (partner IN ('amazon', 'instacart')),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  url TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  cached_at TIMESTAMPTZ DEFAULT NOW(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  UNIQUE(ingredient, partner)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.affiliate_partner_map (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  id SERIAL PRIMARY KEY,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  country TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  partner_type TEXT NOT NULL CHECK (partner_type IN ('grocery', 'delivery')),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  partner_name TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  affiliate_id TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  base_url TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  priority INTEGER DEFAULT 1,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  is_active BOOLEAN DEFAULT TRUE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  UNIQUE(country, partner_type, partner_name)
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.affiliate_partner_map ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.affiliate_analytics ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Public read for affiliate data
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Anyone can view affiliate links"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.affiliate_links FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Anyone can view partner map"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.affiliate_partner_map FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- DELIVERY PARTNERS
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.delivery_partners (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  id SERIAL PRIMARY KEY,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  name TEXT NOT NULL UNIQUE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  base_url TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  affiliate_id TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  cuisine_tags TEXT[],
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  diet_tags TEXT[],
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  supported_countries TEXT[],
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  commission_rate DECIMAL(4,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  is_active BOOLEAN DEFAULT TRUE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.delivery_recommendations (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  cuisine TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  diet_preference TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  country TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  partner_name TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  affiliate_url TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  match_score INTEGER,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  metadata JSONB,
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.delivery_recommendations ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Public read
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Anyone can view delivery partners"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.delivery_partners FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- MEALME ORDERS
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.orders (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  plan_id UUID REFERENCES public.meal_plans(plan_id) ON DELETE SET NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  mealme_order_id TEXT UNIQUE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  store_name TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  total_amount DECIMAL(10,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  commission_amount DECIMAL(10,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  delivery_address JSONB,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  updated_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.order_items (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ingredient TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  quantity TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  price DECIMAL(10,2),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
--
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.mealme_webhook_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- RLS Policies
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own orders"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.orders FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own order items"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.order_items FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (EXISTS (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    SELECT 1 FROM public.orders
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    WHERE orders.order_id = order_items.order_id
supabase/migrations/20251101000000_complete_schema_with_auth.sql-    AND orders.user_id = auth.uid()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ));
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Users can view own delivery quotes"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.delivery_quotes FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- FEATURE FLAGS
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.feature_flags (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  flag_name TEXT PRIMARY KEY,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  enabled BOOLEAN DEFAULT FALSE,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  description TEXT,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  updated_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Enable RLS (public read)
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Anyone can view feature flags"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.feature_flags FOR SELECT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  USING (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ANALYTICS
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE TABLE IF NOT EXISTS public.events (
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  event_type TEXT NOT NULL,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  event_data JSONB,
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  created_at TIMESTAMPTZ DEFAULT NOW()
supabase/migrations/20251101000000_complete_schema_with_auth.sql-);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Enable RLS
supabase/migrations/20251101000000_complete_schema_with_auth.sql:ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql:CREATE POLICY "Service role can insert events"
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  ON public.events FOR INSERT
supabase/migrations/20251101000000_complete_schema_with_auth.sql-  WITH CHECK (true);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- INDEXES
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- ============================================================================
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- User profiles
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_user_profiles_country ON public.user_profiles(country);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_user_profiles_language ON public.user_profiles(language);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Meal plans
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_meal_plans_user_id ON public.meal_plans(user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_meal_plans_dates ON public.meal_plans(start_date, end_date);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_meal_plan_items_plan_id ON public.meal_plan_items(plan_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Weight tracking
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_weight_logs_user_date ON public.weight_logs(user_id, date DESC);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_plan_outcomes_user_id ON public.plan_outcomes(user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Affiliate links
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_affiliate_links_ingredient ON public.affiliate_links(ingredient);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_affiliate_links_expires ON public.affiliate_links(expires_at);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Orders
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_orders_user_id ON public.orders(user_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_orders_status ON public.orders(status);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
supabase/migrations/20251101000000_complete_schema_with_auth.sql-
supabase/migrations/20251101000000_complete_schema_with_auth.sql--- Events
--
supabase/migrations/20251101160000_create_tracker_tables.sql:ALTER TABLE tracker_users ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can view own profile"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_users FOR SELECT
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);  -- Simplified for Edge Functions
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can insert own profile"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_users FOR INSERT
supabase/migrations/20251101160000_create_tracker_tables.sql-  WITH CHECK (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can update own profile"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_users FOR UPDATE
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql--- Table 2: Food Database
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE TABLE tracker_foods (
supabase/migrations/20251101160000_create_tracker_tables.sql-  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Food identification
supabase/migrations/20251101160000_create_tracker_tables.sql-  name TEXT NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  name_variations JSONB DEFAULT '[]'::jsonb,
supabase/migrations/20251101160000_create_tracker_tables.sql-  category TEXT CHECK (category IN ('protein', 'carbs', 'fats', 'vegetables', 'fruits', 'dairy', 'snacks', 'beverages', 'other')),
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Nutrition per 100g
supabase/migrations/20251101160000_create_tracker_tables.sql-  calories_per_100g INTEGER NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  protein_per_100g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  carbs_per_100g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  fat_per_100g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  fiber_per_100g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  sugar_per_100g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Common serving sizes
supabase/migrations/20251101160000_create_tracker_tables.sql-  common_servings JSONB DEFAULT '[]'::jsonb,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Source and confidence
supabase/migrations/20251101160000_create_tracker_tables.sql-  data_source TEXT DEFAULT 'USDA',
supabase/migrations/20251101160000_create_tracker_tables.sql-  verified BOOLEAN DEFAULT true,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
--
supabase/migrations/20251101160000_create_tracker_tables.sql:ALTER TABLE tracker_foods ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Anyone can view foods"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_foods FOR SELECT
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "System can insert foods"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_foods FOR INSERT
supabase/migrations/20251101160000_create_tracker_tables.sql-  WITH CHECK (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql--- Table 3: Food Logs
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE TABLE tracker_food_logs (
supabase/migrations/20251101160000_create_tracker_tables.sql-  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  user_id UUID REFERENCES tracker_users(id) ON DELETE CASCADE,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- When
supabase/migrations/20251101160000_create_tracker_tables.sql-  logged_at TIMESTAMP DEFAULT NOW(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  log_date DATE NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- What
supabase/migrations/20251101160000_create_tracker_tables.sql-  food_name TEXT NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  food_id UUID REFERENCES tracker_foods(id) ON DELETE SET NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- How much
supabase/migrations/20251101160000_create_tracker_tables.sql-  quantity DECIMAL(10,2) NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  quantity_unit TEXT NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Calculated nutrition (denormalized for fast queries)
supabase/migrations/20251101160000_create_tracker_tables.sql-  calories INTEGER NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  protein_g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  carbs_g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  fat_g DECIMAL(5,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  fiber_g DECIMAL(5,2) DEFAULT 0,
--
supabase/migrations/20251101160000_create_tracker_tables.sql:ALTER TABLE tracker_food_logs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can view own logs"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_food_logs FOR SELECT
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can insert own logs"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_food_logs FOR INSERT
supabase/migrations/20251101160000_create_tracker_tables.sql-  WITH CHECK (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can update own logs"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_food_logs FOR UPDATE
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can delete own logs"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_food_logs FOR DELETE
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql--- Table 4: Daily Summaries
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE TABLE tracker_daily_summaries (
supabase/migrations/20251101160000_create_tracker_tables.sql-  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  user_id UUID REFERENCES tracker_users(id) ON DELETE CASCADE,
supabase/migrations/20251101160000_create_tracker_tables.sql-  summary_date DATE NOT NULL,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Totals
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_calories INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_protein_g DECIMAL(6,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_carbs_g DECIMAL(6,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_fat_g DECIMAL(6,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_fiber_g DECIMAL(6,2) DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Meal breakdown
supabase/migrations/20251101160000_create_tracker_tables.sql-  breakfast_calories INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  lunch_calories INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  dinner_calories INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  snack_calories INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Metadata
supabase/migrations/20251101160000_create_tracker_tables.sql-  num_logs INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  last_updated TIMESTAMP DEFAULT NOW(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  UNIQUE(user_id, summary_date)
--
supabase/migrations/20251101160000_create_tracker_tables.sql:ALTER TABLE tracker_daily_summaries ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can view own summaries"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_daily_summaries FOR SELECT
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "System can insert summaries"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_daily_summaries FOR INSERT
supabase/migrations/20251101160000_create_tracker_tables.sql-  WITH CHECK (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "System can update summaries"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_daily_summaries FOR UPDATE
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql--- Table 5: User Stats
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE TABLE tracker_user_stats (
supabase/migrations/20251101160000_create_tracker_tables.sql-  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101160000_create_tracker_tables.sql-  user_id UUID UNIQUE REFERENCES tracker_users(id) ON DELETE CASCADE,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Streaks
supabase/migrations/20251101160000_create_tracker_tables.sql-  current_streak_days INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  longest_streak_days INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  last_log_date DATE,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Totals
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_days_logged INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  total_foods_logged INTEGER DEFAULT 0,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  -- Milestones
supabase/migrations/20251101160000_create_tracker_tables.sql-  first_log_date DATE,
supabase/migrations/20251101160000_create_tracker_tables.sql-  
supabase/migrations/20251101160000_create_tracker_tables.sql-  updated_at TIMESTAMP DEFAULT NOW()
supabase/migrations/20251101160000_create_tracker_tables.sql-);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE INDEX idx_tracker_stats_user ON tracker_user_stats(user_id);
supabase/migrations/20251101160000_create_tracker_tables.sql-CREATE INDEX idx_tracker_stats_streak ON tracker_user_stats(current_streak_days);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- RLS Policies
supabase/migrations/20251101160000_create_tracker_tables.sql:ALTER TABLE tracker_user_stats ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "Users can view own stats"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_user_stats FOR SELECT
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "System can insert stats"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_user_stats FOR INSERT
supabase/migrations/20251101160000_create_tracker_tables.sql-  WITH CHECK (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql:CREATE POLICY "System can update stats"
supabase/migrations/20251101160000_create_tracker_tables.sql-  ON tracker_user_stats FOR UPDATE
supabase/migrations/20251101160000_create_tracker_tables.sql-  USING (true);
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql--- SUCCESS MESSAGE
supabase/migrations/20251101160000_create_tracker_tables.sql--- =====================================================
supabase/migrations/20251101160000_create_tracker_tables.sql-
supabase/migrations/20251101160000_create_tracker_tables.sql-DO $$
supabase/migrations/20251101160000_create_tracker_tables.sql-BEGIN
supabase/migrations/20251101160000_create_tracker_tables.sql-  RAISE NOTICE '✅ TheLoop Tracker tables created successfully!';
supabase/migrations/20251101160000_create_tracker_tables.sql-  RAISE NOTICE '📊 Tables: tracker_users, tracker_foods, tracker_food_logs, tracker_daily_summaries, tracker_user_stats';
supabase/migrations/20251101160000_create_tracker_tables.sql-  RAISE NOTICE '🔐 RLS policies enabled on all tables';
supabase/migrations/20251101160000_create_tracker_tables.sql-  RAISE NOTICE '📈 Indexes created for performance';
supabase/migrations/20251101160000_create_tracker_tables.sql-END $$;
supabase/migrations/20251101160000_create_tracker_tables.sql-
--
supabase/migrations/20251101180000_create_billing_tables.sql:ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Users can only view their own subscription
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY user_isolation_select ON subscriptions
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR SELECT
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Service role can do anything (for Edge Functions)
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY service_role_all ON subscriptions
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR ALL
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (auth.role() = 'service_role');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- Add updated_at trigger
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE OR REPLACE FUNCTION update_updated_at_column()
supabase/migrations/20251101180000_create_billing_tables.sql-RETURNS TRIGGER AS $$
supabase/migrations/20251101180000_create_billing_tables.sql-BEGIN
supabase/migrations/20251101180000_create_billing_tables.sql-  NEW.updated_at = now();
supabase/migrations/20251101180000_create_billing_tables.sql-  RETURN NEW;
supabase/migrations/20251101180000_create_billing_tables.sql-END;
supabase/migrations/20251101180000_create_billing_tables.sql-$$ LANGUAGE plpgsql;
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE TRIGGER update_subscriptions_updated_at
supabase/migrations/20251101180000_create_billing_tables.sql-  BEFORE UPDATE ON subscriptions
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR EACH ROW
supabase/migrations/20251101180000_create_billing_tables.sql-  EXECUTE FUNCTION update_updated_at_column();
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql--- 2. ENTITLEMENTS TABLE
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE TABLE IF NOT EXISTS entitlements (
supabase/migrations/20251101180000_create_billing_tables.sql-  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101180000_create_billing_tables.sql-  chatgpt_user_id text NOT NULL UNIQUE,
supabase/migrations/20251101180000_create_billing_tables.sql-  credits int DEFAULT 0,
supabase/migrations/20251101180000_create_billing_tables.sql-  last_refill timestamptz DEFAULT now(),
supabase/migrations/20251101180000_create_billing_tables.sql-  created_at timestamptz DEFAULT now(),
supabase/migrations/20251101180000_create_billing_tables.sql-  updated_at timestamptz DEFAULT now(),
supabase/migrations/20251101180000_create_billing_tables.sql-  
supabase/migrations/20251101180000_create_billing_tables.sql-  -- Foreign key to subscriptions
supabase/migrations/20251101180000_create_billing_tables.sql-  CONSTRAINT fk_entitlements_user
--
supabase/migrations/20251101180000_create_billing_tables.sql:ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Users can only view their own entitlements
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY user_isolation_entitlements ON entitlements
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR SELECT
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Service role can do anything
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY service_role_entitlements ON entitlements
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR ALL
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (auth.role() = 'service_role');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- Add updated_at trigger
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE TRIGGER update_entitlements_updated_at
supabase/migrations/20251101180000_create_billing_tables.sql-  BEFORE UPDATE ON entitlements
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR EACH ROW
supabase/migrations/20251101180000_create_billing_tables.sql-  EXECUTE FUNCTION update_updated_at_column();
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql--- 3. ANALYTICS_EVENTS TABLE
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE TABLE IF NOT EXISTS analytics_events (
supabase/migrations/20251101180000_create_billing_tables.sql-  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
supabase/migrations/20251101180000_create_billing_tables.sql-  event_type text NOT NULL,
supabase/migrations/20251101180000_create_billing_tables.sql-  chatgpt_user_id text,
supabase/migrations/20251101180000_create_billing_tables.sql-  email text,
supabase/migrations/20251101180000_create_billing_tables.sql-  stripe_customer_id text,
supabase/migrations/20251101180000_create_billing_tables.sql-  stripe_subscription_id text,
supabase/migrations/20251101180000_create_billing_tables.sql-  metadata jsonb,
supabase/migrations/20251101180000_create_billing_tables.sql-  created_at timestamptz DEFAULT now()
supabase/migrations/20251101180000_create_billing_tables.sql-);
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- Add indexes for analytics queries
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(chatgpt_user_id);
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- Enable Row Level Security (read-only for users)
supabase/migrations/20251101180000_create_billing_tables.sql:ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Users can view their own events
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY user_view_own_events ON analytics_events
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR SELECT
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (chatgpt_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- RLS Policy: Service role can do anything
supabase/migrations/20251101180000_create_billing_tables.sql:CREATE POLICY service_role_analytics ON analytics_events
supabase/migrations/20251101180000_create_billing_tables.sql-  FOR ALL
supabase/migrations/20251101180000_create_billing_tables.sql-  USING (auth.role() = 'service_role');
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql--- 4. HELPER FUNCTIONS
supabase/migrations/20251101180000_create_billing_tables.sql--- =====================================================
supabase/migrations/20251101180000_create_billing_tables.sql-
supabase/migrations/20251101180000_create_billing_tables.sql--- Function to check if user has premium access
supabase/migrations/20251101180000_create_billing_tables.sql-CREATE OR REPLACE FUNCTION has_premium_access(user_id text)
supabase/migrations/20251101180000_create_billing_tables.sql-RETURNS boolean AS $$
supabase/migrations/20251101180000_create_billing_tables.sql-DECLARE
supabase/migrations/20251101180000_create_billing_tables.sql-  sub_record RECORD;
supabase/migrations/20251101180000_create_billing_tables.sql-  trial_active boolean;
supabase/migrations/20251101180000_create_billing_tables.sql-BEGIN
supabase/migrations/20251101180000_create_billing_tables.sql-  -- Get subscription record
supabase/migrations/20251101180000_create_billing_tables.sql-  SELECT status, tier, trial_end INTO sub_record
supabase/migrations/20251101180000_create_billing_tables.sql-  FROM subscriptions
supabase/migrations/20251101180000_create_billing_tables.sql-  WHERE chatgpt_user_id = user_id;
supabase/migrations/20251101180000_create_billing_tables.sql-  
supabase/migrations/20251101180000_create_billing_tables.sql-  -- If no subscription, return false
supabase/migrations/20251101180000_create_billing_tables.sql-  IF sub_record IS NULL THEN
supabase/migrations/20251101180000_create_billing_tables.sql-    RETURN false;
supabase/migrations/20251101180000_create_billing_tables.sql-  END IF;
supabase/migrations/20251101180000_create_billing_tables.sql-  
supabase/migrations/20251101180000_create_billing_tables.sql-  -- Check if trial is active
supabase/migrations/20251101180000_create_billing_tables.sql-  trial_active := sub_record.trial_end IS NOT NULL AND sub_record.trial_end > now();
supabase/migrations/20251101180000_create_billing_tables.sql-  
supabase/migrations/20251101180000_create_billing_tables.sql-  -- Return true if active subscription or active trial
supabase/migrations/20251101180000_create_billing_tables.sql-  RETURN (sub_record.status = 'active' OR trial_active) AND sub_record.tier IN ('premium', 'family');
supabase/migrations/20251101180000_create_billing_tables.sql-END;
--
supabase/migrations/20251101180100_create_food_search_logs.sql:alter table food_search_logs enable row level security;
supabase/migrations/20251101180100_create_food_search_logs.sql-
supabase/migrations/20251101180100_create_food_search_logs.sql--- Users can only see their own logs
supabase/migrations/20251101180100_create_food_search_logs.sql-create policy "Users can view own search logs"
supabase/migrations/20251101180100_create_food_search_logs.sql-  on food_search_logs
supabase/migrations/20251101180100_create_food_search_logs.sql-  for select
supabase/migrations/20251101180100_create_food_search_logs.sql-  using (auth.uid() = user_id);
supabase/migrations/20251101180100_create_food_search_logs.sql-
supabase/migrations/20251101180100_create_food_search_logs.sql--- Service role can insert logs
supabase/migrations/20251101180100_create_food_search_logs.sql-create policy "Service role can insert logs"
supabase/migrations/20251101180100_create_food_search_logs.sql-  on food_search_logs
supabase/migrations/20251101180100_create_food_search_logs.sql-  for insert
supabase/migrations/20251101180100_create_food_search_logs.sql-  with check (true);
supabase/migrations/20251101180100_create_food_search_logs.sql-
supabase/migrations/20251101180100_create_food_search_logs.sql--- Admin users can view all logs
supabase/migrations/20251101180100_create_food_search_logs.sql-create policy "Admin users can view all logs"
supabase/migrations/20251101180100_create_food_search_logs.sql-  on food_search_logs
supabase/migrations/20251101180100_create_food_search_logs.sql-  for select
supabase/migrations/20251101180100_create_food_search_logs.sql-  using (
supabase/migrations/20251101180100_create_food_search_logs.sql-    exists (
supabase/migrations/20251101180100_create_food_search_logs.sql-      select 1 from auth.users
supabase/migrations/20251101180100_create_food_search_logs.sql-      where auth.users.id = auth.uid()
supabase/migrations/20251101180100_create_food_search_logs.sql-      and auth.users.raw_user_meta_data->>'role' = 'admin'
supabase/migrations/20251101180100_create_food_search_logs.sql-    )
supabase/migrations/20251101180100_create_food_search_logs.sql-  );
supabase/migrations/20251101180100_create_food_search_logs.sql-
supabase/migrations/20251101180100_create_food_search_logs.sql--- Add comment
supabase/migrations/20251101180100_create_food_search_logs.sql-comment on table food_search_logs is 'Tracks all food resolver queries for performance monitoring and analytics';
supabase/migrations/20251101180100_create_food_search_logs.sql-
--
supabase/migrations/20251101180300_create_tool_choice_log.sql:alter table tool_choice_log enable row level security;
supabase/migrations/20251101180300_create_tool_choice_log.sql-
supabase/migrations/20251101180300_create_tool_choice_log.sql-create policy "Service role can insert tool choice logs"
supabase/migrations/20251101180300_create_tool_choice_log.sql-  on tool_choice_log
supabase/migrations/20251101180300_create_tool_choice_log.sql-  for insert
supabase/migrations/20251101180300_create_tool_choice_log.sql-  to service_role
supabase/migrations/20251101180300_create_tool_choice_log.sql-  with check (true);
supabase/migrations/20251101180300_create_tool_choice_log.sql-
supabase/migrations/20251101180300_create_tool_choice_log.sql-create policy "Admins can read tool choice logs"
supabase/migrations/20251101180300_create_tool_choice_log.sql-  on tool_choice_log
supabase/migrations/20251101180300_create_tool_choice_log.sql-  for select
supabase/migrations/20251101180300_create_tool_choice_log.sql-  using (true); -- Public read for monitoring
supabase/migrations/20251101180300_create_tool_choice_log.sql-
supabase/migrations/20251101180300_create_tool_choice_log.sql--- Grant permissions
supabase/migrations/20251101180300_create_tool_choice_log.sql-grant select on tool_choice_log to anon, authenticated;
supabase/migrations/20251101180300_create_tool_choice_log.sql-grant insert on tool_choice_log to service_role;
supabase/migrations/20251101180300_create_tool_choice_log.sql-
supabase/migrations/20251101180300_create_tool_choice_log.sql-comment on table tool_choice_log is 'Logs tool selection for routing accuracy analysis and QA';
supabase/migrations/20251101180300_create_tool_choice_log.sql-
--
supabase/migrations/20251129_rate_limiting.sql:ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251129_rate_limiting.sql-
supabase/migrations/20251129_rate_limiting.sql--- RLS Policy: Users can only see their own rate limits
supabase/migrations/20251129_rate_limiting.sql:CREATE POLICY "Users can view own rate limits"
supabase/migrations/20251129_rate_limiting.sql-  ON rate_limits
supabase/migrations/20251129_rate_limiting.sql-  FOR SELECT
supabase/migrations/20251129_rate_limiting.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251129_rate_limiting.sql-
supabase/migrations/20251129_rate_limiting.sql--- RLS Policy: System can insert/update rate limits (via service role)
supabase/migrations/20251129_rate_limiting.sql:CREATE POLICY "Service role can manage rate limits"
supabase/migrations/20251129_rate_limiting.sql-  ON rate_limits
supabase/migrations/20251129_rate_limiting.sql-  FOR ALL
supabase/migrations/20251129_rate_limiting.sql-  USING (true)
supabase/migrations/20251129_rate_limiting.sql-  WITH CHECK (true);
supabase/migrations/20251129_rate_limiting.sql-
supabase/migrations/20251129_rate_limiting.sql--- ============================================================================
supabase/migrations/20251129_rate_limiting.sql--- Rate Limit Check Function
supabase/migrations/20251129_rate_limiting.sql--- ============================================================================
supabase/migrations/20251129_rate_limiting.sql--- Checks if a user has exceeded rate limits for an endpoint
supabase/migrations/20251129_rate_limiting.sql--- Returns: { allowed: boolean, remaining: number, reset_at: timestamp }
supabase/migrations/20251129_rate_limiting.sql--- ============================================================================
supabase/migrations/20251129_rate_limiting.sql-
supabase/migrations/20251129_rate_limiting.sql-CREATE OR REPLACE FUNCTION check_rate_limit(
supabase/migrations/20251129_rate_limiting.sql-  p_user_id UUID,
supabase/migrations/20251129_rate_limiting.sql-  p_endpoint TEXT,
supabase/migrations/20251129_rate_limiting.sql-  p_limit INTEGER DEFAULT 100,
supabase/migrations/20251129_rate_limiting.sql-  p_window_minutes INTEGER DEFAULT 60
supabase/migrations/20251129_rate_limiting.sql-)
supabase/migrations/20251129_rate_limiting.sql-RETURNS JSON
supabase/migrations/20251129_rate_limiting.sql-LANGUAGE plpgsql
supabase/migrations/20251129_rate_limiting.sql-SECURITY DEFINER
supabase/migrations/20251129_rate_limiting.sql-AS $$
supabase/migrations/20251129_rate_limiting.sql-DECLARE
supabase/migrations/20251129_rate_limiting.sql-  v_window_start TIMESTAMP WITH TIME ZONE;
supabase/migrations/20251129_rate_limiting.sql-  v_current_count INTEGER;
supabase/migrations/20251129_rate_limiting.sql-  v_remaining INTEGER;
supabase/migrations/20251129_rate_limiting.sql-  v_reset_at TIMESTAMP WITH TIME ZONE;
supabase/migrations/20251129_rate_limiting.sql-  v_allowed BOOLEAN;
supabase/migrations/20251129_rate_limiting.sql-BEGIN
supabase/migrations/20251129_rate_limiting.sql-  -- Calculate window start (round down to nearest window)
--
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.ingredient_submissions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.recipe_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.meal_logs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.meal_plans ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.affiliate_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.user_goals ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:ALTER TABLE analytics.session_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- Policy: Service role can do anything (for backend inserts)
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.ingredient_submissions FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.recipe_events FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.meal_logs FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.meal_plans FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.affiliate_events FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.user_goals FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY service_role_all ON analytics.session_events FOR ALL TO service_role USING (true);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- Policy: Users can view their own data
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.ingredient_submissions 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.recipe_events 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.meal_logs 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.meal_plans 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.affiliate_events 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.user_goals 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql:CREATE POLICY users_view_own ON analytics.session_events 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  FOR SELECT TO authenticated 
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  USING (auth.uid() = user_id);
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- ============================================================================
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- Migration Complete
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- ============================================================================
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-
supabase/migrations/20251206100000_analytics_foundational_metrics.sql--- Log migration completion
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-DO $$
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-BEGIN
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  RAISE NOTICE 'Analytics foundational metrics schema created successfully';
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  RAISE NOTICE '7 tables created: ingredient_submissions, recipe_events, meal_logs, meal_plans, affiliate_events, user_goals, session_events';
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  RAISE NOTICE '3 materialized views created: daily_active_users, recipe_acceptance_rate, affiliate_conversion_rate';
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-  RAISE NOTICE '2 helper functions created: refresh_all_views, get_user_summary';
supabase/migrations/20251206100000_analytics_foundational_metrics.sql-END $$;
--
supabase/migrations/20251206120000_user_segmentation.sql:ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql:CREATE POLICY "Users can view their own segments"
supabase/migrations/20251206120000_user_segmentation.sql-  ON user_segments FOR SELECT
supabase/migrations/20251206120000_user_segmentation.sql-  USING (auth.uid()::TEXT = user_id);
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql:CREATE POLICY "Service role can manage all segments"
supabase/migrations/20251206120000_user_segmentation.sql-  ON user_segments FOR ALL
supabase/migrations/20251206120000_user_segmentation.sql-  USING (auth.role() = 'service_role');
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql--- ============================================================================
supabase/migrations/20251206120000_user_segmentation.sql--- SEGMENT DEFINITIONS
supabase/migrations/20251206120000_user_segmentation.sql--- ============================================================================
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql--- Engagement Segments:
supabase/migrations/20251206120000_user_segmentation.sql--- - power_user: Active 20+ days/month, high session count
supabase/migrations/20251206120000_user_segmentation.sql--- - active_user: Active 10-19 days/month
supabase/migrations/20251206120000_user_segmentation.sql--- - regular_user: Active 3-9 days/month
supabase/migrations/20251206120000_user_segmentation.sql--- - casual_user: Active 1-2 days/month
supabase/migrations/20251206120000_user_segmentation.sql--- - at_risk: Was active, now declining
supabase/migrations/20251206120000_user_segmentation.sql--- - churned: No activity in 30+ days
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql--- Dietary Segments:
supabase/migrations/20251206120000_user_segmentation.sql--- - vegan: Vegan diet preference
supabase/migrations/20251206120000_user_segmentation.sql--- - vegetarian: Vegetarian diet preference
supabase/migrations/20251206120000_user_segmentation.sql--- - keto: Keto diet preference
supabase/migrations/20251206120000_user_segmentation.sql--- - high_protein: High protein focus
supabase/migrations/20251206120000_user_segmentation.sql--- - low_carb: Low carb focus
supabase/migrations/20251206120000_user_segmentation.sql--- - balanced: Balanced diet
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql--- Feature Usage Segments:
supabase/migrations/20251206120000_user_segmentation.sql--- - recipe_explorer: High chaos mode usage, many recipe generations
supabase/migrations/20251206120000_user_segmentation.sql--- - meal_planner: Frequent meal plan generation
supabase/migrations/20251206120000_user_segmentation.sql--- - nutrition_tracker: Frequent meal logging
supabase/migrations/20251206120000_user_segmentation.sql--- - grocery_shopper: High affiliate click rate
supabase/migrations/20251206120000_user_segmentation.sql-
supabase/migrations/20251206120000_user_segmentation.sql--- Value Segments:
--
supabase/migrations/20251206_tool_invocations_observability.sql:ALTER TABLE analytics.tool_invocations ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql--- Policy: Only service_role can access (analytics-only table)
supabase/migrations/20251206_tool_invocations_observability.sql:CREATE POLICY service_role_all ON analytics.tool_invocations
supabase/migrations/20251206_tool_invocations_observability.sql-  FOR ALL
supabase/migrations/20251206_tool_invocations_observability.sql-  USING (auth.role() = 'service_role');
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql--- ============================================================================
supabase/migrations/20251206_tool_invocations_observability.sql--- 4. Add Comment for Documentation
supabase/migrations/20251206_tool_invocations_observability.sql--- ============================================================================
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-COMMENT ON TABLE analytics.tool_invocations IS 
supabase/migrations/20251206_tool_invocations_observability.sql-  'Observability table for tracking all MCP tool invocations with timing, success/failure, and error codes. Used for monitoring, alerting, and performance analysis.';
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-COMMENT ON COLUMN analytics.tool_invocations.tool_name IS 
supabase/migrations/20251206_tool_invocations_observability.sql-  'Name of the MCP tool that was invoked (e.g., delivery_search_restaurants, get_affiliate_links)';
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-COMMENT ON COLUMN analytics.tool_invocations.duration_ms IS 
supabase/migrations/20251206_tool_invocations_observability.sql-  'Total execution time in milliseconds, including retries';
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-COMMENT ON COLUMN analytics.tool_invocations.error_code IS 
supabase/migrations/20251206_tool_invocations_observability.sql-  'Standardized error code from ToolErrorCode enum (TIMEOUT, NETWORK_ERROR, UPSTREAM_4XX, UPSTREAM_5XX, VALIDATION_ERROR, UNKNOWN)';
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-COMMENT ON COLUMN analytics.tool_invocations.metadata IS 
supabase/migrations/20251206_tool_invocations_observability.sql-  'Arbitrary JSON for debugging context (keep lightweight to avoid storage bloat)';
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql--- ============================================================================
supabase/migrations/20251206_tool_invocations_observability.sql--- 5. Log Migration Completion
supabase/migrations/20251206_tool_invocations_observability.sql--- ============================================================================
supabase/migrations/20251206_tool_invocations_observability.sql-
supabase/migrations/20251206_tool_invocations_observability.sql-DO $$ 
supabase/migrations/20251206_tool_invocations_observability.sql-BEGIN
supabase/migrations/20251206_tool_invocations_observability.sql-  RAISE NOTICE 'Migration complete: analytics.tool_invocations table created with % indexes', 
supabase/migrations/20251206_tool_invocations_observability.sql-    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'tool_invocations' AND schemaname = 'analytics');
--
supabase/migrations/20251207_provider_metrics.sql:ALTER TABLE analytics.provider_metrics ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251207_provider_metrics.sql-
supabase/migrations/20251207_provider_metrics.sql--- Service role can do everything
supabase/migrations/20251207_provider_metrics.sql:CREATE POLICY IF NOT EXISTS "Service role has full access to provider_metrics"
supabase/migrations/20251207_provider_metrics.sql-  ON analytics.provider_metrics
supabase/migrations/20251207_provider_metrics.sql-  FOR ALL
supabase/migrations/20251207_provider_metrics.sql-  TO service_role
supabase/migrations/20251207_provider_metrics.sql-  USING (true)
supabase/migrations/20251207_provider_metrics.sql-  WITH CHECK (true);
supabase/migrations/20251207_provider_metrics.sql-
supabase/migrations/20251207_provider_metrics.sql--- ============================================================================
supabase/migrations/20251207_provider_metrics.sql--- Helper Function: Upsert Provider Metrics
supabase/migrations/20251207_provider_metrics.sql--- ============================================================================
supabase/migrations/20251207_provider_metrics.sql--- This function is called by loopgpt_record_outcome to update provider metrics
supabase/migrations/20251207_provider_metrics.sql--- It handles the upsert logic and recomputes derived metrics
supabase/migrations/20251207_provider_metrics.sql-
supabase/migrations/20251207_provider_metrics.sql-CREATE OR REPLACE FUNCTION analytics.upsert_provider_metrics(
supabase/migrations/20251207_provider_metrics.sql-  p_provider_id TEXT,
supabase/migrations/20251207_provider_metrics.sql-  p_provider_name TEXT,
supabase/migrations/20251207_provider_metrics.sql-  p_outcome TEXT,              -- 'success', 'failed', 'cancelled'
supabase/migrations/20251207_provider_metrics.sql-  p_order_value NUMERIC,       -- Total order value in dollars
supabase/migrations/20251207_provider_metrics.sql-  p_commission NUMERIC         -- Commission earned in dollars
supabase/migrations/20251207_provider_metrics.sql-)
supabase/migrations/20251207_provider_metrics.sql-RETURNS VOID
supabase/migrations/20251207_provider_metrics.sql-LANGUAGE plpgsql
supabase/migrations/20251207_provider_metrics.sql-SECURITY DEFINER
supabase/migrations/20251207_provider_metrics.sql-AS $$
supabase/migrations/20251207_provider_metrics.sql-BEGIN
supabase/migrations/20251207_provider_metrics.sql-  -- Upsert provider metrics with atomic updates
supabase/migrations/20251207_provider_metrics.sql-  INSERT INTO analytics.provider_metrics (
supabase/migrations/20251207_provider_metrics.sql-    provider_id,
supabase/migrations/20251207_provider_metrics.sql-    provider_name,
supabase/migrations/20251207_provider_metrics.sql-    total_orders,
supabase/migrations/20251207_provider_metrics.sql-    successful_orders,
--
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Service role can insert analytics" ON public.analytics_events
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR INSERT TO service_role WITH CHECK (true);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Users can view own analytics" ON public.analytics_events
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql--- 4. User Plans Table (Simple billing foundation)
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-CREATE TABLE IF NOT EXISTS public.user_plans (
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    plan_id TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    status TEXT NOT NULL DEFAULT 'active',
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    current_period_start TIMESTAMPTZ DEFAULT now(),
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    current_period_end TIMESTAMPTZ,
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    created_at TIMESTAMPTZ DEFAULT now(),
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    updated_at TIMESTAMPTZ DEFAULT now()
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Users can view own plan" ON public.user_plans
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR SELECT TO authenticated USING (auth.uid() = user_id);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Service role manages plans" ON public.user_plans
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR ALL TO service_role USING (true) WITH CHECK (true);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql--- 5. Usage Quotas Table (Daily counters)
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-CREATE TABLE IF NOT EXISTS public.usage_quotas (
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    user_id UUID NOT NULL REFERENCES auth.users(id),
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    date DATE NOT NULL DEFAULT CURRENT_DATE,
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    request_count INTEGER DEFAULT 0,
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    token_count INTEGER DEFAULT 0,
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    provider_calls INTEGER DEFAULT 0,
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    updated_at TIMESTAMPTZ DEFAULT now(),
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    PRIMARY KEY (user_id, date)
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Users can view own usage" ON public.usage_quotas
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR SELECT TO authenticated USING (auth.uid() = user_id);
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql:CREATE POLICY "Service role manages usage" ON public.usage_quotas
supabase/migrations/20251214120000_phase_xi_tenancy_analytics.sql-    FOR ALL TO service_role USING (true) WITH CHECK (true);
--
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:ALTER TABLE public.gmv_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:ALTER TABLE public.provider_outcomes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:ALTER TABLE public.loopgpt_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql-
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql--- Service Role has full access
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:CREATE POLICY "Service role manages commerce" ON public.gmv_events FOR ALL TO service_role USING (true) WITH CHECK (true);
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:CREATE POLICY "Service role manages outcomes" ON public.provider_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:CREATE POLICY "Service role manages flywheel" ON public.loopgpt_events FOR ALL TO service_role USING (true) WITH CHECK (true);
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql-
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql--- Users can read their own GMV/Flywheel events (for transparency/history)
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:CREATE POLICY "Users view own GMV" ON public.gmv_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
supabase/migrations/20251214130000_phase_xi_loopgpt_commerce.sql:CREATE POLICY "Users view own flywheel" ON public.loopgpt_events FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
--
supabase/migrations/20251214_commerce_cart_sessions.sql:ALTER TABLE commerce.cart_sessions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214_commerce_cart_sessions.sql-
supabase/migrations/20251214_commerce_cart_sessions.sql--- Allow service role full access
supabase/migrations/20251214_commerce_cart_sessions.sql:CREATE POLICY "Service role full access" ON commerce.cart_sessions
supabase/migrations/20251214_commerce_cart_sessions.sql-    FOR ALL
supabase/migrations/20251214_commerce_cart_sessions.sql-    TO service_role
supabase/migrations/20251214_commerce_cart_sessions.sql-    USING (true)
supabase/migrations/20251214_commerce_cart_sessions.sql-    WITH CHECK (true);
supabase/migrations/20251214_commerce_cart_sessions.sql-
supabase/migrations/20251214_commerce_cart_sessions.sql--- Allow users to read/write their own sessions
supabase/migrations/20251214_commerce_cart_sessions.sql:CREATE POLICY "Users can access own sessions" ON commerce.cart_sessions
supabase/migrations/20251214_commerce_cart_sessions.sql-    FOR ALL
supabase/migrations/20251214_commerce_cart_sessions.sql-    TO authenticated
supabase/migrations/20251214_commerce_cart_sessions.sql-    USING (auth.uid()::text = user_id)
supabase/migrations/20251214_commerce_cart_sessions.sql-    WITH CHECK (auth.uid()::text = user_id);
--
supabase/migrations/20251214_order_receipts.sql:ALTER TABLE public.order_receipts ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214_order_receipts.sql-
supabase/migrations/20251214_order_receipts.sql--- Allow service role full access
supabase/migrations/20251214_order_receipts.sql:CREATE POLICY "Service role full access" ON public.order_receipts
supabase/migrations/20251214_order_receipts.sql-    FOR ALL
supabase/migrations/20251214_order_receipts.sql-    TO service_role
supabase/migrations/20251214_order_receipts.sql-    USING (true)
supabase/migrations/20251214_order_receipts.sql-    WITH CHECK (true);
supabase/migrations/20251214_order_receipts.sql-
supabase/migrations/20251214_order_receipts.sql--- Allow users to read their own receipts (if user_id is present)
supabase/migrations/20251214_order_receipts.sql:CREATE POLICY "Users can read own receipts" ON public.order_receipts
supabase/migrations/20251214_order_receipts.sql-    FOR SELECT
supabase/migrations/20251214_order_receipts.sql-    TO authenticated
supabase/migrations/20251214_order_receipts.sql-    USING (auth.uid()::text = user_id);
--
supabase/migrations/20251214_share_snapshots.sql:ALTER TABLE public.share_snapshots ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql--- Policy: Anyone can view share snapshots (public sharing)
supabase/migrations/20251214_share_snapshots.sql:CREATE POLICY "Share snapshots are publicly viewable"
supabase/migrations/20251214_share_snapshots.sql-  ON public.share_snapshots
supabase/migrations/20251214_share_snapshots.sql-  FOR SELECT
supabase/migrations/20251214_share_snapshots.sql-  USING (true);
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql--- Policy: Only service role can insert (via MCP tools)
supabase/migrations/20251214_share_snapshots.sql:CREATE POLICY "Only service role can create share snapshots"
supabase/migrations/20251214_share_snapshots.sql-  ON public.share_snapshots
supabase/migrations/20251214_share_snapshots.sql-  FOR INSERT
supabase/migrations/20251214_share_snapshots.sql-  WITH CHECK (false); -- Service role bypasses RLS
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql--- Policy: Only service role can update (for view counts)
supabase/migrations/20251214_share_snapshots.sql:CREATE POLICY "Only service role can update share snapshots"
supabase/migrations/20251214_share_snapshots.sql-  ON public.share_snapshots
supabase/migrations/20251214_share_snapshots.sql-  FOR UPDATE
supabase/migrations/20251214_share_snapshots.sql-  USING (false); -- Service role bypasses RLS
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql--- ============================================================================
supabase/migrations/20251214_share_snapshots.sql--- Helper Functions
supabase/migrations/20251214_share_snapshots.sql--- ============================================================================
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql-/**
supabase/migrations/20251214_share_snapshots.sql- * Increment view count for a share snapshot
supabase/migrations/20251214_share_snapshots.sql- */
supabase/migrations/20251214_share_snapshots.sql-CREATE OR REPLACE FUNCTION public.increment_share_view_count(p_share_id TEXT)
supabase/migrations/20251214_share_snapshots.sql-RETURNS void
supabase/migrations/20251214_share_snapshots.sql-LANGUAGE plpgsql
supabase/migrations/20251214_share_snapshots.sql-SECURITY DEFINER
supabase/migrations/20251214_share_snapshots.sql-AS $$
supabase/migrations/20251214_share_snapshots.sql-BEGIN
supabase/migrations/20251214_share_snapshots.sql-  UPDATE public.share_snapshots
supabase/migrations/20251214_share_snapshots.sql-  SET 
supabase/migrations/20251214_share_snapshots.sql-    view_count = view_count + 1,
supabase/migrations/20251214_share_snapshots.sql-    last_viewed_at = NOW()
supabase/migrations/20251214_share_snapshots.sql-  WHERE share_id = p_share_id;
supabase/migrations/20251214_share_snapshots.sql-END;
supabase/migrations/20251214_share_snapshots.sql-$$;
supabase/migrations/20251214_share_snapshots.sql-
supabase/migrations/20251214_share_snapshots.sql-/**
supabase/migrations/20251214_share_snapshots.sql- * Cleanup expired share snapshots
supabase/migrations/20251214_share_snapshots.sql- * 
supabase/migrations/20251214_share_snapshots.sql- * Call this periodically (e.g., daily cron job) to remove old snapshots.
supabase/migrations/20251214_share_snapshots.sql- */
--
supabase/migrations/20251214_step5_security_hardening.sql:ALTER TABLE analytics.rate_limit_counters ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214_step5_security_hardening.sql:ALTER TABLE analytics.security_audit_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- RLS Policy: Service role can manage rate limit counters
supabase/migrations/20251214_step5_security_hardening.sql:CREATE POLICY "Service role can manage rate limit counters"
supabase/migrations/20251214_step5_security_hardening.sql-  ON analytics.rate_limit_counters
supabase/migrations/20251214_step5_security_hardening.sql-  FOR ALL
supabase/migrations/20251214_step5_security_hardening.sql-  USING (true)
supabase/migrations/20251214_step5_security_hardening.sql-  WITH CHECK (true);
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- RLS Policy: Service role can manage security audit events
supabase/migrations/20251214_step5_security_hardening.sql:CREATE POLICY "Service role can manage security audit events"
supabase/migrations/20251214_step5_security_hardening.sql-  ON analytics.security_audit_events
supabase/migrations/20251214_step5_security_hardening.sql-  FOR ALL
supabase/migrations/20251214_step5_security_hardening.sql-  USING (true)
supabase/migrations/20251214_step5_security_hardening.sql-  WITH CHECK (true);
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- RLS Policy: Users can view their own audit events (read-only)
supabase/migrations/20251214_step5_security_hardening.sql:CREATE POLICY "Users can view own security audit events"
supabase/migrations/20251214_step5_security_hardening.sql-  ON analytics.security_audit_events
supabase/migrations/20251214_step5_security_hardening.sql-  FOR SELECT
supabase/migrations/20251214_step5_security_hardening.sql-  USING (auth.uid()::TEXT = user_id);
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- ============================================================================
supabase/migrations/20251214_step5_security_hardening.sql--- 5. Grants
supabase/migrations/20251214_step5_security_hardening.sql--- ============================================================================
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- Grant execute permission on cleanup functions to service role
supabase/migrations/20251214_step5_security_hardening.sql-GRANT EXECUTE ON FUNCTION analytics.cleanup_old_rate_limit_counters TO service_role;
supabase/migrations/20251214_step5_security_hardening.sql-GRANT EXECUTE ON FUNCTION analytics.cleanup_old_security_audit_events TO service_role;
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- Grant table access to service role (for Edge Functions)
supabase/migrations/20251214_step5_security_hardening.sql-GRANT ALL ON analytics.rate_limit_counters TO service_role;
supabase/migrations/20251214_step5_security_hardening.sql-GRANT ALL ON analytics.security_audit_events TO service_role;
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- Grant read access to authenticated users for their own audit events
supabase/migrations/20251214_step5_security_hardening.sql-GRANT SELECT ON analytics.security_audit_events TO authenticated;
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- ============================================================================
supabase/migrations/20251214_step5_security_hardening.sql--- 6. Initial Data / Validation
supabase/migrations/20251214_step5_security_hardening.sql--- ============================================================================
supabase/migrations/20251214_step5_security_hardening.sql-
supabase/migrations/20251214_step5_security_hardening.sql--- Verify tables were created
supabase/migrations/20251214_step5_security_hardening.sql-DO $$
supabase/migrations/20251214_step5_security_hardening.sql-BEGIN
supabase/migrations/20251214_step5_security_hardening.sql-  IF NOT EXISTS (
supabase/migrations/20251214_step5_security_hardening.sql-    SELECT 1 FROM information_schema.tables 
supabase/migrations/20251214_step5_security_hardening.sql-    WHERE table_schema = 'analytics' 
supabase/migrations/20251214_step5_security_hardening.sql-    AND table_name = 'rate_limit_counters'
