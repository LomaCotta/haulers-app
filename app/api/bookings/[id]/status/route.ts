import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
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
    const { booking_status, actual_start_time, actual_end_time } = body

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

    const isProvider = booking.business?.owner_id === user.id
    const isCustomer = booking.customer_id === user.id

    // Only providers can update booking status
    if (!isProvider) {
      return NextResponse.json({ error: "Only the service provider can update booking status" }, { status: 403 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (booking_status) {
      updateData.booking_status = booking_status
      
      // Set timestamps based on status
      if (booking_status === 'in_progress' && !booking.actual_start_time) {
        updateData.actual_start_time = new Date().toISOString()
      } else if (booking_status === 'completed' && !booking.actual_end_time) {
        updateData.actual_end_time = new Date().toISOString()
        updateData.completed_at = new Date().toISOString()
      } else if (booking_status === 'confirmed' && !booking.confirmed_at) {
        updateData.confirmed_at = new Date().toISOString()
      }
    }

    if (actual_start_time !== undefined) {
      updateData.actual_start_time = actual_start_time || null
    }

    if (actual_end_time !== undefined) {
      updateData.actual_end_time = actual_end_time || null
      if (actual_end_time) {
        updateData.completed_at = new Date().toISOString()
      }
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error in PATCH /api/bookings/[id]/status:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

