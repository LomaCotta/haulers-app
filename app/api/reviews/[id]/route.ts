import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      // For non-admins, check if they own the business that received the review
      const { data: review } = await supabase
        .from("reviews")
        .select("business_id, customer_id, consumer_id")
        .eq("id", id)
        .single()

      if (!review) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 })
      }

      // Check if user owns the business
      const { data: business } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", review.business_id)
        .eq("owner_id", user.id)
        .single()

      // Or check if user is the reviewer (they can delete their own review)
      const isReviewer = review.customer_id === user.id || review.consumer_id === user.id

      if (!business && !isReviewer) {
        return NextResponse.json({ 
          error: "Unauthorized: Only admins, business owners, or the reviewer can delete reviews" 
        }, { status: 403 })
      }
    }

    // Delete the review
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting review:", error)
      return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Review deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

