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

    // Delete the review permanently
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

export async function PATCH(
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
    const body = await request.json()
    const { is_hidden, owner_response } = body

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isAdmin = profile?.role === "admin"

    // Get the review to check ownership
    const { data: review } = await supabase
      .from("reviews")
      .select("business_id")
      .eq("id", id)
      .single()

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Check if user owns the business (for owner responses)
    let isBusinessOwner = false
    if (!isAdmin && owner_response !== undefined) {
      const { data: business } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", review.business_id)
        .eq("owner_id", user.id)
        .single()
      
      isBusinessOwner = !!business
    }

    // Only admins can hide/show reviews
    if (is_hidden !== undefined && !isAdmin) {
      return NextResponse.json({ 
        error: "Unauthorized: Only admins can hide/show reviews" 
      }, { status: 403 })
    }

    // Only business owners or admins can add owner responses
    if (owner_response !== undefined && !isAdmin && !isBusinessOwner) {
      return NextResponse.json({ 
        error: "Unauthorized: Only business owners or admins can add responses" 
      }, { status: 403 })
    }

    // Build update object
    const updateData: any = {}
    if (is_hidden !== undefined) {
      updateData.is_hidden = is_hidden
    }
    if (owner_response !== undefined) {
      updateData.owner_response = owner_response || null
      updateData.owner_response_at = owner_response ? new Date().toISOString() : null
    }

    // Update the review
    const { data: updatedReview, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating review:", error)
      return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
    }

    return NextResponse.json(updatedReview)
  } catch (error) {
    console.error("Error in PATCH review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
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

    const { data: review, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error("Error in GET review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

