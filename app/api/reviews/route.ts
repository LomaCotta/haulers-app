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
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ 
        error: "Booking not found or you don't have access" 
      }, { status: 404 })
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
    const canReview = booking.booking_status === 'completed' || hasPaidInvoice

    if (!canReview) {
      return NextResponse.json({ 
        error: "Booking must be completed or have a paid invoice to be reviewed" 
      }, { status: 400 })
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
    // Note: Schema uses consumer_id and body, not customer_id and comment
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        business_id: businessId,
        booking_id: bookingId,
        consumer_id: user.id, // Schema uses consumer_id
        rating,
        body: comment?.trim() || null, // Schema uses body, not comment
      })
      .select("*")
      .single()

    if (error) {
      console.error("Review creation error:", error)
      return NextResponse.json({ 
        error: "Failed to create review",
        details: error.message 
      }, { status: 500 })
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
