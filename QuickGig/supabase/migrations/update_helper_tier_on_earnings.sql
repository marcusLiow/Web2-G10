
DECLARE
  last_30_days_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  thirty_days_ago TIMESTAMPTZ;
BEGIN
  -- Only process if status is 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Calculate 30 days ago from now
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  -- Calculate total net_amount for the last 30 days for this user
  SELECT COALESCE(SUM(net_amount), 0)
  INTO last_30_days_earnings
  FROM "Earnings"
  WHERE user_id = NEW.user_id
    AND created_at >= thirty_days_ago
    AND created_at IS NOT NULL
    AND status = 'completed';
  
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
