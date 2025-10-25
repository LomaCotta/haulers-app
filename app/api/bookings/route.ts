import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBookingRequestSchema } from '@/lib/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createBookingRequestSchema.parse(body)
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        consumer_id: user.id,
        business_id: validatedData.business_id,
        move_date: validatedData.move_date,
        details: validatedData.details,
        status: 'requested'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Booking creation error:', error)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }
    
    return NextResponse.json({ booking })
    
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
