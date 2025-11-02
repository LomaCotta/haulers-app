import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings/archive - Archive a booking or scheduled job
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, scheduledJobId, businessId, providerId } = body

    // Archive scheduled job
    if (scheduledJobId && providerId) {
      const { data, error } = await supabase.rpc('archive_scheduled_job', {
        p_job_id: scheduledJobId,
        p_provider_id: providerId
      })

      if (error) {
        console.error('Error archiving scheduled job:', error)
        return NextResponse.json({ 
          error: 'Failed to archive job',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, archived: true })
    }

    // Archive booking
    if (bookingId && businessId) {
      const { data, error } = await supabase.rpc('archive_booking', {
        p_booking_id: bookingId,
        p_business_id: businessId
      })

      if (error) {
        console.error('Error archiving booking:', error)
        return NextResponse.json({ 
          error: 'Failed to archive booking',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, archived: true })
    }

    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 })
  } catch (error) {
    console.error('Error in archive API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/bookings/archive - Unarchive a booking or scheduled job
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const scheduledJobId = searchParams.get('scheduledJobId')
    const businessId = searchParams.get('businessId')
    const providerId = searchParams.get('providerId')

    // Unarchive scheduled job
    if (scheduledJobId && providerId) {
      const { data, error } = await supabase.rpc('unarchive_scheduled_job', {
        p_job_id: scheduledJobId,
        p_provider_id: providerId
      })

      if (error) {
        console.error('Error unarchiving scheduled job:', error)
        return NextResponse.json({ 
          error: 'Failed to unarchive job',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, archived: false })
    }

    // Unarchive booking
    if (bookingId && businessId) {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('business_id')
        .eq('id', bookingId)
        .single()

      if (fetchError || !booking) {
        return NextResponse.json({ 
          error: 'Booking not found' 
        }, { status: 404 })
      }

      // Verify ownership
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', booking.business_id)
        .single()

      if (!business || business.owner_id !== user.id) {
        return NextResponse.json({ 
          error: 'Unauthorized' 
        }, { status: 403 })
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null
        })
        .eq('id', bookingId)
        .eq('business_id', booking.business_id)

      if (error) {
        console.error('Error unarchiving booking:', error)
        return NextResponse.json({ 
          error: 'Failed to unarchive booking',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ success: true, archived: false })
    }

    return NextResponse.json({ 
      error: 'Missing required parameters' 
    }, { status: 400 })
  } catch (error) {
    console.error('Error in unarchive API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

