import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/invoices/[id]/complete-job - Complete job and trigger review request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invoice and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        business:businesses(id, name, owner_id),
        booking:bookings(id, booking_status, customer_id, review_requested_at)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const business = invoice.business as any
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only business owner can complete job' }, { status: 403 })
    }

    if (!invoice.booking_id) {
      return NextResponse.json({ error: 'Invoice is not linked to a booking' }, { status: 400 })
    }

    if (invoice.status !== 'paid') {
      return NextResponse.json({ error: 'Invoice must be paid before completing job' }, { status: 400 })
    }

    const booking = invoice.booking as any
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if review was already requested
    if (booking.review_requested_at) {
      return NextResponse.json({ 
        message: 'Review request already sent',
        already_requested: true 
      })
    }

    // Create review request notification
    try {
      // Try with notification_type (new schema)
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.customer_id,
          booking_id: invoice.booking_id,
          notification_type: 'review_request',
          title: 'How was your service? ⭐',
          message: `Thank you for your business! Please share your experience with ${business?.name || 'your service provider'} by leaving a review.`,
          action_url: `/dashboard/reviews/${invoice.booking_id}`,
          type: 'system',
          related_id: invoice.booking_id,
          created_at: new Date().toISOString()
        })
    } catch (notifError: any) {
      // Fallback: try without notification_type if column doesn't exist
      if (notifError.code === '42703' || notifError.message?.includes('notification_type')) {
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.customer_id,
            booking_id: invoice.booking_id,
            title: 'How was your service? ⭐',
            message: `Thank you for your business! Please share your experience with ${business?.name || 'your service provider'} by leaving a review.`,
            action_url: `/dashboard/reviews/${invoice.booking_id}`,
            type: 'system',
            related_id: invoice.booking_id,
            created_at: new Date().toISOString()
          })
      } else {
        throw notifError
      }
    }

    // Mark that review was requested
    await supabase
      .from('bookings')
      .update({
        review_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.booking_id)

    console.log(`[Invoice] Review request triggered for booking ${invoice.booking_id}`)

    return NextResponse.json({ 
      success: true,
      message: 'Job completed and review request sent to customer'
    })
  } catch (error) {
    console.error('Error in POST /api/invoices/[id]/complete-job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

