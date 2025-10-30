import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY not set; payments API will return 503')
}
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const { quoteId, paymentMethodId, amount, currency = 'usd' } = await request.json()
    if (!quoteId || !paymentMethodId || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      metadata: { quote_id: String(quoteId) },
    })

    if (intent.status === 'succeeded') {
      return NextResponse.json({ success: true, clientSecret: intent.client_secret, paymentIntent: intent })
    }
    if (intent.status === 'requires_action') {
      return NextResponse.json({ success: true, requiresAction: true, clientSecret: intent.client_secret, paymentIntent: intent })
    }
    return NextResponse.json({ error: 'Payment failed', status: intent.status }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment processing failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


