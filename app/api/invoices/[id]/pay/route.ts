import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY not set; payments API will return 503')
}
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, paymentMethodId, currency = 'usd' } = await request.json()

    // Get invoice with booking
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(id, booking_status, payment_status, customer_id),
        business:businesses(id, name, owner_id),
        customer:profiles(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const booking = invoice.booking as any
    const business = invoice.business as any
    
    // Verify user is the customer
    if (invoice.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }

    const paymentAmount = amount || invoice.balance_cents

    // Process payment
    const intent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: currency,
      payment_method: paymentMethodId,
      confirm: true,
      metadata: { 
        invoice_id: id,
        booking_id: booking?.id || '',
        customer_id: user.id,
        business_id: business.id
      },
    })

    if (intent.status === 'succeeded') {
      // Update invoice payment status
      const paidCents = (invoice.paid_cents || 0) + paymentAmount
      const isFullyPaid = paidCents >= invoice.total_cents

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_cents: paidCents,
          balance_cents: invoice.total_cents - paidCents,
          status: isFullyPaid ? 'paid' : 'partially_paid',
          paid_at: isFullyPaid ? new Date().toISOString() : invoice.paid_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating invoice after payment:', updateError)
      }

      // Update booking payment status if invoice is fully paid
      if (isFullyPaid && booking) {
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        // CRITICAL: Trigger review request when payment is marked as paid
        // Check if booking is completed and payment is now paid
        if (booking.booking_status === 'completed') {
          // Create notification for review request
          await supabase
            .from('notifications')
            .insert({
              user_id: invoice.customer_id,
              booking_id: booking.id,
              notification_type: 'review_request',
              title: 'How was your service? ⭐',
              message: `Thank you for your payment! Please share your experience with ${business.name} by leaving a review.`,
              action_url: `/dashboard/reviews/${booking.id}`,
              created_at: new Date().toISOString()
            })

          // Also update booking to indicate review was requested
          await supabase
            .from('bookings')
            .update({
              review_requested_at: new Date().toISOString()
            })
            .eq('id', booking.id)
        }
      }

      return NextResponse.json({ 
        success: true, 
        clientSecret: intent.client_secret, 
        paymentIntent: intent,
        fullyPaid: isFullyPaid
      })
    }

    if (intent.status === 'requires_action') {
      return NextResponse.json({ 
        success: true, 
        requiresAction: true, 
        clientSecret: intent.client_secret, 
        paymentIntent: intent 
      })
    }

    return NextResponse.json({ 
      error: 'Payment failed', 
      status: intent.status 
    }, { status: 400 })
  } catch (error) {
    console.error('Invoice payment processing error:', error)
    const message = error instanceof Error ? error.message : 'Payment processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

