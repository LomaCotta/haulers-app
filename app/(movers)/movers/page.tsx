"use client";

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PaymentForm } from '@/components/movers/PaymentForm'
import { useSearchParams } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function MoversCheckoutPage() {
  const params = useSearchParams()
  const quoteId = params.get('quoteId') || 'demo-quote'
  const amount = Number(params.get('amount') || 200)

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <div className="p-6 text-sm text-red-600">Stripe not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</div>
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Movers Reservation Payment</h1>
      <Elements stripe={stripePromise}>
        <PaymentForm quoteId={quoteId} amount={amount} />
      </Elements>
    </div>
  )
}


