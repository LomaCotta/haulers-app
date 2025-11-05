import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invoices/[id] - Get single invoice
export async function GET(
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

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(id, booking_status, requested_date, requested_time, service_address, review_requested_at),
        business:businesses(id, name, phone, email, owner_id, address, city, state, postal_code, logo_url),
        customer:profiles(id, full_name),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single()

    if (error || !invoice) {
      console.error('Error fetching invoice:', error)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify access
    const business = invoice.business as any
    const isBusinessOwner = business?.owner_id === user.id
    const isCustomer = invoice.customer_id === user.id
    
    console.log('Invoice access check:', {
      invoiceId: id,
      userId: user.id,
      businessOwnerId: business?.owner_id,
      customerId: invoice.customer_id,
      isBusinessOwner,
      isCustomer
    })

    if (!isBusinessOwner && !isCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if review exists for this booking
    let reviewExists = false
    if (invoice.booking_id) {
      const { data: review } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', invoice.booking_id)
        .maybeSingle()
      
      reviewExists = !!review
    }

    // Add review_exists flag to invoice
    const invoiceWithReview = {
      ...invoice,
      review_exists: reviewExists
    }

    return NextResponse.json(invoiceWithReview)
  } catch (error) {
    console.error('Error in GET /api/invoices/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/invoices/[id] - Update invoice
export async function PATCH(
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
    const { status, notes, items, due_date, payment_terms_days } = body

    // Get invoice and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, business:businesses(owner_id)')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const business = invoice.business as any
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only business owner can update invoice' }, { status: 403 })
    }

    // Update invoice
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
      
      // If marking as sent, set sent date
      if (status === 'sent' && !invoice.email_sent_at) {
        updateData.email_sent_at = new Date().toISOString()
        
        // Trigger review request if invoice is linked to a completed booking
        if (invoice.booking_id) {
          try {
            const { data: booking } = await supabase
              .from('bookings')
              .select('booking_status, review_requested_at, customer_id, business_id, business:businesses(name)')
              .eq('id', invoice.booking_id)
              .single()
            
            if (booking && booking.booking_status === 'completed' && !booking.review_requested_at) {
              const business = booking.business as any
              
              // Create notification for review request (handle both schema versions)
              try {
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
                  review_requested_at: new Date().toISOString()
                })
                .eq('id', invoice.booking_id)
              
              console.log(`[Invoice] Review request triggered for booking ${invoice.booking_id}`)
            }
          } catch (reviewError) {
            console.error('Error triggering review request:', reviewError)
            // Don't fail invoice update if review request fails
          }
        }
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (due_date !== undefined) {
      updateData.due_date = due_date
    }

    if (payment_terms_days !== undefined) {
      updateData.payment_terms_days = payment_terms_days
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

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id)

      // Insert new items
      if (items.length > 0) {
        const invoiceItems = items.map((item: any, index: number) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.unit_price_cents * (item.quantity || 1),
          item_type: item.item_type || 'service',
          display_order: index
        }))

        await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        // Recalculate totals
        const subtotal = items.reduce((sum: number, item: any) => {
          return sum + (item.unit_price_cents * (item.quantity || 1))
        }, 0)

        await supabase
          .from('invoices')
          .update({
            subtotal_cents: subtotal,
            total_cents: subtotal,
            balance_cents: subtotal - (updatedInvoice.paid_cents || 0)
          })
          .eq('id', id)
      }
    }

    // Reload invoice with items
    const { data: finalInvoice } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json(finalInvoice)
  } catch (error) {
    console.error('Error in PATCH /api/invoices/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

