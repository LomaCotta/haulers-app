import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY not set; payments API will return 503')
}
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { booking_id, amount, paymentMethodId, currency = 'usd' } = await request.json()

    if (!booking_id || !amount) {
      return NextResponse.json({ error: 'Missing booking_id or amount' }, { status: 400 })
    }

    // Verify booking exists and user is the customer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, business:businesses(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 })
    }

    // If paymentMethodId is provided, process payment immediately
    // Otherwise, create a payment intent for client-side confirmation
    if (paymentMethodId) {
      const intent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        payment_method: paymentMethodId,
        confirm: true,
        metadata: { 
          booking_id: String(booking_id),
          customer_id: user.id,
          business_id: booking.business_id
        },
      })

      if (intent.status === 'succeeded') {
        // Update booking payment status
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking_id)

        if (updateError) {
          console.error('Error updating booking after payment:', updateError)
          // Payment succeeded but booking update failed - should be handled by webhook
        }

        // CRITICAL: Trigger review request when payment is marked as paid and booking is completed
        const { data: updatedBooking } = await supabase
          .from('bookings')
          .select('booking_status, customer_id, business_id, business:businesses(name)')
          .eq('id', booking_id)
          .single()

        if (updatedBooking && updatedBooking.booking_status === 'completed') {
          const business = updatedBooking.business as any
          
          // Create notification for review request
          await supabase
            .from('notifications')
            .insert({
              user_id: updatedBooking.customer_id,
              booking_id: booking_id,
              notification_type: 'review_request',
              title: 'How was your service? ⭐',
              message: `Thank you for your payment! Please share your experience with ${business?.name || 'your service provider'} by leaving a review.`,
              action_url: `/dashboard/reviews/${booking_id}`,
              created_at: new Date().toISOString()
            })

          // Mark that review was requested
          await supabase
            .from('bookings')
            .update({
              review_requested_at: new Date().toISOString()
            })
            .eq('id', booking_id)
        }

        return NextResponse.json({ 
          success: true, 
          clientSecret: intent.client_secret, 
          paymentIntent: intent 
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
    } else {
      // Create payment intent for client-side confirmation
      const intent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        metadata: { 
          booking_id: String(booking_id),
          customer_id: user.id,
          business_id: booking.business_id
        },
      })

      return NextResponse.json({ 
        success: true, 
        clientSecret: intent.client_secret,
        paymentIntent: intent
      })
    }
  } catch (error) {
    console.error('Payment processing error:', error)
    const message = error instanceof Error ? error.message : 'Payment processing failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

