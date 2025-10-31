-- QUICK SETUP: Run this entire script in Supabase SQL Editor
-- This will set up the automatic tier system (Rolling 30-Day Window)

-- 1. Add columns
ALTER TABLE helper_profiles 
ADD COLUMN IF NOT EXISTS helper_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS helper_tier TEXT DEFAULT 'Emerald';

-- 2. Create tier calculation function
CREATE OR REPLACE FUNCTION calculate_helper_tier(xp INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF xp >= 1800 THEN RETURN 'Diamond';
  ELSIF xp >= 1200 THEN RETURN 'Sapphire';
  ELSIF xp >= 600 THEN RETURN 'Ruby';
  ELSE RETURN 'Emerald';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create trigger function (calculates last 30 days)
CREATE OR REPLACE FUNCTION update_helper_tier_on_earnings()
RETURNS TRIGGER AS $$
DECLARE
  last_30_days_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  SELECT COALESCE(SUM(net_amount), 0)
  INTO last_30_days_earnings
  FROM "Earnings"
  WHERE user_id = NEW.user_id
    AND created_at >= thirty_days_ago;
  
  new_xp := FLOOR(last_30_days_earnings);
  new_tier := calculate_helper_tier(new_xp);
  
  UPDATE helper_profiles
  SET helper_xp = new_xp, helper_tier = new_tier, updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_update_helper_tier ON "Earnings";
CREATE TRIGGER trigger_update_helper_tier
AFTER INSERT OR UPDATE ON "Earnings"
FOR EACH ROW
EXECUTE FUNCTION update_helper_tier_on_earnings();

-- 5. Create daily recalculation function (for rolling 30-day window)
CREATE OR REPLACE FUNCTION recalculate_all_helper_xp()
RETURNS void AS $$
DECLARE
  helper_record RECORD;
  last_30_days_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  FOR helper_record IN SELECT user_id FROM helper_profiles LOOP
    SELECT COALESCE(SUM(net_amount), 0)
    INTO last_30_days_earnings
    FROM "Earnings"
    WHERE user_id = helper_record.user_id
      AND created_at >= thirty_days_ago;
    
    new_xp := FLOOR(last_30_days_earnings);
    new_tier := calculate_helper_tier(new_xp);
    
    UPDATE helper_profiles
    SET helper_xp = new_xp, helper_tier = new_tier, updated_at = NOW()
    WHERE user_id = helper_record.user_id;
  END LOOP;
  
  RAISE NOTICE 'Recalculated XP for all helpers based on last 30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Initialize existing helpers with last 30 days
DO $$
DECLARE
  helper_record RECORD;
  last_30_days_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  FOR helper_record IN SELECT user_id FROM helper_profiles LOOP
    SELECT COALESCE(SUM(net_amount), 0)
    INTO last_30_days_earnings
    FROM "Earnings"
    WHERE user_id = helper_record.user_id
      AND created_at >= thirty_days_ago;
    
    new_xp := FLOOR(last_30_days_earnings);
    new_tier := calculate_helper_tier(new_xp);
    
    UPDATE helper_profiles
    SET helper_xp = new_xp, helper_tier = new_tier
    WHERE user_id = helper_record.user_id;
  END LOOP;
END $$;

-- 7. Add performance index
CREATE INDEX IF NOT EXISTS idx_earnings_user_created 
ON "Earnings"(user_id, created_at);

-- DONE! Now set up daily recalculation cron job (recommended):
-- Go to: Database → Cron Jobs → Create new cron job
-- Name: daily-xp-recalculation
-- Schedule: 0 0 * * * (midnight every day)
-- SQL: SELECT recalculate_all_helper_xp();
--
-- This ensures XP stays accurate as old earnings drop out of the 30-day window
