'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, CheckCircle, DollarSign, ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoice_number: string
  total_cents: number
  balance_cents: number
  payment_status: string
  status: string
  business?: {
    name: string
  }
}

export default function InvoicePaymentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [id])

  const loadInvoice = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      const response = await fetch(`/api/invoices/${id}`)
      const data = await response.json()

      if (!response.ok) {
        setError("Invoice not found")
        return
      }

      // Verify user is the customer
      if (data.customer_id !== user.id) {
        setError("You don't have permission to pay for this invoice")
        return
      }

      // Check if already paid
      if (data.status === 'paid' || data.balance_cents === 0) {
        setSuccess(true)
      }

      setInvoice(data)
    } catch (error) {
      console.error('Error loading invoice:', error)
      setError("Failed to load invoice")
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!invoice) return

    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Not authenticated")
        return
      }

      // Create payment intent via invoice payment API
      const response = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: invoice.balance_cents
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Payment is already processed by the API endpoint
      // The invoice and booking status are updated automatically

      setSuccess(true)
      
      // Redirect to invoice page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/invoices/${id}`)
      }, 2000)
    } catch (error) {
      console.error('Payment error:', error)
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/dashboard/invoices')}>Back to Invoices</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success && invoice?.status === 'paid') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment of {formatPrice(invoice.total_cents)} has been processed successfully.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => router.push(`/dashboard/invoices/${id}`)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  View Invoice
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/dashboard/reviews/${invoice.business?.name || 'service'}`)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Leave a Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/dashboard/invoices/${id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoice
          </Button>
        </Link>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-200">
            <CardTitle className="text-2xl font-bold">Pay Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Invoice Number</p>
              <p className="text-lg font-semibold">{invoice.invoice_number}</p>
            </div>

            {invoice.business && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Service Provider</p>
                <p className="text-lg font-semibold">{invoice.business.name}</p>
              </div>
            )}

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Amount Due</span>
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(invoice.balance_cents)}
                </span>
              </div>
              {invoice.total_cents !== invoice.balance_cents && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total Amount:</span>
                    <span>{formatPrice(invoice.total_cents)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Already Paid:</span>
                    <span className="text-emerald-600">{formatPrice(invoice.total_cents - invoice.balance_cents)}</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={handlePayment}
                disabled={processing || invoice.status === 'paid' || invoice.balance_cents === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-semibold"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : invoice.status === 'paid' || invoice.balance_cents === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Already Paid
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Pay {formatPrice(invoice.balance_cents)}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment processing powered by Stripe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

