'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewForm } from '@/components/review-form'
import { Star, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ReviewBookingPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  useEffect(() => {
    loadBooking()
  }, [bookingId])

  const loadBooking = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Fetch booking with business info
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          business_id,
          customer_id,
          booking_status,
          payment_status,
          requested_date,
          requested_time,
          business:businesses(id, name, city, state)
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError || !bookingData) {
        setError('Booking not found')
        return
      }

      // Verify user is the customer
      if (bookingData.customer_id !== user.id) {
        setError('You can only review bookings you made')
        return
      }

      // Check for paid invoices for this booking
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, paid_cents, total_cents')
        .eq('booking_id', bookingId)
      
      const hasPaidInvoice = invoices?.some((inv: any) => 
        inv.status === 'paid' && inv.paid_cents >= inv.total_cents
      )
      
      // Check if booking can be reviewed:
      // 1. Booking is completed, OR
      // 2. Invoice is paid (service was provided and paid for)
      const canReview = bookingData.booking_status === 'completed' || hasPaidInvoice

      if (!canReview) {
        setError('You can only review completed bookings or paid services')
        return
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle()

      if (existingReview) {
        setError('You have already reviewed this booking')
        return
      }

      setBooking(bookingData)
    } catch (err) {
      console.error('Error loading booking:', err)
      setError('Failed to load booking information')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmitted = (reviewId: string) => {
    setReviewSubmitted(true)
    // Redirect to reviews page after 2 seconds
    setTimeout(() => {
      router.push('/dashboard/reviews')
    }, 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Review</h2>
              <p className="text-gray-600 mb-4">{error || 'Booking not found'}</p>
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard/reviews">
                  <Button variant="outline">Back to Reviews</Button>
                </Link>
                <Link href="/dashboard/bookings">
                  <Button className="bg-orange-600 hover:bg-orange-700">View Bookings</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (reviewSubmitted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <Star className="w-16 h-16 text-green-600 fill-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-4">Your review has been submitted successfully.</p>
              <Link href="/dashboard/reviews">
                <Button className="bg-orange-600 hover:bg-orange-700">View Your Reviews</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/20">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard/reviews">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reviews
              </Button>
            </Link>
          </div>

          {/* Review Form Card */}
          <Card className="border-2 border-orange-200/50 bg-white shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white pb-6 pt-8 px-8 border-b border-gray-100">
              <CardTitle className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                Write a Review
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                Share your experience with <span className="font-semibold text-gray-900">{booking.business?.name || 'Service Provider'}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {/* Booking Info */}
              <div className="mb-8 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <Star className="w-7 h-7 text-white fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-gray-900 mb-1">{booking.business?.name || 'Service Provider'}</h3>
                    {booking.business?.city && booking.business?.state && (
                      <p className="text-sm text-gray-600 mb-3">{booking.business.city}, {booking.business.state}</p>
                    )}
                    {booking.requested_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Service Date:</span>
                        <span>
                          {new Date(booking.requested_date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {booking.requested_time && ` at ${booking.requested_time}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <ReviewForm
                businessId={booking.business_id}
                businessName={booking.business?.name || 'Service Provider'}
                bookingId={bookingId}
                onReviewSubmitted={handleReviewSubmitted}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

