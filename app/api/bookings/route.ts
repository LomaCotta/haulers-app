import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBookingRequestSchema } from '@/lib/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Handle both strict schema format and flexible form format
    let businessId: string
    let moveDate: string
    let details: any
    
    // Check if it's the strict schema format
    try {
      const validatedData = createBookingRequestSchema.parse(body)
      businessId = validatedData.business_id
      moveDate = validatedData.move_date
      details = validatedData.details
    } catch (schemaError) {
      // If schema validation fails, try to parse the flexible form format
      businessId = body.business_id || body.businessId
      moveDate = body.move_date || body.preferredDate
      
      // Build details object from form fields
      details = body.details || {
        from_address: body.pickupAddress || body.from_address || '',
        to_address: body.dropoffAddress || body.to_address || '',
        notes: body.description || body.notes || body.customer_notes || '',
        size: body.size || 'commercial', // Default to commercial if not specified
        stairs: body.stairs || false,
        elevator: body.elevator || false,
        special_items: body.special_items || [],
        // Include contact info in details for reference
        contact_phone: body.contactPhone || body.phone,
        contact_email: body.contactEmail || body.email,
        estimated_value: body.estimatedValue || body.estimated_value
      }
    }
    
    // Validate required fields
    if (!businessId) {
      return NextResponse.json({ error: 'Missing business_id' }, { status: 400 })
    }
    
    if (!moveDate) {
      return NextResponse.json({ error: 'Missing move_date or preferredDate' }, { status: 400 })
    }
    
    // Ensure move_date is in ISO format
    let moveDateISO: string
    try {
      const dateObj = new Date(moveDate)
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      moveDateISO = dateObj.toISOString().split('T')[0] // YYYY-MM-DD format
    } catch (e) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    
    // Create booking using actual schema columns
    const bookingData: any = {
      customer_id: user.id,
      business_id: businessId,
      requested_date: moveDateISO, // Use requested_date, not move_date
      booking_status: 'pending', // Use booking_status, not status
      service_type: details.service_type || 'moving', // Required field
      service_address: details.from_address || details.address || '', // Required field
      service_city: details.city || '', // Required field
      service_state: details.state || '', // Required field
      service_postal_code: details.postal_code || '', // Required field
      requested_time: details.requested_time || '09:00:00', // Required field
      total_price_cents: details.estimated_value ? Math.round(parseFloat(details.estimated_value) * 100) : 0,
      base_price_cents: 0,
      service_details: details, // Store all details in JSONB
      customer_phone: details.contact_phone || '',
      customer_email: details.contact_email || '',
      customer_notes: details.notes || ''
    }
    
    console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2))
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    
    if (error) {
      console.error('Booking creation error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create booking', 
        details: error.message,
        hint: error.hint 
      }, { status: 500 })
    }
    
    // Send notification to business owner about new booking request
    if (booking?.business_id) {
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', booking.business_id)
          .single()

        if (business?.owner_id) {
          const { sendNotification } = await import('@/lib/notifications')
          await sendNotification(
            business.owner_id,
            'booking_request',
            'email',
            {
              booking_id: booking.id,
              message: 'You have a new booking request'
            }
          )
        }
      } catch (notifError) {
        console.error('Error sending booking notification:', notifError)
        // Don't fail booking creation if notification fails
      }
    }

    // Send confirmation notification to customer
    if (booking?.customer_id) {
      try {
        const { sendNotification } = await import('@/lib/notifications')
        await sendNotification(
          booking.customer_id,
          'booking_confirmed',
          'email',
          {
            booking_id: booking.id,
            message: 'Your booking request has been submitted'
          }
        )
      } catch (notifError) {
        console.error('Error sending customer notification:', notifError)
        // Don't fail booking creation if notification fails
      }
    }
    
    console.log('Successfully created booking:', booking?.id)
    return NextResponse.json({ booking })
    
  } catch (error: any) {
    console.error('Booking API error:', error)
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: error.message 
    }, { status: 400 })
  }
}
