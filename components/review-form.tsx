"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Star } from "lucide-react"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

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
        throw new Error("Failed to submit review")
      }

      const review = await response.json()
      onReviewSubmitted?.(review.id)
    } catch (error) {
      console.error("Review submission failed:", error)
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Review {businessName}</CardTitle>
        <CardDescription>
          Share your experience to help other customers make informed decisions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Overall Rating</Label>
            <RadioGroup
              value={rating.toString()}
              onValueChange={(value) => setRating(parseInt(value))}
              className="flex space-x-4"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star} className="flex items-center space-x-2">
                  <RadioGroupItem value={star.toString()} id={`rating-${star}`} />
                  <Label htmlFor={`rating-${star}`} className="flex items-center space-x-1 cursor-pointer">
                    <Star className="h-5 w-5 fill-current" />
                    <span>{star}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {getRatingLabel(rating)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={rating === 0 || isSubmitting} className="w-full">
            {isSubmitting ? "Submitting Review..." : "Submit Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
