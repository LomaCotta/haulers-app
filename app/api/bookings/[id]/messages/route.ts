import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        *,
        business:businesses(*)
      `)
      .eq("id", id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const isCustomer = booking.customer_id === user.id
    const isProvider = booking.business?.owner_id === user.id

    if (!isCustomer && !isProvider) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    // Verify user has access to this booking
    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        *,
        business:businesses(*)
      `)
      .eq("id", id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const isCustomer = booking.customer_id === user.id
    const isProvider = booking.business?.owner_id === user.id

    if (!isCustomer && !isProvider) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        booking_id: id,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    return NextResponse.json(message)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
