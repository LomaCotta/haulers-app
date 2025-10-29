-- Test Rating Display Logic
-- This tests how businesses with different review counts will be displayed

-- Step 1: Check current businesses and their review counts
SELECT 'Businesses with Review Counts:' as info;
SELECT 
  id,
  name,
  rating_avg,
  rating_count,
  verified,
  CASE 
    WHEN rating_count > 0 THEN 'Will show rating and review count'
    ELSE 'Will show "New to Haulers"'
  END as display_logic
FROM public.businesses 
WHERE verified = true
ORDER BY rating_count DESC, created_at DESC;

-- Step 2: Check if there are any businesses with reviews
SELECT 'Businesses with Reviews:' as info;
SELECT 
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN rating_count > 0 THEN 1 END) as businesses_with_reviews,
  COUNT(CASE WHEN rating_count = 0 THEN 1 END) as businesses_without_reviews,
  AVG(rating_avg) as average_rating,
  MAX(rating_count) as max_reviews
FROM public.businesses 
WHERE verified = true;

-- Step 3: Show specific examples
SELECT 'Example Display Logic:' as info;
SELECT 
  name,
  rating_avg,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('★ ', ROUND(rating_avg, 1), ' (', rating_count, ' reviews)')
    ELSE '★ New to Haulers'
  END as display_text
FROM public.businesses 
WHERE verified = true
ORDER BY rating_count DESC, created_at DESC
LIMIT 5;

-- Step 4: Update Shleppers Moving to have some reviews for testing
-- (This is just for testing - in real scenario, reviews would come from actual customers)
UPDATE public.businesses 
SET 
  rating_avg = 4.5,
  rating_count = 12
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 5: Show the updated display
SELECT 'Updated Shleppers Moving Display:' as info;
SELECT 
  name,
  rating_avg,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('★ ', ROUND(rating_avg, 1), ' (', rating_count, ' reviews)')
    ELSE '★ New to Haulers'
  END as display_text
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 6: Reset Shleppers Moving to no reviews (for testing the "New to Haulers" display)
UPDATE public.businesses 
SET 
  rating_avg = 0,
  rating_count = 0
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 7: Show final display
SELECT 'Final Shleppers Moving Display:' as info;
SELECT 
  name,
  rating_avg,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('★ ', ROUND(rating_avg, 1), ' (', rating_count, ' reviews)')
    ELSE '★ New to Haulers'
  END as display_text
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';
