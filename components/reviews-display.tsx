"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, CheckCircle, Building } from "lucide-react"
import { format } from "date-fns"

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  customer: {
    full_name: string
  }
  booking: {
    id: string
  }
  owner_response?: string | null
  owner_response_at?: string | null
}

interface ReviewsDisplayProps {
  reviews: Review[]
  businessId: string
}

export function ReviewsDisplay({ reviews, businessId }: ReviewsDisplayProps) {
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }))

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4", 
      lg: "h-5 w-5"
    }
    
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center mb-2">
                {renderStars(Math.round(averageRating), "lg")}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {ratingCounts.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center space-x-2">
                  <span className="text-sm w-8">{rating}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{review.customer.full_name}</p>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating, "sm")}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-xs font-normal px-2 py-0.5">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified Booking
                  </Badge>
                </div>
                
                {review.comment && (
                  <p className="text-sm text-muted-foreground mb-3">{review.comment}</p>
                )}
                
                {/* Owner Response */}
                {review.owner_response && (
                  <div className="mt-3 bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-3.5 h-3.5 text-orange-600" />
                      <span className="font-semibold text-orange-900 text-xs">Owner Response</span>
                      {review.owner_response_at && (
                        <span className="text-xs text-orange-600">
                          {format(new Date(review.owner_response_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <p className="text-orange-900 text-sm leading-relaxed whitespace-pre-wrap break-words">{review.owner_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No reviews yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
