-- Migration: Add helper_tier and helper_xp columns and create trigger for automatic updates

-- Step 1: Add new columns to helper_profiles table
ALTER TABLE helper_profiles 
ADD COLUMN IF NOT EXISTS helper_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS helper_tier TEXT DEFAULT 'Emerald';

-- Step 2: Create or replace the function to calculate tier based on XP
CREATE OR REPLACE FUNCTION calculate_helper_tier(xp INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF xp >= 1800 THEN
    RETURN 'Diamond';
  ELSIF xp >= 1200 THEN
    RETURN 'Sapphire';
  ELSIF xp >= 600 THEN
    RETURN 'Ruby';
  ELSE
    RETURN 'Emerald';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create function to update helper XP and tier when earnings are added
CREATE OR REPLACE FUNCTION update_helper_tier_on_earnings()
RETURNS TRIGGER AS $$
DECLARE
  last_30_days_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  -- Calculate 30 days ago from now
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  -- Calculate total net_amount for the last 30 days for this user
  SELECT COALESCE(SUM(net_amount), 0)
  INTO last_30_days_earnings
  FROM "Earnings"
  WHERE user_id = NEW.user_id
    AND created_at >= thirty_days_ago;
  
  -- Convert earnings to XP (1 dollar = 1 XP)
  new_xp := FLOOR(last_30_days_earnings);
  
  -- Calculate tier based on XP
  new_tier := calculate_helper_tier(new_xp);
  
  -- Update helper_profiles table
  UPDATE helper_profiles
  SET 
    helper_xp = new_xp,
    helper_tier = new_tier,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on Earnings table
DROP TRIGGER IF EXISTS trigger_update_helper_tier ON "Earnings";

CREATE TRIGGER trigger_update_helper_tier
AFTER INSERT OR UPDATE ON "Earnings"
FOR EACH ROW
EXECUTE FUNCTION update_helper_tier_on_earnings();

-- Step 5: Create a function to recalculate all helpers' XP (rolling 30-day window)
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
    -- Calculate last 30 days earnings
    SELECT COALESCE(SUM(net_amount), 0)
    INTO last_30_days_earnings
    FROM "Earnings"
    WHERE user_id = helper_record.user_id
      AND created_at >= thirty_days_ago;
    
    new_xp := FLOOR(last_30_days_earnings);
    new_tier := calculate_helper_tier(new_xp);
    
    -- Update the helper profile
    UPDATE helper_profiles
    SET 
      helper_xp = new_xp,
      helper_tier = new_tier,
      updated_at = NOW()
    WHERE user_id = helper_record.user_id;
  END LOOP;
  
  RAISE NOTICE 'Recalculated XP for all helper profiles based on last 30 days';
END;
$$ LANGUAGE plpgsql;

-- Step 6: Initialize existing helper profiles with last 30 days XP
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
    -- Calculate last 30 days earnings
    SELECT COALESCE(SUM(net_amount), 0)
    INTO last_30_days_earnings
    FROM "Earnings"
    WHERE user_id = helper_record.user_id
      AND created_at >= thirty_days_ago;
    
    new_xp := FLOOR(last_30_days_earnings);
    new_tier := calculate_helper_tier(new_xp);
    
    -- Update the helper profile
    UPDATE helper_profiles
    SET 
      helper_xp = new_xp,
      helper_tier = new_tier
    WHERE user_id = helper_record.user_id;
  END LOOP;
  
  RAISE NOTICE 'Initialized XP for all existing helper profiles based on last 30 days';
END $$;

-- Step 7: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_created 
ON "Earnings"(user_id, created_at);

COMMENT ON COLUMN helper_profiles.helper_xp IS 'Rolling 30-day XP based on net earnings from last 30 days';
COMMENT ON COLUMN helper_profiles.helper_tier IS 'Current tier: Emerald (0-599), Ruby (600-1199), Sapphire (1200-1799), Diamond (1800+)';
COMMENT ON FUNCTION update_helper_tier_on_earnings() IS 'Automatically updates helper XP and tier based on last 30 days earnings';
COMMENT ON FUNCTION recalculate_all_helper_xp() IS 'Recalculates all helper XP based on rolling 30-day window (call daily via cron job)';

