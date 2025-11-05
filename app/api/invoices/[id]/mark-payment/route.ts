import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/invoices/[id]/mark-payment - Mark invoice as paid or partially paid
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

    const body = await request.json()
    const { paid_cents, status } = body

    // Get invoice and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, business:businesses(owner_id), booking:bookings(id, booking_status, customer_id)')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const business = invoice.business as any
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only business owner can mark payment' }, { status: 403 })
    }

    // Calculate balance
    const balanceCents = invoice.total_cents - paid_cents
    const finalStatus = status === 'paid' ? 'paid' : (balanceCents > 0 ? 'partially_paid' : 'paid')

    // Update invoice
    const updateData: any = {
      paid_cents: paid_cents,
      balance_cents: balanceCents,
      status: finalStatus,
      updated_at: new Date().toISOString()
    }

    // Set paid_at if fully paid
    if (finalStatus === 'paid' && !invoice.paid_at) {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    // Update booking payment status if linked and fully paid
    if (finalStatus === 'paid' && invoice.booking_id) {
      const booking = invoice.booking as any
      if (booking && booking.booking_status === 'completed') {
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.booking_id)

        // Automatically trigger review request when invoice is fully paid
        try {
          // Check if review was already requested
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('review_requested_at, customer_id, business_id, business:businesses(name)')
            .eq('id', invoice.booking_id)
            .single()

          if (existingBooking && !existingBooking.review_requested_at) {
            const business = existingBooking.business as any
            
            // Create review request notification
            try {
              await supabase
                .from('notifications')
                .insert({
                  user_id: existingBooking.customer_id,
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
                    user_id: existingBooking.customer_id,
                    booking_id: invoice.booking_id,
                    title: 'How was your service? ⭐',
                    message: `Thank you for your business! Please share your experience with ${business?.name || 'your service provider'} by leaving a review.`,
                    action_url: `/dashboard/reviews/${invoice.booking_id}`,
                    type: 'system',
                    related_id: invoice.booking_id,
                    created_at: new Date().toISOString()
                  })
              }
            }
            
            // Mark that review was requested
            await supabase
              .from('bookings')
              .update({
                review_requested_at: new Date().toISOString()
              })
              .eq('id', invoice.booking_id)

            console.log(`[Invoice Payment] Review request automatically triggered for booking ${invoice.booking_id}`)
          }
        } catch (reviewError) {
          console.error('Error triggering review request:', reviewError)
          // Don't fail invoice update if review request fails
        }
      }
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Error in POST /api/invoices/[id]/mark-payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

