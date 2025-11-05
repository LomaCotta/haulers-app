"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Loader2, AlertCircle, X, CheckCircle } from "lucide-react"

interface ReviewFormProps {
  businessId: string
  businessName: string
  bookingId: string
  onReviewSubmitted?: (reviewId: string) => void
}

export function ReviewForm({ businessId, businessName, bookingId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setToast({
        show: true,
        message: 'Please select a rating before submitting',
        type: 'error'
      })
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          bookingId,
          rating,
          comment: comment.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to submit review")
      }

      const review = await response.json()
      
      // Show success toast
      setToast({
        show: true,
        message: 'Review submitted successfully!',
        type: 'success'
      })
      
      // Call callback after a short delay
      setTimeout(() => {
        onReviewSubmitted?.(review.id)
      }, 1500)
    } catch (error) {
      console.error("Review submission failed:", error)
      setToast({
        show: true,
        message: error instanceof Error ? error.message : "Failed to submit review. Please try again.",
        type: 'error'
      })
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return "Poor"
      case 2: return "Fair"
      case 3: return "Good"
      case 4: return "Very Good"
      case 5: return "Excellent"
      default: return ""
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating <= 2) return "text-red-500"
    if (rating === 3) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Rating Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold text-gray-900 mb-4 block">
              Overall Rating *
            </Label>
            <div className="flex items-center gap-6">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= (hoveredRating || rating)
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="group flex flex-col items-center gap-2 transition-all duration-200 hover:scale-110"
                  >
                    <div className={`relative w-14 h-14 rounded-full border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/30' 
                        : 'bg-white border-gray-300 group-hover:border-orange-300'
                    }`}>
                      <Star 
                        className={`absolute inset-0 m-auto w-6 h-6 transition-all duration-200 ${
                          isSelected 
                            ? 'fill-white text-white' 
                            : 'fill-gray-200 text-gray-300 group-hover:fill-orange-200 group-hover:text-orange-300'
                        }`}
                      />
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      isSelected ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      {star}
                    </span>
                  </button>
                )
              })}
            </div>
            {rating > 0 && (
              <div className={`mt-4 flex items-center gap-2 ${getRatingColor(rating)}`}>
                <span className="text-lg font-semibold">{getRatingLabel(rating)}</span>
              </div>
            )}
            {rating === 0 && (
              <p className="mt-2 text-sm text-gray-500">Click a star to rate</p>
            )}
          </div>
        </div>

        {/* Review Text Section */}
        <div className="space-y-3">
          <Label htmlFor="comment" className="text-base font-semibold text-gray-900">
            Your Review
          </Label>
          <Textarea
            id="comment"
            placeholder="Tell others about your experience... What did you like? What could be improved? Your feedback helps others make informed decisions."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className="resize-y min-h-[120px] text-base border-gray-300 focus:border-orange-500 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length} characters {comment.length > 500 && '(recommended: under 500 characters)'}
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={rating === 0 || isSubmitting} 
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting Review...
              </>
            ) : (
              <>
                <Star className="w-5 h-5 mr-2 fill-white" />
                Submit Review
              </>
            )}
          </Button>
          {rating === 0 && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please select a rating to submit your review
            </p>
          )}
        </div>
      </form>

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
    </>
  )
}
