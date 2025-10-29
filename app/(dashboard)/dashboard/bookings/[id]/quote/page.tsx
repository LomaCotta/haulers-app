'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  DollarSign, CheckCircle2, XCircle, Clock, MessageSquare, 
  Calendar, MapPin, User, Phone, Mail, AlertCircle 
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Quote {
  id: string
  booking_id: string
  business_id: string
  quote_amount_cents: number
  total_price_cents: number
  quote_status: string
  quote_message: string
  quote_notes: string
  sent_at: string
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  expires_at: string | null
  rejection_reason: string | null
}

interface Booking {
  id: string
  service_type: string
  service_address: string
  service_city: string
  service_state: string
  requested_date: string
  requested_time: string
  customer_notes: string
}

interface Business {
  id: string
  name: string
  phone: string
  email: string
}

export default function QuotePage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  const [quote, setQuote] = useState<Quote | null>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadQuote()
  }, [bookingId])

  const loadQuote = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Fetch quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (quoteError) {
        console.error('Quote error:', quoteError)
        setError('Quote not found')
        return
      }

      setQuote(quoteData)

      // Mark as viewed if not already viewed
      if (!quoteData.viewed_at) {
        await supabase
          .from('quotes')
          .update({ 
            viewed_at: new Date().toISOString(),
            quote_status: quoteData.quote_status === 'sent' ? 'viewed' : quoteData.quote_status
          })
          .eq('id', quoteData.id)
      }

      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (!bookingError && bookingData) {
        setBooking(bookingData)

        // Fetch business
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, phone, email')
          .eq('id', bookingData.business_id)
          .single()

        if (!businessError && businessData) {
          setBusiness(businessData)
        }
      }

    } catch (err) {
      console.error('Error loading quote:', err)
      setError('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!quote) return

    setSubmitting(true)
    setError('')

    try {
      const { data, error: responseError } = await supabase.rpc('respond_to_quote', {
        p_quote_id: quote.id,
        p_response: 'accepted',
        p_response_message: responseMessage.trim() || 'Quote accepted'
      })

      if (responseError) {
        console.error('Accept error:', responseError)
        setError(responseError.message || 'Failed to accept quote')
        return
      }

      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        setError(data.replace('ERROR: ', ''))
        return
      }

      setSuccess('Quote accepted successfully! The business owner has been notified.')
      setTimeout(() => {
        router.push('/dashboard/bookings')
      }, 2000)

    } catch (err) {
      console.error('Error accepting quote:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!quote) return

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const { data, error: responseError } = await supabase.rpc('respond_to_quote', {
        p_quote_id: quote.id,
        p_response: 'rejected',
        p_response_message: responseMessage.trim() || 'Quote rejected',
        p_rejection_reason: rejectionReason.trim()
      })

      if (responseError) {
        console.error('Reject error:', responseError)
        setError(responseError.message || 'Failed to reject quote')
        return
      }

      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        setError(data.replace('ERROR: ', ''))
        return
      }

      setSuccess('Quote rejected. The business owner has been notified.')
      setTimeout(() => {
        router.push('/dashboard/bookings')
      }, 2000)

    } catch (err) {
      console.error('Error rejecting quote:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading quote...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !quote) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Link href="/dashboard/bookings">
                <Button>Back to Bookings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date()
  const canRespond = quote.quote_status === 'sent' || quote.quote_status === 'viewed' || quote.quote_status === 'negotiating'

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quote for Your Booking</h1>
            <p className="text-muted-foreground">
              {business?.name || 'Business'} has sent you a quote
            </p>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-green-700">{success}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Quote Details</CardTitle>
              <Badge className={
                quote.quote_status === 'accepted' ? 'bg-green-100 text-green-800' :
                quote.quote_status === 'rejected' ? 'bg-red-100 text-red-800' :
                quote.quote_status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                isExpired ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {isExpired ? 'EXPIRED' : quote.quote_status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quote Amount */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center border-2 border-blue-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <span className="text-sm text-gray-600">Total Quote Amount</span>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                ${(quote.total_price_cents / 100).toFixed(2)}
              </p>
            </div>

            {/* Quote Message */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <Label className="text-base font-semibold">Message from {business?.name || 'Business'}</Label>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{quote.quote_message}</p>
              </div>
            </div>

            {/* Booking Details */}
            {booking && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Service Address</p>
                      <p className="text-sm text-gray-600">
                        {booking.service_address}<br />
                        {booking.service_city}, {booking.service_state}
                      </p>
                    </div>
                  </div>
                  
                  {booking.requested_date && (
                    <div className="flex items-start space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Requested Date</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(booking.requested_date), "MMM d, yyyy")}
                          {booking.requested_time && ` at ${booking.requested_time}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {business && (
                    <>
                      <div className="flex items-start space-x-2">
                        <User className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Business</p>
                          <p className="text-sm text-gray-600">{business.name}</p>
                        </div>
                      </div>
                      
                      {business.phone && (
                        <div className="flex items-start space-x-2">
                          <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone</p>
                            <p className="text-sm text-gray-600">{business.phone}</p>
                          </div>
                        </div>
                      )}
                      
                      {business.email && (
                        <div className="flex items-start space-x-2">
                          <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Email</p>
                            <p className="text-sm text-gray-600">{business.email}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quote Metadata */}
            <div className="pt-4 border-t text-sm text-gray-500 space-y-1">
              {quote.sent_at && (
                <p>Sent on {format(new Date(quote.sent_at), "MMM d, yyyy 'at' h:mm a")}</p>
              )}
              {quote.viewed_at && (
                <p>You viewed this quote on {format(new Date(quote.viewed_at), "MMM d, yyyy 'at' h:mm a")}</p>
              )}
              {quote.expires_at && (
                <p className={isExpired ? 'text-red-600 font-medium' : ''}>
                  {isExpired ? 'Expired' : 'Expires'} on {format(new Date(quote.expires_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>

            {/* Response Section */}
            {canRespond && !isExpired && quote.quote_status !== 'accepted' && quote.quote_status !== 'rejected' && (
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-lg font-semibold">Respond to Quote</h3>
                
                <div>
                  <Label htmlFor="response-message">Optional Message to Business</Label>
                  <Textarea
                    id="response-message"
                    placeholder="Any questions or comments about this quote..."
                    rows={3}
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {quote.quote_status !== 'accepted' && (
                  <div>
                    <Label htmlFor="rejection-reason">Reason for Rejection (if rejecting)</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Please let us know why you're rejecting this quote..."
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Accept Quote
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleReject}
                    disabled={submitting || !rejectionReason.trim()}
                    variant="destructive"
                    size="lg"
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject Quote
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Already Responded */}
            {quote.quote_status === 'accepted' && (
              <div className="pt-6 border-t bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Quote Accepted!</p>
                    <p className="text-sm text-green-700 mt-1">
                      You accepted this quote on {quote.accepted_at && format(new Date(quote.accepted_at), "MMM d, yyyy 'at' h:mm a")}.
                      The business owner has been notified.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {quote.quote_status === 'rejected' && (
              <div className="pt-6 border-t bg-red-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">Quote Rejected</p>
                    <p className="text-sm text-red-700 mt-1">
                      You rejected this quote on {quote.rejected_at && format(new Date(quote.rejected_at), "MMM d, yyyy 'at' h:mm a")}.
                      {quote.rejection_reason && (
                        <span className="block mt-1">Reason: {quote.rejection_reason}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
