-- Booking Management Functions
-- This creates functions for booking statistics and management

-- Step 1: Create booking statistics function
CREATE OR REPLACE FUNCTION get_booking_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_bookings', COUNT(*),
    'pending_bookings', COUNT(*) FILTER (WHERE booking_status = 'pending'),
    'confirmed_bookings', COUNT(*) FILTER (WHERE booking_status = 'confirmed'),
    'in_progress_bookings', COUNT(*) FILTER (WHERE booking_status = 'in_progress'),
    'completed_bookings', COUNT(*) FILTER (WHERE booking_status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE booking_status = 'cancelled'),
    'disputed_bookings', COUNT(*) FILTER (WHERE booking_status = 'disputed'),
    'total_revenue', COALESCE(SUM(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'average_booking_value', COALESCE(AVG(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'revenue_this_month', COALESCE(SUM(total_price_cents) FILTER (
      WHERE booking_status = 'completed' 
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0),
    'revenue_last_month', COALESCE(SUM(total_price_cents) FILTER (
      WHERE booking_status = 'completed' 
      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < date_trunc('month', CURRENT_DATE)
    ), 0)
  ) INTO result
  FROM public.bookings;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create business-specific booking stats function
CREATE OR REPLACE FUNCTION get_business_booking_stats(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'business_id', p_business_id,
    'total_bookings', COUNT(*),
    'pending_bookings', COUNT(*) FILTER (WHERE booking_status = 'pending'),
    'confirmed_bookings', COUNT(*) FILTER (WHERE booking_status = 'confirmed'),
    'completed_bookings', COUNT(*) FILTER (WHERE booking_status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE booking_status = 'cancelled'),
    'total_revenue', COALESCE(SUM(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'average_booking_value', COALESCE(AVG(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'this_month_bookings', COUNT(*) FILTER (
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'this_month_revenue', COALESCE(SUM(total_price_cents) FILTER (
      WHERE booking_status = 'completed' 
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0)
  ) INTO result
  FROM public.bookings
  WHERE business_id = p_business_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create booking search function
CREATE OR REPLACE FUNCTION search_bookings(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_business_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  customer_id UUID,
  service_type TEXT,
  booking_status TEXT,
  priority TEXT,
  requested_date DATE,
  requested_time TIME,
  service_address TEXT,
  service_city TEXT,
  service_state TEXT,
  total_price_cents INTEGER,
  estimated_duration_hours INTEGER,
  created_at TIMESTAMPTZ,
  customer_notes TEXT,
  business_notes TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  business_name TEXT,
  customer_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.business_id,
    b.customer_id,
    b.service_type,
    b.booking_status,
    b.priority,
    b.requested_date,
    b.requested_time,
    b.service_address,
    b.service_city,
    b.service_state,
    b.total_price_cents,
    b.estimated_duration_hours,
    b.created_at,
    b.customer_notes,
    b.business_notes,
    b.customer_phone,
    b.customer_email,
    bus.name as business_name,
    p.full_name as customer_name
  FROM public.bookings b
  LEFT JOIN public.businesses bus ON b.business_id = bus.id
  LEFT JOIN public.profiles p ON b.customer_id = p.id
  WHERE 
    (p_search_term IS NULL OR 
     b.service_type ILIKE '%' || p_search_term || '%' OR
     b.service_address ILIKE '%' || p_search_term || '%' OR
     bus.name ILIKE '%' || p_search_term || '%' OR
     p.full_name ILIKE '%' || p_search_term || '%')
    AND (p_status IS NULL OR b.booking_status = p_status)
    AND (p_priority IS NULL OR b.priority = p_priority)
    AND (p_date_from IS NULL OR b.requested_date >= p_date_from)
    AND (p_date_to IS NULL OR b.requested_date <= p_date_to)
    AND (p_business_id IS NULL OR b.business_id = p_business_id)
    AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create booking update function with notifications
CREATE OR REPLACE FUNCTION update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  booking_record RECORD;
  business_record RECORD;
  customer_record RECORD;
  result JSONB;
BEGIN
  -- Get booking details
  SELECT b.*, bus.name as business_name, p.full_name as customer_name
  INTO booking_record
  FROM public.bookings b
  LEFT JOIN public.businesses bus ON b.business_id = bus.id
  LEFT JOIN public.profiles p ON b.customer_id = p.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Update booking status
  UPDATE public.bookings 
  SET 
    booking_status = p_new_status,
    admin_notes = COALESCE(p_notes, admin_notes),
    updated_at = NOW(),
    confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_booking_id;
  
  -- Insert status history
  INSERT INTO public.booking_status_history (
    booking_id, changed_by, old_status, new_status, change_reason
  ) VALUES (
    p_booking_id, p_updated_by, booking_record.booking_status, p_new_status, p_notes
  );
  
  -- Create notifications based on status change
  CASE p_new_status
    WHEN 'confirmed' THEN
      INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
      VALUES (
        booking_record.customer_id, p_booking_id, 'booking_confirmed',
        'Booking Confirmed! 🎉',
        'Your booking with ' || booking_record.business_name || ' has been confirmed.',
        '/bookings/' || p_booking_id
      );
      
    WHEN 'cancelled' THEN
      INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
      VALUES (
        booking_record.customer_id, p_booking_id, 'booking_cancelled',
        'Booking Cancelled',
        'Your booking with ' || booking_record.business_name || ' has been cancelled.',
        '/bookings/' || p_booking_id
      );
      
    WHEN 'completed' THEN
      INSERT INTO public.notifications (user_id, booking_id, notification_type, title, message, action_url)
      VALUES (
        booking_record.customer_id, p_booking_id, 'booking_completed',
        'Service Completed! ⭐',
        'Your service with ' || booking_record.business_name || ' has been completed. Please leave a review!',
        '/bookings/' || p_booking_id || '/review'
      );
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'new_status', p_new_status,
    'message', 'Booking status updated successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create booking analytics function
CREATE OR REPLACE FUNCTION get_booking_analytics(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_business_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  date_from DATE := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
  date_to DATE := COALESCE(p_date_to, CURRENT_DATE);
BEGIN
  SELECT jsonb_build_object(
    'date_range', jsonb_build_object(
      'from', date_from,
      'to', date_to
    ),
    'total_bookings', COUNT(*),
    'completed_bookings', COUNT(*) FILTER (WHERE booking_status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE booking_status = 'cancelled'),
    'completion_rate', ROUND(
      (COUNT(*) FILTER (WHERE booking_status = 'completed')::DECIMAL / 
       NULLIF(COUNT(*) FILTER (WHERE booking_status IN ('completed', 'cancelled')), 0)) * 100, 2
    ),
    'total_revenue', COALESCE(SUM(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'average_booking_value', COALESCE(AVG(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0),
    'daily_average', COALESCE(AVG(total_price_cents) FILTER (WHERE booking_status = 'completed'), 0) / 
      GREATEST(EXTRACT(DAYS FROM (date_to - date_from))::INTEGER, 1),
    'top_service_types', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'service_type', service_type,
          'count', count,
          'revenue', revenue
        )
      )
      FROM (
        SELECT 
          service_type,
          COUNT(*) as count,
          SUM(total_price_cents) as revenue
        FROM public.bookings
        WHERE requested_date BETWEEN date_from AND date_to
          AND (p_business_id IS NULL OR business_id = p_business_id)
          AND booking_status = 'completed'
        GROUP BY service_type
        ORDER BY count DESC
        LIMIT 5
      ) top_services
    ),
    'status_breakdown', (
      SELECT jsonb_object_agg(booking_status, count)
      FROM (
        SELECT booking_status, COUNT(*) as count
        FROM public.bookings
        WHERE requested_date BETWEEN date_from AND date_to
          AND (p_business_id IS NULL OR business_id = p_business_id)
        GROUP BY booking_status
      ) status_counts
    )
  ) INTO result
  FROM public.bookings
  WHERE requested_date BETWEEN date_from AND date_to
    AND (p_business_id IS NULL OR business_id = p_business_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create notification management functions
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Notification marked as read');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found or access denied');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN,
  is_urgent BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.action_url,
    n.is_read,
    n.is_urgent,
    n.created_at,
    n.read_at
  FROM public.notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.is_urgent DESC, n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION get_booking_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_booking_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_bookings(TEXT, TEXT, TEXT, DATE, DATE, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_booking_status(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_analytics(DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INTEGER, INTEGER) TO authenticated;

-- Step 8: Success message
SELECT 'Booking management functions created successfully! 🚀' as status;
