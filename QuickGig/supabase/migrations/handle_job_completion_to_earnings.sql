CREATE OR REPLACE FUNCTION handle_job_completion_to_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  helper_record RECORD;
  payment_amount NUMERIC;
  helper_count INT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- ✅ METHOD 1: Try to find helpers via helper_jobs table
    SELECT COUNT(DISTINCT helper_id)
    INTO helper_count
    FROM public.helper_jobs
    WHERE job_id = NEW.id;

    IF helper_count > 0 THEN
      -- Calculate payment amount per helper
      IF NEW.payment_type = 'total' THEN
        payment_amount := NEW.payment / helper_count;
      ELSE
        payment_amount := NEW.payment;
      END IF;

      -- Update earnings for helpers found in helper_jobs
      FOR helper_record IN 
        SELECT DISTINCT helper_id
        FROM public.helper_jobs
        WHERE job_id = NEW.id
      LOOP
        UPDATE public."Earnings"
        SET status = 'completed'
        WHERE user_id = helper_record.helper_id 
          AND job_id = NEW.id
          AND status = 'paid';
        
        RAISE NOTICE 'Updated earnings via helper_jobs for user % on job %', helper_record.helper_id, NEW.id;
      END LOOP;
    END IF;

    -- ✅ METHOD 2: Also update ANY earnings with this job_id that weren't found via helper_jobs
    -- This handles cases where earnings exist but helper_jobs doesn't have the record
    UPDATE public."Earnings"
    SET status = 'completed'
    WHERE job_id = NEW.id
      AND status = 'paid'
      AND NOT EXISTS (
        -- Don't update if already updated via helper_jobs above
        SELECT 1 FROM public.helper_jobs 
        WHERE helper_jobs.job_id = NEW.id 
        AND helper_jobs.helper_id = "Earnings".user_id
      );
    
    RAISE NOTICE 'Updated earnings without helper_jobs for job %', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$;