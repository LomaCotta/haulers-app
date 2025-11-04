import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { computeTotalDue } from "@/lib/booking/computeTotalDue"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const bookingId = body?.bookingId || request.nextUrl.searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
    }

    // Load booking with relations
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Only provider/admin can mutate totals
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', booking.business_id)
      .maybeSingle()

    const isProvider = business?.owner_id === user.id
    const isAdmin = profile?.role === 'admin'
    if (!isProvider && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Compute totals from current service_details/breakdown
    const totals = computeTotalDue(booking)
    const base_price_cents = totals.baseCents + totals.additionalBilledCents + totals.destinationCents + totals.heavyItemsCents + totals.packingCents + totals.stairsCents + (totals.storageCents > 0 ? totals.storageCents : 0) + (totals.insuranceCents > 0 ? totals.insuranceCents : 0)
    const total_price_cents = totals.totalDueCents

    const { data: updated, error: updErr } = await supabase
      .from('bookings')
      .update({ base_price_cents, total_price_cents, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .maybeSingle()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking: updated, totals })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


