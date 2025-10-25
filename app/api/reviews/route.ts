import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { businessId, bookingId, rating, comment } = await request.json()

    if (!businessId || !bookingId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid review data" }, { status: 400 })
    }

    // Verify the booking exists and belongs to the user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .eq("business_id", businessId)
      .eq("status", "completed")
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ 
        error: "Booking not found or not completed" 
      }, { status: 404 })
    }

    // Check if user already reviewed this booking
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .single()

    if (existingReview) {
      return NextResponse.json({ 
        error: "You have already reviewed this booking" 
      }, { status: 400 })
    }

    // Create the review
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        business_id: businessId,
        booking_id: bookingId,
        customer_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select(`
        *,
        customer:profiles!reviews_customer_id_fkey(*)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
    }

    return NextResponse.json(review)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")

    if (!businessId) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        *,
        customer:profiles!reviews_customer_id_fkey(*),
        booking:bookings(*)
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    return NextResponse.json(reviews)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
