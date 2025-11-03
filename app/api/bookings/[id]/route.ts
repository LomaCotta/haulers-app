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
    const {
      requested_date,
      requested_time,
      service_address,
      service_city,
      service_state,
      service_postal_code,
      service_details,
      customer_notes,
      business_notes,
      hourly_rate_cents,
      estimated_duration_hours,
      base_price_cents,
      additional_fees_cents,
      total_price_cents,
      booking_status,
      payment_status
    } = body

    // Verify user has access to this booking and check if editing is allowed
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

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isProvider = booking.business?.owner_id === user.id
    const isAdmin = profile?.role === 'admin'
    const isCustomer = booking.customer_id === user.id

    // Only providers and admins can edit bookings
    if (!isProvider && !isAdmin) {
      return NextResponse.json({ 
        error: "Only the service provider or admin can edit bookings" 
      }, { status: 403 })
    }

    // Prevent editing after payment is completed
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ 
        error: "Cannot edit booking after payment has been completed" 
      }, { status: 400 })
    }

    // Build update data object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (requested_date !== undefined) updateData.requested_date = requested_date
    if (requested_time !== undefined) updateData.requested_time = requested_time
    if (service_address !== undefined) updateData.service_address = service_address
    if (service_city !== undefined) updateData.service_city = service_city
    if (service_state !== undefined) updateData.service_state = service_state
    if (service_postal_code !== undefined) updateData.service_postal_code = service_postal_code
    
    // Handle service_details - merge with existing to preserve other fields
    if (service_details !== undefined) {
      const currentServiceDetails = booking.service_details || {}
      
      // Deep merge - but explicitly set removed items to empty/null to ensure they're cleared
      updateData.service_details = {
        ...currentServiceDetails,
        ...service_details
      }
      
      // CRITICAL: If addresses changed, recalculate destination fee and trip distance
      const addressesChanged = 
        (service_details.pickup_addresses && JSON.stringify(service_details.pickup_addresses) !== JSON.stringify(currentServiceDetails.pickup_addresses)) ||
        (service_details.delivery_addresses && JSON.stringify(service_details.delivery_addresses) !== JSON.stringify(currentServiceDetails.delivery_addresses)) ||
        (service_details.from_address && JSON.stringify(service_details.from_address) !== JSON.stringify(currentServiceDetails.from_address)) ||
        (service_details.to_address && JSON.stringify(service_details.to_address) !== JSON.stringify(currentServiceDetails.to_address))
      
      if (addressesChanged && updateData.service_details.destination_fee === undefined && updateData.service_details.trip_distance_miles === undefined) {
        // Addresses were updated but destination fee wasn't recalculated - need to recalculate
        // This will be handled by the frontend validation, but if it fails, we'll use existing values
        console.log('Addresses changed - destination fee should be recalculated by frontend')
      }
      
      // Explicitly handle removals - ensure empty arrays and zeros are saved
      // Heavy items: if empty array is provided, clear all heavy item fields
      if (service_details.heavy_items && Array.isArray(service_details.heavy_items) && service_details.heavy_items.length === 0) {
        updateData.service_details.heavy_items = []
        updateData.service_details.heavy_items_count = 0
        updateData.service_details.heavy_item_band = null
        updateData.service_details.heavy_item_price_cents = 0
      }
      
      // Stairs: if set to 0, ensure it's saved as 0
      if (service_details.stairs_flights === 0 || service_details.stairs_flights === '0') {
        updateData.service_details.stairs_flights = 0
        updateData.service_details.stairs = false
      }
      
      // Packing: if set to 'none', clear packing rooms
      if (service_details.packing_help === 'none' || service_details.packing === 'none') {
        updateData.service_details.packing_help = 'none'
        updateData.service_details.packing = 'none'
        updateData.service_details.packing_rooms = 0
      }
      
      // Debug: Log what we're saving
      console.log('Updating service_details:', {
        stairs_flights: updateData.service_details.stairs_flights,
        stairs: updateData.service_details.stairs,
        heavy_items: updateData.service_details.heavy_items,
        heavy_items_count: updateData.service_details.heavy_items_count,
        heavy_item_band: updateData.service_details.heavy_item_band,
        heavy_item_price_cents: updateData.service_details.heavy_item_price_cents,
        packing_help: updateData.service_details.packing_help,
        packing_rooms: updateData.service_details.packing_rooms
      })
      
      // CRITICAL: Recalculate total_price_cents based on updated breakdown
      // Get breakdown values from service_details
      const breakdown = updateData.service_details.breakdown || {}
      const baseHourly = breakdown.base_hourly || breakdown.baseHourly || breakdown.base_price_cents || booking.base_price_cents || 0
      const baseHours = 3
      const estimatedDuration = updateData.service_details.estimated_duration_hours || booking.estimated_duration_hours || 3
      const moverTeam = updateData.service_details.mover_team || updateData.service_details.crew_size || booking.service_details?.mover_team || 2
      const hourlyRateCents = hourly_rate_cents !== undefined ? hourly_rate_cents : (booking.hourly_rate_cents || 0)
      const teamHourlyRateCents = baseHourly > 0 && baseHours > 0 ? Math.round(baseHourly / baseHours) : hourlyRateCents
      
      // Calculate breakdown components (all in cents)
      const basePayment = baseHourly
      const additionalHours = estimatedDuration > baseHours ? Math.round(teamHourlyRateCents * (estimatedDuration - baseHours)) : 0
      
      // CRITICAL: Use updated destination_fee from service_details if addresses changed, otherwise use breakdown
      let destinationFee = 0
      if (updateData.service_details.destination_fee !== undefined) {
        // Frontend calculated new destination fee - use it (it's in dollars as string, or cents as number)
        const feeValue = typeof updateData.service_details.destination_fee === 'string' 
          ? parseFloat(updateData.service_details.destination_fee.replace(/[$,]/g, '')) 
          : updateData.service_details.destination_fee
        if (!isNaN(feeValue) && feeValue > 0) {
          // If value > 100, assume it's already in cents, otherwise assume dollars
          destinationFee = (feeValue > 100) ? Math.round(feeValue) : Math.round(feeValue * 100)
        }
      } else if (breakdown.destination_fee) {
        destinationFee = typeof breakdown.destination_fee === 'number' 
          ? Math.round(breakdown.destination_fee * 100) 
          : Math.round(parseFloat(String(breakdown.destination_fee)) * 100)
      } else if (currentServiceDetails.destination_fee) {
        // Fallback to current service details
        const feeValue = typeof currentServiceDetails.destination_fee === 'string' 
          ? parseFloat(currentServiceDetails.destination_fee.replace(/[$,]/g, '')) 
          : currentServiceDetails.destination_fee
        if (!isNaN(feeValue) && feeValue > 0) {
          destinationFee = (feeValue > 100) ? Math.round(feeValue) : Math.round(feeValue * 100)
        }
      }
      
      // Heavy items cost (from array if available)
      let heavyItemsCost = 0
      if (updateData.service_details.heavy_items && Array.isArray(updateData.service_details.heavy_items) && updateData.service_details.heavy_items.length > 0) {
        heavyItemsCost = updateData.service_details.heavy_items.reduce((sum: number, item: any) => {
          const priceCents = item.price_cents || 0
          const count = item.count || 0
          return sum + (priceCents * count)
        }, 0)
      } else if (updateData.service_details.heavy_item_price_cents && updateData.service_details.heavy_items_count > 0) {
        heavyItemsCost = updateData.service_details.heavy_item_price_cents * updateData.service_details.heavy_items_count
      } else if (breakdown.heavy_items) {
        heavyItemsCost = typeof breakdown.heavy_items === 'number' ? Math.round(breakdown.heavy_items * 100) : 0
      }
      
      // Packing cost
      let packingCost = 0
      if (updateData.service_details.packing_help !== 'none' && updateData.service_details.packing !== 'none') {
        packingCost = breakdown.packing ? (typeof breakdown.packing === 'number' ? Math.round(breakdown.packing * 100) : 0) : 0
      }
      
      // Stairs cost
      let stairsCost = 0
      if (updateData.service_details.stairs_flights > 0 && updateData.service_details.stairs !== false) {
        stairsCost = breakdown.stairs ? (typeof breakdown.stairs === 'number' ? Math.round(breakdown.stairs * 100) : 0) : 0
      }
      
      // Storage and insurance - only include if > 0 (meaning they're applicable)
      const storageCost = breakdown.storage ? (typeof breakdown.storage === 'number' ? Math.round(breakdown.storage * 100) : 0) : 0
      const insuranceCost = breakdown.insurance ? (typeof breakdown.insurance === 'number' ? Math.round(breakdown.insurance * 100) : 0) : 0
      
      // Calculate breakdown subtotal - only include items that are displayed (> 0)
      // Storage and insurance only included if > 0 (meaning they're displayed in the breakdown)
      const breakdownSubtotal = basePayment + additionalHours + destinationFee + heavyItemsCost + packingCost + stairsCost + 
        (storageCost > 0 ? storageCost : 0) + 
        (insuranceCost > 0 ? insuranceCost : 0)
      
      // Get additional fees and booking items
      const currentAdditionalFees = additional_fees_cents !== undefined ? additional_fees_cents : (booking.additional_fees_cents || 0)
      
      // Get booking items total
      const { data: bookingItems } = await supabase
        .from('booking_items')
        .select('total_price_cents')
        .eq('booking_id', id)
      
      const bookingItemsTotal = bookingItems?.reduce((sum, item) => sum + (item.total_price_cents || 0), 0) || 0
      
      // Calculate total due
      const recalculatedTotal = breakdownSubtotal + currentAdditionalFees + bookingItemsTotal
      
      // Update base_price_cents and total_price_cents
      updateData.base_price_cents = breakdownSubtotal
      updateData.total_price_cents = recalculatedTotal
      
      console.log('Recalculated totals:', {
        breakdownSubtotal,
        currentAdditionalFees,
        bookingItemsTotal,
        recalculatedTotal
      })
    }
    if (customer_notes !== undefined) updateData.customer_notes = customer_notes
    if (business_notes !== undefined) updateData.business_notes = business_notes
    if (hourly_rate_cents !== undefined) updateData.hourly_rate_cents = hourly_rate_cents
    if (estimated_duration_hours !== undefined) updateData.estimated_duration_hours = estimated_duration_hours
    if (base_price_cents !== undefined && service_details === undefined) updateData.base_price_cents = base_price_cents
    if (additional_fees_cents !== undefined) updateData.additional_fees_cents = additional_fees_cents
    if (total_price_cents !== undefined && service_details === undefined) updateData.total_price_cents = total_price_cents
    if (booking_status !== undefined && isAdmin) updateData.booking_status = booking_status
    if (payment_status !== undefined && isAdmin) updateData.payment_status = payment_status

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ 
        error: "Failed to update booking",
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      booking: updatedBooking 
    })
  } catch (error) {
    console.error('Error in PATCH /api/bookings/[id]:', error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

