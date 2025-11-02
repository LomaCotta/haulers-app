'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, CheckCircle, DollarSign, ArrowLeft, Star } from "lucide-react"
import Link from "next/link"

interface Booking {
  id: string
  total_price_cents: number
  payment_status: string
  booking_status: string
  business?: {
    name: string
  }
}

export default function BookingPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadBooking()
  }, [id])

  const loadBooking = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          business:businesses(*)
        `)
        .eq("id", id)
        .single()

      if (bookingError || !bookingData) {
        setError("Booking not found")
        return
      }

      const bookingObj = bookingData as Booking
      
      // Verify user is the customer
      if (bookingObj.customer_id !== user.id) {
        setError("You don't have permission to pay for this booking")
        return
      }

      // Check if already paid
      if (bookingObj.payment_status === 'paid') {
        setSuccess(true)
      }

      setBooking(bookingObj)
    } catch (error) {
      console.error('Error loading booking:', error)
      setError("Failed to load booking")
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!booking) return

    setProcessing(true)
    setError(null)

    try {
      // In a real implementation, you would:
      // 1. Create a Stripe Payment Intent
      // 2. Use Stripe Elements or Checkout
      // 3. Process the payment
      // 4. Update the booking status

      // For now, we'll simulate payment processing
      // In production, integrate with Stripe properly
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Not authenticated")
        return
      }

      // Create payment intent via API
      const response = await fetch('/api/bookings/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: id,
          amount: booking.total_price_cents
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Update booking payment status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        // Payment succeeded but failed to update - this should be handled by webhook
      }

      setSuccess(true)
      
      // Redirect to booking page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/bookings/${id}`)
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

  if (error && !booking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/dashboard/bookings')}>Back to Bookings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success && booking?.payment_status === 'paid') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your payment of {formatPrice(booking.total_price_cents)} has been processed successfully.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => router.push(`/dashboard/bookings/${id}`)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  View Booking
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/dashboard/reviews/${id}`)}
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

  if (!booking) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/dashboard/bookings/${id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Booking
          </Button>
        </Link>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-200">
            <CardTitle className="text-2xl font-bold">Pay Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Service Provider</p>
              <p className="text-lg font-semibold">{booking.business?.name || 'Service Provider'}</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(booking.total_price_cents)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Booking ID: {booking.id.slice(0, 8)}
              </p>
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
                disabled={processing || booking.payment_status === 'paid'}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-semibold"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : booking.payment_status === 'paid' ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Already Paid
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Pay {formatPrice(booking.total_price_cents)}
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

