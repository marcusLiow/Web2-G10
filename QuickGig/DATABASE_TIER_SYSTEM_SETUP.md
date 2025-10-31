# Database Tier System Setup Guide

## Overview
This guide explains how to set up the automated tier system that updates `helper_tier` and `helper_xp` in the `helper_profiles` table whenever a new earning is added.

## Step-by-Step Setup

### 1. Add Columns to helper_profiles Table

First, add the new columns to store XP and tier:

```sql
ALTER TABLE helper_profiles 
ADD COLUMN IF NOT EXISTS helper_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS helper_tier TEXT DEFAULT 'Emerald';
```

### 2. Run the Migration Script

Execute the SQL migration file located at:
```
supabase/migrations/update_helper_tier_trigger.sql
```

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Click "New Query"
3. Copy and paste the entire contents of `update_helper_tier_trigger.sql`
4. Click "Run" or press Ctrl+Enter

### 3. How It Works

#### Automatic Trigger Flow:
```
User earns money → Earnings table INSERT/UPDATE 
                 ↓
         Trigger fires automatically
                 ↓
    Calculates current month's total earnings
                 ↓
         Converts $ to XP (1:1 ratio)
                 ↓
    Determines tier based on XP thresholds
                 ↓
    Updates helper_profiles table
```

#### Tier Thresholds:
- **Emerald**: 0 - 599 XP
- **Ruby**: 600 - 1,199 XP
- **Sapphire**: 1,200 - 1,799 XP
- **Diamond**: 1,800+ XP

### 4. Database Functions Created

#### `calculate_helper_tier(xp INTEGER)`
- Input: XP amount
- Output: Tier name (Emerald, Ruby, Sapphire, or Diamond)
- Usage: Determines which tier a user belongs to

#### `update_helper_tier_on_earnings()`
- Trigger function that runs automatically
- Calculates monthly earnings sum
- Converts to XP (floor of net_amount)
- Updates helper_profiles with new XP and tier

#### `reset_monthly_helper_xp()`
- Resets all helper XP to 0
- Sets all tiers back to Emerald
- Should be called at the start of each month

### 5. Monthly Reset Setup

**Option A: Using Supabase Cron Jobs (Recommended)**

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Schedule monthly reset on the 1st of each month at midnight
SELECT cron.schedule(
  'monthly-helper-xp-reset',
  '0 0 1 * *',  -- At 00:00 on day 1 of every month
  $$
  SELECT reset_monthly_helper_xp();
  $$
);
```

**Option B: Using pg_cron Extension**

First enable pg_cron:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly reset
SELECT cron.schedule(
  'monthly-xp-reset',
  '0 0 1 * *',
  'SELECT reset_monthly_helper_xp()'
);
```

**Option C: Manual Reset**

Run this SQL query manually on the 1st of each month:
```sql
SELECT reset_monthly_helper_xp();
```

### 6. Testing the Trigger

Test by inserting a sample earning:

```sql
-- Test with $500 earning
INSERT INTO "Earnings" (user_id, gross_amount, net_amount, status, created_at)
VALUES (
  'YOUR_HELPER_USER_ID',
  500,
  500,
  'completed',
  NOW()
);

-- Check the result
SELECT user_id, helper_xp, helper_tier 
FROM helper_profiles 
WHERE user_id = 'YOUR_HELPER_USER_ID';

-- Expected result: helper_xp = 500, helper_tier = 'Emerald'
```

Test tier progression:
```sql
-- Test with $700 earning (should reach Ruby)
INSERT INTO "Earnings" (user_id, gross_amount, net_amount, status, created_at)
VALUES (
  'YOUR_HELPER_USER_ID',
  200,
  200,
  'completed',
  NOW()
);

-- Check the result
SELECT user_id, helper_xp, helper_tier 
FROM helper_profiles 
WHERE user_id = 'YOUR_HELPER_USER_ID';

-- Expected result: helper_xp = 700, helper_tier = 'Ruby'
```

### 7. Performance Optimizations

The migration includes an index for better query performance:

```sql
CREATE INDEX IF NOT EXISTS idx_earnings_user_created 
ON "Earnings"(user_id, created_at);
```

This speeds up the monthly earnings calculation.

### 8. Frontend Integration

The ProfilePage.vue has been updated to:
- Read `helper_xp` and `helper_tier` directly from `helper_profiles` table
- Display the tier badge and progress bar
- No longer calculate XP on the frontend (single source of truth in database)

### 9. Troubleshooting

**Trigger not firing?**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_helper_tier';

-- Re-create the trigger
DROP TRIGGER IF EXISTS trigger_update_helper_tier ON "Earnings";
CREATE TRIGGER trigger_update_helper_tier
AFTER INSERT OR UPDATE ON "Earnings"
FOR EACH ROW
EXECUTE FUNCTION update_helper_tier_on_earnings();
```

**XP not calculating correctly?**
```sql
-- Manually recalculate for a specific user
DO $$
DECLARE
  monthly_earnings NUMERIC;
  new_xp INTEGER;
  new_tier TEXT;
  first_day_of_month TIMESTAMPTZ;
BEGIN
  first_day_of_month := DATE_TRUNC('month', NOW());
  
  SELECT COALESCE(SUM(net_amount), 0)
  INTO monthly_earnings
  FROM "Earnings"
  WHERE user_id = 'YOUR_USER_ID'
    AND created_at >= first_day_of_month;
  
  new_xp := FLOOR(monthly_earnings);
  new_tier := calculate_helper_tier(new_xp);
  
  UPDATE helper_profiles
  SET helper_xp = new_xp, helper_tier = new_tier
  WHERE user_id = 'YOUR_USER_ID';
END $$;
```

### 10. Monitoring

Check trigger execution logs:
```sql
-- View recent earnings updates
SELECT user_id, net_amount, created_at
FROM "Earnings"
ORDER BY created_at DESC
LIMIT 10;

-- View current helper tiers
SELECT user_id, helper_xp, helper_tier, updated_at
FROM helper_profiles
ORDER BY helper_xp DESC;
```

## Benefits of This Approach

✅ **Automatic**: XP updates instantly when earnings are added
✅ **Accurate**: Single source of truth in the database
✅ **Efficient**: No need to calculate on every page load
✅ **Scalable**: Database handles all calculations
✅ **Consistent**: All users see the same tier data
✅ **Real-time**: Updates immediately after payment

## Important Notes

- XP is based on `net_amount` (after platform fees)
- Only earnings in the current month count toward XP
- XP resets to 0 at the start of each month
- The trigger runs AFTER INSERT or UPDATE on the Earnings table
- Multiple earnings in the same month accumulate XP
- Tier cannot decrease within a month (only reset monthly)

## Schema Changes Summary

### helper_profiles Table
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| helper_xp | INTEGER | 0 | Current month's XP |
| helper_tier | TEXT | 'Emerald' | Current tier name |

### Functions Added
1. `calculate_helper_tier(xp INTEGER)` - Returns tier name
2. `update_helper_tier_on_earnings()` - Trigger function
3. `reset_monthly_helper_xp()` - Monthly reset function

### Triggers Added
- `trigger_update_helper_tier` on Earnings table
