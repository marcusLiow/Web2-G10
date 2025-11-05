
DECLARE
  helper_record RECORD;
  payment_amount NUMERIC;
  helper_count INT;
BEGIN
  -- Check if the job is being marked as 'completed' for the first time
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Count how many unique helpers were accepted for this job
    SELECT COUNT(DISTINCT job_seeker_id)
    INTO helper_count
    FROM public.chats
    WHERE job_id = NEW.id AND offer_accepted = true;

    -- If no helpers, set count to 1 to avoid division by zero
    IF helper_count = 0 THEN
      helper_count := 1;
    END IF;

    -- Determine the payment amount per helper
    IF NEW.payment_type = 'total' THEN
      -- Divide total payment by the number of helpers
      payment_amount := NEW.payment / helper_count;
    ELSE
      -- Default to 'per_person'
      payment_amount := NEW.payment;
    END IF;

    -- Find all accepted helpers for this job from the 'chats' table
    FOR helper_record IN 
      SELECT DISTINCT job_seeker_id
      FROM public.chats
      WHERE job_id = NEW.id AND offer_accepted = true
    LOOP
      -- Insert an earnings record for EACH accepted helper
      INSERT INTO public."Earnings" (user_id, job_id, net_amount, job_title, status, created_at)
      VALUES (
        helper_record.job_seeker_id, -- The helper's ID
        NEW.id,                      -- The job's ID
        payment_amount,              -- The calculated amount for this helper
        NEW.title,                   -- The job's title
        'completed',                 -- The status of the earning
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
