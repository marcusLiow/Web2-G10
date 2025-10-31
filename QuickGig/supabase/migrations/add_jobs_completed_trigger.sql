-- Migration: Add jobs_completed to helper_profiles with automatic updates
-- This tracks the number of completed jobs for each helper from the Earnings table

-- Step 1: Add the jobs_completed column to helper_profiles
ALTER TABLE helper_profiles 
ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0;

-- Step 2: Create a function to update jobs_completed count
CREATE OR REPLACE FUNCTION update_helper_jobs_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the jobs_completed count for the helper
  UPDATE helper_profiles
  SET 
    jobs_completed = (
      SELECT COUNT(*)
      FROM "Earnings"
      WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on Earnings table for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_update_helper_jobs_completed ON "Earnings";
CREATE TRIGGER trigger_update_helper_jobs_completed
AFTER INSERT OR UPDATE ON "Earnings"
FOR EACH ROW
EXECUTE FUNCTION update_helper_jobs_completed();

-- Step 4: Retroactively populate jobs_completed for all existing helpers
DO $$
DECLARE
  helper_record RECORD;
  job_count INTEGER;
BEGIN
  FOR helper_record IN SELECT user_id FROM helper_profiles LOOP
    -- Count earnings for this helper
    SELECT COUNT(*)
    INTO job_count
    FROM "Earnings"
    WHERE user_id = helper_record.user_id;
    
    -- Update the helper's jobs_completed
    UPDATE helper_profiles
    SET jobs_completed = job_count
    WHERE user_id = helper_record.user_id;
    
    RAISE NOTICE 'Updated helper % with % completed jobs', helper_record.user_id, job_count;
  END LOOP;
  
  RAISE NOTICE 'Retroactive population complete!';
END $$;

-- Step 5: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_id 
ON "Earnings"(user_id);

-- Done! 
-- The jobs_completed column is now automatically updated whenever:
-- 1. A new earning is inserted
-- 2. An existing earning is updated
-- All existing helpers have been populated with their current job counts
