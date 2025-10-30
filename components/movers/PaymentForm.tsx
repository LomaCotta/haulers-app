"use client";

import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react'

interface PaymentFormProps {
  quoteId: string
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function PaymentForm({ quoteId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Payment system not available')
      return
    }

    setLoading(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card information not found')
      setLoading(false)
      return
    }

    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card: cardElement })
      if (pmError || !paymentMethod) {
        const message = pmError?.message || 'Payment method creation failed'
        setError(message)
        setLoading(false)
        return
      }

      const response = await fetch('/api/movers/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, paymentMethodId: paymentMethod.id, amount: Math.round(amount * 100) }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Payment failed')

      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret)
        if (confirmError) throw new Error(confirmError.message || '3D Secure authentication failed')
      }

      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (success) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 text-green-700 mb-4">
              <CheckCircle className="h-8 w-8" />
              <h3 className="text-xl font-bold">Payment Successful!</h3>
            </div>
            <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Amount Paid:</span>
                <span className="text-lg font-bold text-green-700">{formatCurrency(amount)}</span>
              </div>
              <div className="text-xs text-gray-500 text-center">Quote ID: {quoteId}</div>
            </div>
            <div className="text-sm text-gray-600">You will receive a confirmation email shortly with all the details.</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Reservation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Amount:</span>
            <span className="text-lg font-bold">{formatCurrency(amount)}</span>
          </div>
          <Badge variant="secondary" className="text-xs">Quote ID: {quoteId}</Badge>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
            </div>
          </div>

          <Button type="submit" disabled={!stripe || loading} className="w-full">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing Payment...</>) : (`Pay ${formatCurrency(amount)}`)}
          </Button>
          <p className="text-xs text-gray-500 text-center">Payments processed by Stripe.</p>
        </form>
      </CardContent>
    </Card>
  )
}


