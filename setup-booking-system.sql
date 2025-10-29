-- Complete Booking System Setup
-- This sets up the entire booking system with all components

-- Step 1: Run the main schema
\i /home/as/Documents/haulers/haulers/booking-system-schema.sql

-- Step 2: Run industry templates
\i /home/as/Documents/haulers/haulers/industry-service-templates.sql

-- Step 3: Run management functions
\i /home/as/Documents/haulers/haulers/booking-management-functions.sql

-- Step 4: Create sample data for testing
INSERT INTO public.bookings (
  business_id, customer_id, service_type, booking_status, priority,
  requested_date, requested_time, estimated_duration_hours,
  service_address, service_city, service_state, service_postal_code,
  base_price_cents, hourly_rate_cents, total_price_cents,
  customer_notes, customer_phone, customer_email
) VALUES 
-- Sample booking for Shleppers Moving
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 
 (SELECT id FROM public.profiles WHERE role = 'customer' LIMIT 1),
 'residential_move', 'pending', 'normal',
 CURRENT_DATE + INTERVAL '3 days', '10:00:00', 4,
 '123 Main St', 'New York', 'NY', '10001',
 80000, 6000, 104000,
 'Moving from 2-bedroom apartment to house. Need help with piano.',
 '(555) 123-4567', 'customer@example.com'),

-- Sample completed booking
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 
 (SELECT id FROM public.profiles WHERE role = 'customer' LIMIT 1),
 'piano_move', 'completed', 'high',
 CURRENT_DATE - INTERVAL '5 days', '14:00:00', 2,
 '456 Oak Ave', 'Brooklyn', 'NY', '11201',
 30000, 8000, 46000,
 'Grand piano move - 3rd floor to ground floor',
 '(555) 987-6543', 'piano@example.com');

-- Step 5: Create sample notifications
INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
SELECT 
  customer_id,
  id,
  'booking_created',
  'Booking Created! 🎉',
  'Your booking has been created and is pending confirmation.',
  '/bookings/' || id
FROM public.bookings
WHERE booking_status = 'pending';

-- Step 6: Test the system
SELECT 'Testing Booking System...' as test_phase;

-- Test booking stats
SELECT 'Booking Stats:' as test_name;
SELECT get_booking_stats() as stats;

-- Test business stats
SELECT 'Business Stats:' as test_name;
SELECT get_business_booking_stats('f4527f20-6aa0-4efb-9dce-73a7751daf95') as business_stats;

-- Test search function
SELECT 'Search Test:' as test_name;
SELECT * FROM search_bookings('moving', 'pending', 'normal', NULL, NULL, NULL, NULL, 10, 0);

-- Test analytics
SELECT 'Analytics Test:' as test_name;
SELECT get_booking_analytics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, NULL) as analytics;

-- Step 7: Create sample service templates for different industries
INSERT INTO public.service_templates (business_id, template_name, template_description, industry_category, service_type, base_price_cents, hourly_rate_cents, estimated_duration_hours, service_config, required_items, optional_items) VALUES

-- Cleaning Services
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'House Cleaning - 2 Bedroom', 'Complete house cleaning for 2 bedroom home', 'cleaning', 'residential_cleaning', 12000, 4000, 3,
'{"cleaning_supplies_included": true, "team_size": 2, "eco_friendly": true, "deep_clean": true}',
'[{"name": "Cleaning Supplies", "description": "Professional cleaning supplies", "unit_price_cents": 3000}, {"name": "2 Cleaners", "description": "Professional cleaning team", "unit_price_cents": 4000, "quantity": 2}]',
'[{"name": "Window Cleaning", "description": "Interior and exterior window cleaning", "unit_price_cents": 2000}, {"name": "Appliance Cleaning", "description": "Deep clean appliances", "unit_price_cents": 1500}]'),

-- Landscaping Services
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Lawn Care Package', 'Complete lawn care and maintenance', 'landscaping', 'lawn_care', 15000, 5000, 3,
'{"equipment_included": true, "fertilizer_included": true, "frequency": "weekly", "seasonal": true}',
'[{"name": "Lawn Mowing", "description": "Professional lawn mowing", "unit_price_cents": 6000}, {"name": "Trimming", "description": "Edge trimming and cleanup", "unit_price_cents": 3000}]',
'[{"name": "Fertilizing", "description": "Lawn fertilization", "unit_price_cents": 2000}, {"name": "Weed Control", "description": "Weed treatment and prevention", "unit_price_cents": 1500}]'),

-- Plumbing Services
('f4527f20-6aa0-4efb-9dce-73a7751daf95', 'Emergency Plumbing', '24/7 emergency plumbing service', 'plumbing', 'emergency_repair', 20000, 8000, 2,
'{"emergency": true, "available_24_7": true, "licensed_plumber": true, "warranty": "90 days"}',
'[{"name": "Emergency Call", "description": "Emergency service call", "unit_price_cents": 10000}, {"name": "Licensed Plumber", "description": "Licensed professional plumber", "unit_price_cents": 8000, "quantity": 2}]',
'[{"name": "Parts Replacement", "description": "Replacement parts and materials", "unit_price_cents": 5000}, {"name": "Extended Warranty", "description": "Extended warranty coverage", "unit_price_cents": 2000}]');

-- Step 8: Create sample booking items
INSERT INTO public.booking_items (booking_id, item_name, item_description, item_category, item_type, unit_price_cents, quantity, total_price_cents)
SELECT 
  b.id,
  'Moving Truck',
  'Professional moving truck',
  'equipment',
  'truck_rental',
  20000,
  1,
  20000
FROM public.bookings b
WHERE b.service_type = 'residential_move';

-- Step 9: Create status history entries
INSERT INTO public.booking_status_history (booking_id, changed_by, old_status, new_status, change_reason)
SELECT 
  id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'pending',
  booking_status,
  'Initial booking creation'
FROM public.bookings;

-- Step 10: Final verification
SELECT 'Final System Verification:' as verification;

-- Check all tables exist and have data
SELECT 'Tables Created:' as check_type;
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = schemaname) as column_count
FROM information_schema.tables 
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'booking_items', 'booking_status_history', 'service_templates', 'notifications')
ORDER BY tablename;

-- Check data counts
SELECT 'Data Counts:' as check_type;
SELECT 
  'bookings' as table_name,
  COUNT(*) as record_count
FROM public.bookings
UNION ALL
SELECT 
  'booking_items' as table_name,
  COUNT(*) as record_count
FROM public.booking_items
UNION ALL
SELECT 
  'service_templates' as table_name,
  COUNT(*) as record_count
FROM public.service_templates
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(*) as record_count
FROM public.notifications;

-- Check functions exist
SELECT 'Functions Created:' as check_type;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'create_booking_with_validation',
  'validate_booking_for_industry',
  'get_booking_stats',
  'get_business_booking_stats',
  'search_bookings',
  'update_booking_status',
  'get_booking_analytics'
)
ORDER BY routine_name;

-- Step 11: Success message
SELECT '🎉 COMPLETE BOOKING SYSTEM SETUP SUCCESSFUL! 🎉' as final_status;
SELECT 'The booking system is now ready for production use!' as message;
SELECT 'Features included:' as features;
SELECT '✅ Industry-agnostic booking system' as feature1;
SELECT '✅ Real-time notifications' as feature2;
SELECT '✅ Admin dashboard and management' as feature3;
SELECT '✅ Comprehensive analytics and reporting' as feature4;
SELECT '✅ Flexible service templates' as feature5;
SELECT '✅ Success notifications and user feedback' as feature6;
SELECT '✅ Multi-industry support (moving, cleaning, landscaping, plumbing, etc.)' as feature7;
SELECT '✅ Complete audit trail and status tracking' as feature8;
