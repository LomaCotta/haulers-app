'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { 
  Star, 
  MessageSquare, 
  Calendar, 
  Building, 
  User, 
  Trash2, 
  Eye, 
  EyeOff,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  ArrowRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  consumer_id: string
  business_id: string
  rating: number
  body: string | null
  created_at: string
  is_hidden: boolean
  owner_response: string | null
  owner_response_at: string | null
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

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [deletingReview, setDeletingReview] = useState<string | null>(null)
  const [hidingReview, setHidingReview] = useState<string | null>(null)
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  const supabase = createClient()

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      
      // Fetch all reviews (admin can see all, including hidden ones)
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching reviews:', error)
        setReviews([])
        return
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([])
        return
      }

      // Fetch related data separately
      const customerIds = [...new Set(reviewsData.map(r => r.consumer_id).filter(Boolean))]
      const businessIds = [...new Set(reviewsData.map(r => r.business_id).filter(Boolean))]
      const bookingIds = [...new Set(reviewsData.map(r => r.booking_id).filter(Boolean))]

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
      const enrichedReviews = reviewsData.map((review: any) => ({
        ...review,
        customer: customersMap[review.consumer_id] || null,
        consumer: customersMap[review.consumer_id] || null,
        business: businessesMap[review.business_id] || null,
        booking: bookingsMap[review.booking_id] || null,
      }))

      setReviews(enrichedReviews)
    } catch (error) {
      console.error('Error in fetchReviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this review? This action cannot be undone and the review will be completely removed from the system.')) {
      return
    }

    setDeletingReview(reviewId)
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        showToast(error.error || 'Failed to delete review', 'error')
        return
      }

      showToast('Review permanently deleted', 'success')
      fetchReviews()
    } catch (error) {
      console.error('Error deleting review:', error)
      showToast('Failed to delete review. Please try again.', 'error')
    } finally {
      setDeletingReview(null)
    }
  }

  const handleToggleHide = async (reviewId: string, currentHidden: boolean) => {
    setHidingReview(reviewId)
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: !currentHidden })
      })

      if (!response.ok) {
        const error = await response.json()
        showToast(error.error || 'Failed to update review', 'error')
        return
      }

      showToast(
        currentHidden ? 'Review is now visible to everyone' : 'Review is now hidden from public view',
        'success'
      )
      fetchReviews()
    } catch (error) {
      console.error('Error toggling hide:', error)
      showToast('Failed to update review. Please try again.', 'error')
    } finally {
      setHidingReview(null)
    }
  }

  const handleOpenResponseDialog = (review: Review) => {
    setSelectedReview(review)
    setResponseText(review.owner_response || '')
    setResponseDialogOpen(true)
  }

  const handleSubmitResponse = async () => {
    if (!selectedReview) return

    setSubmittingResponse(true)
    try {
      const response = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_response: responseText.trim() || null })
      })

      if (!response.ok) {
        const error = await response.json()
        showToast(error.error || 'Failed to save response', 'error')
        return
      }

      showToast('Owner response saved successfully', 'success')
      setResponseDialogOpen(false)
      setSelectedReview(null)
      setResponseText('')
      fetchReviews()
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const filteredReviews = reviews.filter((review) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        review.business?.name?.toLowerCase().includes(query) ||
        review.customer?.full_name?.toLowerCase().includes(query) ||
        review.consumer?.full_name?.toLowerCase().includes(query) ||
        review.body?.toLowerCase().includes(query) ||
        review.owner_response?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews Management</h1>
          <p className="text-gray-600 mt-2">Manage all reviews, hide inappropriate content, and oversee owner responses</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900">{reviews.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visible Reviews</p>
                <p className="text-3xl font-bold text-green-600">{reviews.filter(r => !r.is_hidden).length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hidden Reviews</p>
                <p className="text-3xl font-bold text-orange-600">{reviews.filter(r => r.is_hidden).length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Responses</p>
                <p className="text-3xl font-bold text-purple-600">{reviews.filter(r => r.owner_response).length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search reviews by customer name, business name, or review content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const customer = review.customer || review.consumer
            
            return (
              <Card 
                key={review.id} 
                className={`border-2 shadow-lg transition-all duration-200 ${
                  review.is_hidden 
                    ? 'border-orange-200 bg-orange-50/30' 
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {(customer?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-bold text-lg text-gray-900 truncate">
                              {customer?.full_name || 'Anonymous'}
                            </h3>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                              Customer
                            </Badge>
                            {review.is_hidden && (
                              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Hidden
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mb-2">
                            {renderStars(review.rating)}
                            <span className="text-sm font-semibold text-gray-700">{review.rating}.0</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{review.business?.name || 'Unknown Business'}</span>
                            {review.business?.city && review.business?.state && (
                              <span className="text-gray-500">• {review.business.city}, {review.business.state}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Review Text */}
                      {review.body && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{review.body}</p>
                        </div>
                      )}

                      {/* Owner Response */}
                      {review.owner_response && (
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold text-orange-900">Owner Response</span>
                            {review.owner_response_at && (
                              <span className="text-xs text-orange-600">
                                {format(new Date(review.owner_response_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          <p className="text-orange-900 leading-relaxed whitespace-pre-wrap break-words">{review.owner_response}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleHide(review.id, review.is_hidden)}
                          disabled={hidingReview === review.id}
                          className={review.is_hidden ? 'border-green-300 hover:bg-green-50 text-green-700' : 'border-orange-300 hover:bg-orange-50 text-orange-700'}
                        >
                          {hidingReview === review.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {review.is_hidden ? 'Showing...' : 'Hiding...'}
                            </>
                          ) : (
                            <>
                              {review.is_hidden ? (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Show Review
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Hide Review
                                </>
                              )}
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResponseDialog(review)}
                          className="border-orange-300 hover:bg-orange-50 text-orange-700 hover:border-orange-400"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {review.owner_response ? 'Edit Response' : 'Add Response'}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReview(review.id)}
                          disabled={deletingReview === review.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deletingReview === review.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>

                        <span className="text-xs text-gray-400 font-mono ml-auto">
                          ID: {review.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="py-16 text-center">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'No reviews match your search. Try a different query.' : 'No reviews on the platform yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Owner Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {selectedReview?.owner_response ? 'Edit Owner Response' : 'Add Owner Response'}
            </DialogTitle>
            <DialogDescription>
              Respond to this review as the business owner. Your response will be visible to everyone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4 py-4">
              {/* Review Display */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {renderStars(selectedReview.rating)}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    by {(selectedReview.customer || selectedReview.consumer)?.full_name || 'Anonymous'}
                  </span>
                </div>
                {selectedReview.body && (
                  <p className="text-sm text-gray-700 mt-2">{selectedReview.body}</p>
                )}
              </div>

              {/* Response Input */}
              <div className="space-y-2">
                <Label htmlFor="response">Owner Response</Label>
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
                setSelectedReview(null)
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

