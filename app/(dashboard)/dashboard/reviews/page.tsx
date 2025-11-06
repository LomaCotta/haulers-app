'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Star, MessageSquare, Calendar, Clock, Building, User, AlertCircle, Trash2, CheckCircle, X, Filter, Loader2, Eye, EyeOff } from 'lucide-react'
import { ReviewForm } from '@/components/review-form'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'

interface Review {
  id: string
  booking_id: string
  consumer_id?: string // Schema uses consumer_id
  customer_id?: string // API might use customer_id
  business_id: string
  rating: number
  body?: string | null
  comment?: string | null // API uses comment
  photos?: string[]
  created_at: string
  is_hidden?: boolean
  owner_response?: string | null
  owner_response_at?: string | null
  customer?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  consumer?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  business?: {
    id: string
    name: string
    city?: string
    state?: string
  }
  booking?: {
    id: string
    requested_date?: string
    booking_status?: string
  }
}

interface BookingWithoutReview {
  id: string
  business_id: string
  requested_date: string
  requested_time?: string
  booking_status: string
  business?: {
    id: string
    name: string
    city?: string
    state?: string
  }
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [isProvider, setIsProvider] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessIds, setBusinessIds] = useState<string[]>([])
  
  // Reviews received (for their business)
  const [reviewsReceived, setReviewsReceived] = useState<Review[]>([])
  
  // Reviews they left (as a customer)
  const [reviewsLeft, setReviewsLeft] = useState<Review[]>([])
  
  // All reviews (for admin)
  const [allReviews, setAllReviews] = useState<Review[]>([])
  
  // Bookings that can be reviewed
  const [bookingsToReview, setBookingsToReview] = useState<BookingWithoutReview[]>([])
  
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string | null>(null)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'received' | 'left' | 'pending' | 'all'>('received')
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [selectedReviewForResponse, setSelectedReviewForResponse] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  
  const supabase = createClient()

  useEffect(() => {
    checkUserType()
  }, [])

  useEffect(() => {
    if (userId) {
      if (isProvider && businessIds.length > 0) {
        fetchReviewsReceived()
        fetchBookingsToReview()
      }
      if (isProvider || !isProvider) {
        // Both providers and consumers can leave reviews
        fetchReviewsLeft()
      }
      if (isAdmin) {
        fetchAllReviews()
      }
    }
  }, [userId, isProvider, isAdmin, businessIds])

  const checkUserType = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
        setIsProvider(false)
        setLoading(false)
        return
      }

      // Check if user is a provider
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id, business_id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (provider) {
        setIsProvider(true)
        setBusinessId(provider.business_id)
        setBusinessIds([provider.business_id])
        setLoading(false)
        return
      }

      // Also check if user owns any business directly
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)

      if (businesses && businesses.length > 0) {
        setIsProvider(true)
        setBusinessIds(businesses.map(b => b.id))
        setBusinessId(businesses[0].id)
        setLoading(false)
        return
      }

      setIsProvider(false)
      setLoading(false)
    } catch (error) {
      console.error('Error checking user type:', error)
      setLoading(false)
    }
  }

  const fetchReviewsReceived = async () => {
    if (!businessIds || businessIds.length === 0) {
      setReviewsReceived([])
      return
    }
    
    try {
      // Fetch reviews without foreign key references
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reviews received:', error)
        setReviewsReceived([])
        return
      }

      if (!reviews || reviews.length === 0) {
        setReviewsReceived([])
        return
      }

      // Fetch related data separately
      const customerIds = [...new Set(reviews
        .map(r => r.customer_id || r.consumer_id)
        .filter(Boolean))]

      const bookingIds = [...new Set(reviews
        .map(r => r.booking_id)
        .filter(Boolean))]

      // Fetch customer profiles
      let customersMap: Record<string, any> = {}
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', customerIds)

        customersMap = (customers || []).reduce((acc: Record<string, any>, c: any) => {
          acc[c.id] = c
          return acc
        }, {})
      }

      // Fetch businesses (we already have businessIds)
      let businessesMap: Record<string, any> = {}
      if (businessIds.length > 0) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, name, city, state')
          .in('id', businessIds)

        businessesMap = (businesses || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})
      }

      // Fetch bookings
      let bookingsMap: Record<string, any> = {}
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, requested_date, booking_status')
          .in('id', bookingIds)

        bookingsMap = (bookings || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})
      }

      // Enrich reviews with related data
      const enrichedReviews = reviews.map((review: any) => ({
        ...review,
        customer: customersMap[review.customer_id || review.consumer_id] || null,
        business: businessesMap[review.business_id] || null,
        booking: bookingsMap[review.booking_id] || null,
      }))

      setReviewsReceived(enrichedReviews)
    } catch (error) {
      console.error('Error in fetchReviewsReceived:', error)
      setReviewsReceived([])
    }
  }

  const fetchReviewsLeft = async () => {
    if (!userId) {
      setReviewsLeft([])
      return
    }
    
    try {
      // First try customer_id (what API uses)
      let reviews: any[] = []
      let error: any = null

      // Try customer_id first
      const { data: dataCustomer, error: errorCustomer } = await supabase
        .from('reviews')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })

      if (!errorCustomer && dataCustomer) {
        reviews = dataCustomer
      } else {
        // Try consumer_id (what schema uses)
        const { data: dataConsumer, error: errorConsumer } = await supabase
          .from('reviews')
          .select('*')
          .eq('consumer_id', userId)
          .order('created_at', { ascending: false })

        if (errorConsumer) {
          console.error('Error fetching reviews left:', errorConsumer)
          error = errorConsumer
        } else if (dataConsumer) {
          reviews = dataConsumer
        }
      }

      if (error) {
        setReviewsLeft([])
        return
      }

      // Fetch business and booking data separately
      if (reviews.length > 0) {
        const businessIds = [...new Set(reviews.map(r => r.business_id).filter(Boolean))]
        const bookingIds = [...new Set(reviews.map(r => r.booking_id).filter(Boolean))]

        const [businessesResult, bookingsResult] = await Promise.all([
          businessIds.length > 0 ? supabase
            .from('businesses')
            .select('id, name, city, state')
            .in('id', businessIds) : Promise.resolve({ data: [], error: null }),
          bookingIds.length > 0 ? supabase
            .from('bookings')
            .select('id, requested_date, booking_status')
            .in('id', bookingIds) : Promise.resolve({ data: [], error: null })
        ])

        const businessesMap = (businessesResult.data || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})

        const bookingsMap = (bookingsResult.data || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})

        // Enrich reviews with business and booking data
        const enrichedReviews = reviews.map((review: any) => ({
          ...review,
          business: businessesMap[review.business_id] || null,
          booking: bookingsMap[review.booking_id] || null,
        }))

        setReviewsLeft(enrichedReviews)
      } else {
        setReviewsLeft([])
      }
    } catch (error) {
      console.error('Error in fetchReviewsLeft:', error)
      setReviewsLeft([])
    }
  }

  const fetchAllReviews = async () => {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching all reviews:', error)
        setAllReviews([])
        return
      }

      if (!reviews || reviews.length === 0) {
        setAllReviews([])
        return
      }

      // Fetch related data separately
      const customerIds = [...new Set(reviews
        .map(r => r.customer_id || r.consumer_id)
        .filter(Boolean))]

      const businessIds = [...new Set(reviews
        .map(r => r.business_id)
        .filter(Boolean))]

      const bookingIds = [...new Set(reviews
        .map(r => r.booking_id)
        .filter(Boolean))]

      // Fetch customer profiles
      let customersMap: Record<string, any> = {}
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', customerIds)

        customersMap = (customers || []).reduce((acc: Record<string, any>, c: any) => {
          acc[c.id] = c
          return acc
        }, {})
      }

      // Fetch businesses
      let businessesMap: Record<string, any> = {}
      if (businessIds.length > 0) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, name, city, state')
          .in('id', businessIds)

        businessesMap = (businesses || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})
      }

      // Fetch bookings
      let bookingsMap: Record<string, any> = {}
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, requested_date, booking_status')
          .in('id', bookingIds)

        bookingsMap = (bookings || []).reduce((acc: Record<string, any>, b: any) => {
          acc[b.id] = b
          return acc
        }, {})
      }

      // Enrich reviews with related data
      const enrichedReviews = reviews.map((review: any) => ({
        ...review,
        customer: customersMap[review.customer_id || review.consumer_id] || null,
        business: businessesMap[review.business_id] || null,
        booking: bookingsMap[review.booking_id] || null,
      }))

      setAllReviews(enrichedReviews)
    } catch (error) {
      console.error('Error in fetchAllReviews:', error)
      setAllReviews([])
    }
  }

  const fetchBookingsToReview = async () => {
    if (!userId) return
    
    try {
      // Get completed bookings where user is customer and no review exists
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          business_id,
          requested_date,
          requested_time,
          booking_status,
          business:businesses(id, name, city, state)
        `)
        .eq('customer_id', userId)
        .eq('booking_status', 'completed')
        .order('requested_date', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching bookings to review:', error)
        return
      }

      // Get all existing reviews for these bookings
      const bookingIds = (bookings || []).map(b => b.id)
      if (bookingIds.length === 0) {
        setBookingsToReview([])
        return
      }

      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds)

      const reviewedBookingIds = new Set((existingReviews || []).map(r => r.booking_id))
      
      // Filter out bookings that already have reviews and normalize business data
      const bookingsWithoutReview = (bookings || []).filter(
        booking => !reviewedBookingIds.has(booking.id)
      ).map((booking: any) => {
        // Normalize business - ensure it's a single object, not an array
        let business: any = booking.business
        if (Array.isArray(business)) {
          business = business[0] || undefined
        }
        
        return {
          id: booking.id,
          business_id: booking.business_id,
          requested_date: booking.requested_date,
          requested_time: booking.requested_time,
          booking_status: booking.booking_status,
          business: business || undefined
        } as BookingWithoutReview
      })

      setBookingsToReview(bookingsWithoutReview)
    } catch (error) {
      console.error('Error in fetchBookingsToReview:', error)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to delete review')
        return
      }

      // Refresh reviews
      if (isAdmin) {
        fetchAllReviews()
      } else {
        fetchReviewsReceived()
        fetchReviewsLeft()
      }
    } catch (error) {
      console.error('Error in handleDeleteReview:', error)
      alert('Failed to delete review. Please try again.')
    }
  }

  const handleReviewSubmitted = async (reviewId: string) => {
    setSelectedBookingForReview(null)
    // Refresh data
    fetchReviewsLeft()
    fetchBookingsToReview()
    if (isProvider) {
      fetchReviewsReceived()
    }
  }

  const handleOpenResponseDialog = (review: Review) => {
    setSelectedReviewForResponse(review)
    setResponseText(review.owner_response || '')
    setResponseDialogOpen(true)
  }

  const handleSubmitResponse = async () => {
    if (!selectedReviewForResponse) return

    setSubmittingResponse(true)
    try {
      const response = await fetch(`/api/reviews/${selectedReviewForResponse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_response: responseText.trim() || null })
      })

      if (!response.ok) {
        const error = await response.json()
        showToast(error.error || 'Failed to save response', 'error')
        return
      }

      showToast('Response saved successfully', 'success')
      setResponseDialogOpen(false)
      setSelectedReviewForResponse(null)
      setResponseText('')
      
      // Refresh reviews
      if (isProvider) {
        fetchReviewsReceived()
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      showToast('Failed to save response. Please try again.', 'error')
    } finally {
      setSubmittingResponse(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 4000)
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const filteredReviews = () => {
    let reviews: Review[] = []
    
    if (isAdmin) {
      reviews = allReviews
    } else if (isProvider) {
      if (viewMode === 'received') {
        reviews = reviewsReceived
      } else if (viewMode === 'left') {
        reviews = reviewsLeft
      } else {
        reviews = []
      }
    } else {
      reviews = reviewsLeft
    }

    if (filterRating) {
      reviews = reviews.filter(r => r.rating === filterRating)
    }

    return reviews
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  // Calculate statistics for reviews
  const calculateStats = (reviews: Review[]) => {
    if (reviews.length === 0) return null
    
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviews.filter(r => r.rating === rating).length,
      percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
    }))
    
    return { averageRating, ratingCounts, totalCount: reviews.length }
  }

  const currentStats = calculateStats(filteredReviews())

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header - Premium Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 break-words">Reviews</h1>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg break-words">
            {isAdmin 
              ? 'Moderate and manage all reviews on the platform'
              : isProvider
              ? 'Manage reviews for your business and reviews you\'ve left'
              : 'View and leave reviews for completed services'}
          </p>
        </div>
      </div>

      {/* Rating Statistics - Yelp-like Premium Design */}
      {currentStats && currentStats.totalCount > 0 && (
        <Card className="border border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Overall Rating */}
              <div className="text-center md:text-left">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">{currentStats.averageRating.toFixed(1)}</div>
                <div className="flex items-center justify-center md:justify-start gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 sm:h-6 sm:w-6 ${
                        star <= Math.round(currentStats.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 break-words">
                  Based on {currentStats.totalCount} review{currentStats.totalCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating Breakdown */}
              <div className="col-span-1 md:col-span-2 space-y-2 sm:space-y-3">
                {currentStats.ratingCounts.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[80px]">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 w-4 sm:w-6 text-right">{rating}</span>
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden min-w-0">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2.5 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-600 min-w-[40px] sm:min-w-[50px] text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Tabs (for providers) - Enhanced Design with Mobile Scroll */}
      {isProvider && !isAdmin && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="flex gap-2 sm:gap-3 border-b-2 border-gray-200 pb-1 min-w-fit px-2">
            <button
              onClick={() => setViewMode('received')}
              className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
                viewMode === 'received'
                  ? 'text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews Received <span className="hidden sm:inline">({reviewsReceived.length})</span>
              {viewMode === 'received' && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setViewMode('left')}
              className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
                viewMode === 'left'
                  ? 'text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Reviews <span className="hidden sm:inline">({reviewsLeft.length})</span>
              {viewMode === 'left' && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setViewMode('pending')}
              className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm transition-all duration-200 relative whitespace-nowrap min-h-[44px] ${
                viewMode === 'pending'
                  ? 'text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Reviews <span className="hidden sm:inline">({bookingsToReview.length})</span>
              {viewMode === 'pending' && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter by Rating - Enhanced Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-white rounded-lg border border-gray-200 shadow-sm p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Filter by rating:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterRating === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterRating(null)}
            className={`px-3 sm:px-4 py-2 font-medium transition-all duration-200 min-h-[44px] text-xs sm:text-sm ${
              filterRating === null
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
                : 'border-gray-300 hover:border-orange-400 hover:text-orange-600'
            }`}
          >
            All
          </Button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <Button
              key={rating}
              variant={filterRating === rating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRating(filterRating === rating ? null : rating)}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-medium transition-all duration-200 min-h-[44px] text-xs sm:text-sm ${
                filterRating === rating
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
                  : 'border-gray-300 hover:border-orange-400 hover:text-orange-600'
              }`}
            >
              <Star className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${
                filterRating === rating ? 'fill-white text-white' : 'fill-yellow-400 text-yellow-400'
              }`} />
              {rating}
            </Button>
          ))}
        </div>
      </div>

      {/* Pending Reviews (Bookings that need reviews) - Enhanced Design */}
      {(viewMode === 'pending' || (!isProvider && bookingsToReview.length > 0)) && bookingsToReview.length > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-orange-600" />
              Complete Your Reviews
            </CardTitle>
            <CardDescription className="text-base text-gray-600">Leave reviews for your completed services and help others make informed decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookingsToReview.map((booking) => (
                <Card key={booking.id} className="border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                            <Building className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{booking.business?.name || 'Service Provider'}</h3>
                            {booking.business?.city && booking.business?.state && (
                              <p className="text-sm text-gray-600">{booking.business.city}, {booking.business.state}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-4 pl-15">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {booking.requested_date ? new Date(booking.requested_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }) : 'Date TBD'}
                            </span>
                          </div>
                          {booking.requested_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{booking.requested_time}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => setSelectedBookingForReview(booking.id)}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <Star className="w-5 h-5 mr-2 fill-white" />
                          Leave Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form Modal - Enhanced Design */}
      {selectedBookingForReview && bookingsToReview.find(b => b.id === selectedBookingForReview) && (
        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50/30 to-white shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-orange-600" />
              Write a Review
            </CardTitle>
            <CardDescription className="text-base text-gray-700">
              Share your experience with <span className="font-semibold">{bookingsToReview.find(b => b.id === selectedBookingForReview)?.business?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewForm
              businessId={bookingsToReview.find(b => b.id === selectedBookingForReview)!.business_id}
              businessName={bookingsToReview.find(b => b.id === selectedBookingForReview)!.business?.name || 'Service Provider'}
              bookingId={selectedBookingForReview}
              onReviewSubmitted={handleReviewSubmitted}
            />
            <Button
              variant="outline"
              onClick={() => setSelectedBookingForReview(null)}
              className="mt-6 w-full border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium py-3"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List - Premium Yelp-like Design */}
      {filteredReviews().length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              {isAdmin ? (
                <>All Reviews <span className="hidden sm:inline">({filteredReviews().length})</span></>
              ) : viewMode === 'received' ? (
                <>Reviews Received <span className="hidden sm:inline">({filteredReviews().length})</span></>
              ) : (
                <>My Reviews <span className="hidden sm:inline">({filteredReviews().length})</span></>
              )}
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {filteredReviews().map((review) => {
              const reviewText = review.body || review.comment || ''
              const customer = review.customer || review.consumer
              const isOwnerReview = isProvider && review.business_id && businessIds.includes(review.business_id)

              return (
                <Card key={review.id} className="border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 bg-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md">
                          {((isOwnerReview ? customer?.full_name : review.business?.name) || 'U').charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Review Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                                {isOwnerReview ? (customer?.full_name || 'Anonymous') : (review.business?.name || 'Service Provider')}
                              </h3>
                              <Badge 
                                variant="secondary" 
                                className={`${isOwnerReview ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'} border font-medium text-xs sm:text-sm flex-shrink-0`}
                              >
                                {isOwnerReview ? 'Customer' : 'Your Review'}
                              </Badge>
                            </div>
                            
                            {/* Rating and Date */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                              <div className="flex items-center gap-1">
                                {renderStars(review.rating, 'sm')}
                                <span className="text-xs sm:text-sm font-semibold text-gray-700 ml-1">{review.rating}.0</span>
                              </div>
                              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              {review.booking?.requested_date && (
                                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                  • Service on {new Date(review.booking.requested_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>

                            {/* Business Info (for reviews left) */}
                            {!isOwnerReview && review.business && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-3">
                                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                                <span className="truncate">{review.business.city}, {review.business.state}</span>
                              </div>
                            )}

                            {/* Business Info (for reviews received) */}
                            {isOwnerReview && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-3">
                                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                                <span className="truncate">For {review.business?.name || 'Your Business'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Review Text */}
                        {reviewText && (
                          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100 mb-3 sm:mb-4">
                            <p className="text-gray-800 leading-relaxed text-sm sm:text-base break-words">{reviewText}</p>
                          </div>
                        )}

                        {/* Owner Response */}
                        {review.owner_response && (
                          <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200 mb-3 sm:mb-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="w-4 h-4 text-orange-600" />
                              <span className="font-semibold text-orange-900 text-sm sm:text-base">Owner Response</span>
                              {review.owner_response_at && (
                                <span className="text-xs text-orange-600">
                                  {format(new Date(review.owner_response_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                            <p className="text-orange-900 leading-relaxed text-sm sm:text-base break-words whitespace-pre-wrap">{review.owner_response}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                          {isAdmin && (
                            <>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteReview(review.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                Delete
                              </Button>
                              <span className="text-[10px] sm:text-xs text-gray-400 font-mono truncate">ID: {review.id.substring(0, 8)}...</span>
                            </>
                          )}
                          {isProvider && isOwnerReview && !isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenResponseDialog(review)}
                              className="border-orange-300 hover:bg-orange-50 text-orange-700 hover:border-orange-400 font-medium min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                              {review.owner_response ? 'Edit Response' : 'Reply to Review'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No reviews found</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              {filterRating
                ? `No ${filterRating}-star reviews found. Try adjusting your filter.`
                : viewMode === 'pending'
                ? 'All your completed services have been reviewed! 🎉'
                : isAdmin
                ? 'No reviews on the platform yet. They\'ll appear here once users start leaving reviews.'
                : 'You haven\'t received or left any reviews yet. Leave your first review after completing a service!'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Owner Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {selectedReviewForResponse?.owner_response ? 'Edit Owner Response' : 'Reply to Review'}
            </DialogTitle>
            <DialogDescription>
              Respond to this review as the business owner. Your response will be visible to everyone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReviewForResponse && (
            <div className="space-y-4 py-4">
              {/* Review Display */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {renderStars(selectedReviewForResponse.rating)}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    by {(selectedReviewForResponse.customer || selectedReviewForResponse.consumer)?.full_name || 'Anonymous'}
                  </span>
                </div>
                {(selectedReviewForResponse.body || selectedReviewForResponse.comment) && (
                  <p className="text-sm text-gray-700 mt-2">{selectedReviewForResponse.body || selectedReviewForResponse.comment}</p>
                )}
              </div>

              {/* Response Input */}
              <div className="space-y-2">
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  placeholder="Write a professional response to this review..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="min-h-[120px]"
                  rows={6}
                />
                <p className="text-xs text-gray-500">
                  {responseText.length} characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResponseDialogOpen(false)
                setSelectedReviewForResponse(null)
                setResponseText('')
              }}
              disabled={submittingResponse}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={submittingResponse || !responseText.trim()}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {submittingResponse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md transition-all ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors ${
                toast.type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
              }`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

