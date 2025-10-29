-- Test Review Display Logic
-- This tests how the review section will be displayed for different businesses

-- Step 1: Check current businesses and their review counts
SELECT 'Businesses with Review Counts:' as info;
SELECT 
  id,
  name,
  rating_avg,
  rating_count,
  verified,
  CASE 
    WHEN rating_count > 0 THEN 'Will show "Reviews (X)" with actual reviews'
    ELSE 'Will show "Reviews" with "New to Haulers" message'
  END as review_section_display
FROM public.businesses 
WHERE verified = true
ORDER BY rating_count DESC, created_at DESC;

-- Step 2: Test the review section title logic
SELECT 'Review Section Title Logic:' as info;
SELECT 
  name,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('Reviews (', rating_count, ')')
    ELSE 'Reviews'
  END as section_title
FROM public.businesses 
WHERE verified = true
ORDER BY rating_count DESC, created_at DESC;

-- Step 3: Test the review content logic
SELECT 'Review Content Display Logic:' as info;
SELECT 
  name,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN 'Shows actual review list'
    ELSE 'Shows "New to Haulers" with call-to-action buttons'
  END as content_display
FROM public.businesses 
WHERE verified = true
ORDER BY rating_count DESC, created_at DESC;

-- Step 4: Create a test business with reviews for comparison
-- (This is just for testing - in real scenario, reviews would come from actual customers)
UPDATE public.businesses 
SET 
  rating_avg = 4.7,
  rating_count = 8
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 5: Show the updated display for Shleppers Moving
SELECT 'Updated Shleppers Moving Review Display:' as info;
SELECT 
  name,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('Reviews (', rating_count, ')')
    ELSE 'Reviews'
  END as section_title,
  CASE 
    WHEN rating_count > 0 THEN 'Shows actual review list'
    ELSE 'Shows "New to Haulers" with call-to-action buttons'
  END as content_display
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 6: Reset Shleppers Moving to no reviews (for testing the "New to Haulers" display)
UPDATE public.businesses 
SET 
  rating_avg = 0,
  rating_count = 0
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 7: Show final display
SELECT 'Final Shleppers Moving Review Display:' as info;
SELECT 
  name,
  rating_count,
  CASE 
    WHEN rating_count > 0 THEN CONCAT('Reviews (', rating_count, ')')
    ELSE 'Reviews'
  END as section_title,
  CASE 
    WHEN rating_count > 0 THEN 'Shows actual review list'
    ELSE 'Shows "New to Haulers" with call-to-action buttons'
  END as content_display
FROM public.businesses 
WHERE id = 'f4527f20-6aa0-4efb-9dce-73a7751daf95';

-- Step 8: Summary of changes
SELECT 'Review Display Changes Summary:' as info;
SELECT '✅ No more "Reviews (0)" - now shows just "Reviews"' as change1;
SELECT '✅ "No reviews yet" replaced with "New to Haulers"' as change2;
SELECT '✅ Added call-to-action buttons for new businesses' as change3;
SELECT '✅ More supportive and encouraging messaging' as change4;
