-- ============================================================================
-- LoopKitchen Recommendation Engine - Phase 3
-- Created: 2025-12-06
-- Purpose: Personalized recipe recommendations based on user behavior and goals
-- ============================================================================

-- ============================================================================
-- Helper Function 1: Get User's Ingredient Profile
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_ingredient_profile(p_user_id UUID)
RETURNS TABLE (
  ingredient_name TEXT,
  frequency INT,
  last_used TIMESTAMPTZ,
  recency_days INT
) AS $$
BEGIN
  RETURN QUERY
  WITH ingredient_extracts AS (
    SELECT 
      LOWER(TRIM(ingredient->>'name')) as ing_name,
      created_at
    FROM analytics.ingredient_submissions,
         LATERAL jsonb_array_elements(ingredients) as ingredient
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '90 days'
      AND ingredient->>'name' IS NOT NULL
  )
  SELECT 
    ing_name::TEXT,
    COUNT(*)::INT as frequency,
    MAX(created_at)::TIMESTAMPTZ as last_used,
    EXTRACT(DAY FROM NOW() - MAX(created_at))::INT as recency_days
  FROM ingredient_extracts
  GROUP BY ing_name
  ORDER BY frequency DESC, last_used DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_ingredient_profile IS 'Returns user ingredient usage patterns from last 90 days';

-- ============================================================================
-- Helper Function 2: Get User's Recipe Preferences
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_recipe_preferences(p_user_id UUID)
RETURNS TABLE (
  total_interactions INT,
  acceptance_rate NUMERIC,
  avg_chaos_rating NUMERIC,
  preferred_persona TEXT,
  accepted_count INT,
  rejected_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_interactions,
    ROUND(
      COUNT(*) FILTER (WHERE event_type = 'accepted')::NUMERIC * 100.0 / 
      NULLIF(COUNT(*) FILTER (WHERE event_type IN ('accepted', 'rejected')), 0),
      2
    ) as acceptance_rate,
    ROUND(AVG(chaos_rating_shown), 1) as avg_chaos_rating,
    MODE() WITHIN GROUP (ORDER BY persona_used) as preferred_persona,
    COUNT(*) FILTER (WHERE event_type = 'accepted')::INT as accepted_count,
    COUNT(*) FILTER (WHERE event_type = 'rejected')::INT as rejected_count
  FROM analytics.recipe_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND event_type IN ('accepted', 'rejected');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_recipe_preferences IS 'Returns learned user preferences from recipe interactions';

-- ============================================================================
-- Helper Function 3: Check if Recipe Matches Dietary Restrictions
-- ============================================================================
CREATE OR REPLACE FUNCTION check_dietary_compliance(
  p_recipe_ingredients TEXT[],
  p_dietary_restrictions TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
  restriction TEXT;
  ingredient TEXT;
BEGIN
  -- If no restrictions, all recipes are compliant
  IF p_dietary_restrictions IS NULL OR array_length(p_dietary_restrictions, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check each restriction
  FOREACH restriction IN ARRAY p_dietary_restrictions
  LOOP
    -- Simple keyword matching (can be enhanced with lookup tables)
    CASE restriction
      WHEN 'vegetarian' THEN
        FOREACH ingredient IN ARRAY p_recipe_ingredients
        LOOP
          IF ingredient ILIKE ANY(ARRAY['%beef%', '%pork%', '%chicken%', '%fish%', '%meat%', '%bacon%', '%sausage%']) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
      
      WHEN 'vegan' THEN
        FOREACH ingredient IN ARRAY p_recipe_ingredients
        LOOP
          IF ingredient ILIKE ANY(ARRAY['%beef%', '%pork%', '%chicken%', '%fish%', '%meat%', '%bacon%', '%sausage%', '%milk%', '%cheese%', '%egg%', '%butter%', '%cream%', '%yogurt%']) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
      
      WHEN 'gluten_free' THEN
        FOREACH ingredient IN ARRAY p_recipe_ingredients
        LOOP
          IF ingredient ILIKE ANY(ARRAY['%wheat%', '%flour%', '%bread%', '%pasta%', '%barley%', '%rye%']) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
      
      WHEN 'dairy_free' THEN
        FOREACH ingredient IN ARRAY p_recipe_ingredients
        LOOP
          IF ingredient ILIKE ANY(ARRAY['%milk%', '%cheese%', '%butter%', '%cream%', '%yogurt%']) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
      
      WHEN 'nut_free' THEN
        FOREACH ingredient IN ARRAY p_recipe_ingredients
        LOOP
          IF ingredient ILIKE ANY(ARRAY['%almond%', '%peanut%', '%walnut%', '%cashew%', '%pecan%', '%hazelnut%']) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
      
      ELSE
        -- Unknown restriction, skip
        CONTINUE;
    END CASE;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION check_dietary_compliance IS 'Checks if recipe ingredients comply with dietary restrictions';

-- ============================================================================
-- Main Recommendation Function
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recipe_recommendations(
  p_user_id UUID,
  p_candidate_recipes JSONB, -- Array of {recipe_id, title, ingredients[], calories, protein_g, carbs_g, fat_g}
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  recipe_id TEXT,
  recipe_title TEXT,
  total_score NUMERIC,
  ingredient_match_score NUMERIC,
  goal_alignment_score NUMERIC,
  behavioral_score NUMERIC,
  diversity_score NUMERIC,
  match_reason TEXT,
  confidence TEXT
) AS $$
DECLARE
  user_ingredients RECORD;
  user_prefs RECORD;
  user_goal RECORD;
  recipe JSONB;
  
  -- Scoring variables
  v_ingredient_score NUMERIC;
  v_goal_score NUMERIC;
  v_behavioral_score NUMERIC;
  v_diversity_score NUMERIC;
  v_total_score NUMERIC;
  v_match_reason TEXT;
  v_confidence TEXT;
  
  -- Calculation variables
  v_matching_ingredients INT;
  v_total_recipe_ingredients INT;
  v_ingredient_match_pct NUMERIC;
  v_calorie_diff_pct NUMERIC;
  v_days_since_similar INT;
  v_was_rejected BOOLEAN;
BEGIN
  -- Get user's ingredient profile
  SELECT 
    array_agg(ingredient_name) as ingredients,
    array_agg(frequency) as frequencies
  INTO user_ingredients
  FROM get_user_ingredient_profile(p_user_id);
  
  -- Get user preferences
  SELECT * INTO user_prefs
  FROM get_user_recipe_preferences(p_user_id);
  
  -- Get user's active goal
  SELECT * INTO user_goal
  FROM analytics.user_goals
  WHERE user_id = p_user_id
    AND is_active = TRUE
  LIMIT 1;
  
  -- Process each candidate recipe
  FOR recipe IN SELECT * FROM jsonb_array_elements(p_candidate_recipes)
  LOOP
    -- Reset scores
    v_ingredient_score := 0;
    v_goal_score := 0;
    v_behavioral_score := 0;
    v_diversity_score := 0;
    v_match_reason := '';
    
    -- ========================================================================
    -- 1. INGREDIENT MATCH SCORE (0-40 points)
    -- ========================================================================
    v_total_recipe_ingredients := jsonb_array_length(recipe->'ingredients');
    
    IF v_total_recipe_ingredients > 0 AND user_ingredients.ingredients IS NOT NULL THEN
      -- Count matching ingredients
      SELECT COUNT(*)
      INTO v_matching_ingredients
      FROM jsonb_array_elements_text(recipe->'ingredients') AS recipe_ing
      WHERE LOWER(recipe_ing) = ANY(user_ingredients.ingredients);
      
      v_ingredient_match_pct := v_matching_ingredients::NUMERIC / v_total_recipe_ingredients;
      v_ingredient_score := v_ingredient_match_pct * 40;
      
      IF v_ingredient_match_pct >= 0.7 THEN
        v_match_reason := v_match_reason || 'High ingredient match (' || v_matching_ingredients || '/' || v_total_recipe_ingredients || '). ';
      END IF;
    END IF;
    
    -- ========================================================================
    -- 2. GOAL ALIGNMENT SCORE (0-25 points)
    -- ========================================================================
    IF user_goal IS NOT NULL AND user_goal.calorie_target IS NOT NULL THEN
      -- Check dietary restrictions first
      IF NOT check_dietary_compliance(
        ARRAY(SELECT jsonb_array_elements_text(recipe->'ingredients')),
        user_goal.dietary_restrictions
      ) THEN
        -- Recipe violates restrictions, skip it
        CONTINUE;
      END IF;
      
      -- Calculate calorie alignment
      v_calorie_diff_pct := ABS((recipe->>'calories')::NUMERIC - user_goal.calorie_target) / user_goal.calorie_target;
      
      IF v_calorie_diff_pct <= 0.1 THEN
        v_goal_score := 25; -- Within 10%
        v_match_reason := v_match_reason || 'Perfect calorie match. ';
      ELSIF v_calorie_diff_pct <= 0.2 THEN
        v_goal_score := 20; -- Within 20%
      ELSIF v_calorie_diff_pct <= 0.3 THEN
        v_goal_score := 15; -- Within 30%
      ELSE
        v_goal_score := 10; -- Beyond 30%
      END IF;
    ELSE
      -- No goal set, give neutral score
      v_goal_score := 15;
    END IF;
    
    -- ========================================================================
    -- 3. BEHAVIORAL SCORE (0-20 points)
    -- ========================================================================
    IF user_prefs.total_interactions > 0 THEN
      -- Check if this recipe was previously rejected
      SELECT EXISTS(
        SELECT 1 FROM analytics.recipe_events
        WHERE user_id = p_user_id
          AND recipe_id = recipe->>'recipe_id'
          AND event_type = 'rejected'
          AND created_at >= NOW() - INTERVAL '30 days'
      ) INTO v_was_rejected;
      
      IF v_was_rejected THEN
        v_behavioral_score := -15; -- Penalty for previously rejected
        v_match_reason := v_match_reason || 'Previously rejected. ';
      ELSE
        -- Base behavioral score from acceptance rate
        v_behavioral_score := COALESCE(user_prefs.acceptance_rate / 5, 10);
        
        -- Check if recipe was previously accepted
        IF EXISTS(
          SELECT 1 FROM analytics.recipe_events
          WHERE user_id = p_user_id
            AND recipe_id = recipe->>'recipe_id'
            AND event_type = 'accepted'
        ) THEN
          v_behavioral_score := v_behavioral_score + 5;
          v_match_reason := v_match_reason || 'Previously enjoyed. ';
        END IF;
      END IF;
    ELSE
      -- New user, neutral score
      v_behavioral_score := 10;
    END IF;
    
    -- ========================================================================
    -- 4. DIVERSITY SCORE (0-15 points)
    -- ========================================================================
    -- Check when user last had a similar recipe
    SELECT EXTRACT(DAY FROM NOW() - MAX(created_at))::INT
    INTO v_days_since_similar
    FROM analytics.recipe_events
    WHERE user_id = p_user_id
      AND recipe_id = recipe->>'recipe_id';
    
    IF v_days_since_similar IS NULL THEN
      -- Never seen before
      v_diversity_score := 15;
      v_match_reason := v_match_reason || 'New recipe for you. ';
    ELSIF v_days_since_similar >= 14 THEN
      v_diversity_score := 12;
    ELSIF v_days_since_similar >= 7 THEN
      v_diversity_score := 8;
    ELSE
      v_diversity_score := 3; -- Recently seen
    END IF;
    
    -- ========================================================================
    -- CALCULATE TOTAL SCORE
    -- ========================================================================
    v_total_score := v_ingredient_score + v_goal_score + v_behavioral_score + v_diversity_score;
    
    -- Determine confidence level
    IF v_total_score >= 70 THEN
      v_confidence := 'high';
    ELSIF v_total_score >= 50 THEN
      v_confidence := 'medium';
    ELSE
      v_confidence := 'low';
    END IF;
    
    -- Return this recommendation
    RETURN QUERY SELECT
      (recipe->>'recipe_id')::TEXT,
      (recipe->>'title')::TEXT,
      ROUND(v_total_score, 2),
      ROUND(v_ingredient_score, 2),
      ROUND(v_goal_score, 2),
      ROUND(v_behavioral_score, 2),
      ROUND(v_diversity_score, 2),
      TRIM(v_match_reason),
      v_confidence;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_recipe_recommendations IS 'Main recommendation engine - scores and ranks recipes for a user';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test ingredient profile (will return empty for new users)
-- SELECT * FROM get_user_ingredient_profile('00000000-0000-0000-0000-000000000000');

-- Test recipe preferences (will return NULL for new users)
-- SELECT * FROM get_user_recipe_preferences('00000000-0000-0000-0000-000000000000');

-- Test dietary compliance
-- SELECT check_dietary_compliance(
--   ARRAY['chicken', 'rice', 'vegetables'],
--   ARRAY['vegetarian']
-- ); -- Should return FALSE

-- Test recommendation engine with sample recipes
-- SELECT * FROM get_recipe_recommendations(
--   '00000000-0000-0000-0000-000000000000',
--   '[
--     {"recipe_id": "test-1", "title": "Chicken Rice", "ingredients": ["chicken", "rice"], "calories": 500, "protein_g": 30, "carbs_g": 50, "fat_g": 15},
--     {"recipe_id": "test-2", "title": "Veggie Stir Fry", "ingredients": ["vegetables", "soy sauce"], "calories": 300, "protein_g": 10, "carbs_g": 40, "fat_g": 10}
--   ]'::jsonb,
--   10
-- );

SELECT 'Recommendation engine deployed successfully' as status;
