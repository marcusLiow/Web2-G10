
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
