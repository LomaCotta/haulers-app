import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { item_name, item_description, item_category, item_type, quantity, unit_price_cents } = body

    if (!item_name || !unit_price_cents || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user is the provider for this booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        business:businesses(*)
      `)
      .eq("id", id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const isProvider = booking.business?.owner_id === user.id
    if (!isProvider) {
      return NextResponse.json({ error: "Only the service provider can add items" }, { status: 403 })
    }

    const total_price_cents = unit_price_cents * quantity

    // Insert booking item
    const { data: newItem, error: itemError } = await supabase
      .from("booking_items")
      .insert({
        booking_id: id,
        item_name: item_name.trim(),
        item_description: item_description?.trim() || null,
        item_category: item_category || 'labor',
        item_type: item_type || item_category || 'labor',
        quantity: quantity,
        unit_price_cents: unit_price_cents,
        total_price_cents: total_price_cents
      })
      .select()
      .single()

    if (itemError) {
      console.error('Error adding booking item:', itemError)
      return NextResponse.json({ error: "Failed to add item" }, { status: 500 })
    }

    // Update booking totals
    const newAdditionalFees = (booking.additional_fees_cents || 0) + total_price_cents
    const basePrice = booking.base_price_cents || 0
    const hourlyRate = booking.hourly_rate_cents || 0
    const estimatedHours = booking.estimated_duration_hours || 1
    const newTotal = basePrice + (hourlyRate * estimatedHours) + newAdditionalFees

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        additional_fees_cents: newAdditionalFees,
        total_price_cents: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: "Item added but failed to update booking total" }, { status: 500 })
    }

    return NextResponse.json(newItem)
  } catch (error) {
    console.error('Error in POST /api/bookings/[id]/items:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        business:businesses(*)
      `)
      .eq("id", id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const isCustomer = booking.customer_id === user.id
    const isProvider = booking.business?.owner_id === user.id

    if (!isCustomer && !isProvider) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get booking items
    const { data: items, error: itemsError } = await supabase
      .from("booking_items")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })

    if (itemsError) {
      return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 })
    }

    return NextResponse.json(items || [])
  } catch (error) {
    console.error('Error in GET /api/bookings/[id]/items:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

