import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { computeTotalDue } from "@/lib/booking/computeTotalDue"

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
      
      // CRITICAL: Extract team size FIRST before any merges
      const incomingTeamSize = Number(service_details.mover_team || service_details.crew_size || 0)
      const normalizedTeam = (!isNaN(incomingTeamSize) && incomingTeamSize > 0) 
        ? Math.min(8, Math.max(1, incomingTeamSize)) 
        : Number(currentServiceDetails.mover_team || currentServiceDetails.crew_size || 2)
      
      // Merge service_details FIRST
      updateData.service_details = {
        ...currentServiceDetails,
        ...service_details
      }
      
      // CRITICAL: FORCE set team size AFTER merge - this ensures it's always correct
      updateData.service_details.mover_team = normalizedTeam
      updateData.service_details.crew_size = normalizedTeam
      
      console.log('🔧 API: Setting team size:', {
        incoming: { mover_team: service_details.mover_team, crew_size: service_details.crew_size },
        normalized: normalizedTeam,
        final: { mover_team: updateData.service_details.mover_team, crew_size: updateData.service_details.crew_size }
      })

      // Enforce hourly rate from provider tier for this team size (read from consolidated config)
      try {
        if (normalizedTeam > 0) {
          const { data: prov } = await supabase
            .from('movers_providers')
            .select('id')
            .eq('business_id', booking.business_id)
            .maybeSingle()
          if (prov?.id) {
            // Read from consolidated config (preferred)
            const { data: cfg } = await supabase
              .from('movers_provider_config')
              .select('tiers')
              .eq('provider_id', prov.id)
              .maybeSingle()
            
            let tier: any = null
            if (cfg?.tiers && Array.isArray(cfg.tiers)) {
              const tiers = cfg.tiers as Array<{ crew_size: number; hourly_rate_cents?: number; min_hours?: number; base_rate_cents?: number }>
              const exact = tiers.find(t => t.crew_size === normalizedTeam)
              tier = exact || tiers.reduce((best, t) => 
                (Math.abs(t.crew_size - normalizedTeam) < Math.abs((best?.crew_size ?? Infinity) - normalizedTeam) ? t : best), 
                tiers[0]
              )
            }
            
            // Fallback to legacy table if consolidated config missing
            if (!tier) {
              const { data: legacyTier } = await supabase
                .from('movers_pricing_tiers')
                .select('hourly_rate_cents, min_hours, base_rate_cents')
                .eq('provider_id', prov.id)
                .eq('crew_size', normalizedTeam)
                .maybeSingle()
              tier = legacyTier
            }
            
            if (tier) {
              // tier.hourly_rate_cents IS the team rate (not per mover), use it directly
              let teamHourlyRate = 0
              if (typeof tier.hourly_rate_cents === 'number' && tier.hourly_rate_cents > 0) {
                teamHourlyRate = tier.hourly_rate_cents
              } else if (typeof tier.base_rate_cents === 'number' && tier.base_rate_cents > 0) {
                const minHrs = (tier.min_hours && tier.min_hours > 0) ? tier.min_hours : 3
                teamHourlyRate = Math.round(tier.base_rate_cents / minHrs)
              }
              
              if (teamHourlyRate > 0) {
                updateData.hourly_rate_cents = teamHourlyRate
                updateData.service_details.hourly_rate_cents = teamHourlyRate
                updateData.service_details.hourly_rate = teamHourlyRate / 100
                // CRITICAL: Mark that hourly_rate_cents is a TEAM rate (not per-mover)
                updateData.service_details.hourly_rate_is_team_rate = true
              }
            }
            
            if (tier?.min_hours != null && tier.min_hours > 0) {
              updateData.estimated_duration_hours = Math.max(
                tier.min_hours,
                estimated_duration_hours ?? booking.estimated_duration_hours ?? tier.min_hours
              )
              updateData.service_details.estimated_duration_hours = updateData.estimated_duration_hours
            }
          }
        }
      } catch (_) {}

      // Explicit removals
      if (Array.isArray(updateData.service_details.heavy_items) && updateData.service_details.heavy_items.length === 0) {
        updateData.service_details.heavy_items_count = 0
        updateData.service_details.heavy_item_band = null
        updateData.service_details.heavy_item_price_cents = 0
      }
      if (updateData.service_details.stairs_flights === 0 || updateData.service_details.stairs_flights === '0') {
        updateData.service_details.stairs_flights = 0
        updateData.service_details.stairs = false
      }
      if (updateData.service_details.packing_help === 'none' || updateData.service_details.packing === 'none') {
        updateData.service_details.packing_help = 'none'
        updateData.service_details.packing = 'none'
        updateData.service_details.packing_rooms = 0
      }
      // CRITICAL: Only set packing_rooms for Full Packing Kit (kit option)
      // Pay as You Go (paygo) and I will pack myself (none) don't use room count - set to 0
      if (updateData.service_details.packing_help === 'paygo' || updateData.service_details.packing === 'paygo') {
        updateData.service_details.packing_rooms = 0
      }
      if (updateData.service_details.packing_help === 'kit' && (!updateData.service_details.packing_rooms || updateData.service_details.packing_rooms === 0)) {
        // If kit is selected but no rooms, keep existing rooms or default to 0
        updateData.service_details.packing_rooms = booking.service_details?.packing_rooms || 0
      }

      // CRITICAL: Recalculate packing cost based on packing_rooms when packing_help === 'kit'
      // OR calculate from packing_materials when packing_help === 'paygo'
      let recalculatedPackingCents = 0
      if (updateData.service_details.packing_help === 'kit' && updateData.service_details.packing_rooms > 0) {
        try {
          const { data: prov } = await supabase
            .from('movers_providers')
            .select('id')
            .eq('business_id', booking.business_id)
            .maybeSingle()
          if (prov?.id) {
            // Read packing config from consolidated config
            const { data: cfg } = await supabase
              .from('movers_provider_config')
              .select('packing')
              .eq('provider_id', prov.id)
              .maybeSingle()
            
            if (cfg?.packing?.per_room_cents) {
              const perRoomCents = cfg.packing.per_room_cents
              recalculatedPackingCents = Math.round(perRoomCents * updateData.service_details.packing_rooms)
            } else {
              // Fallback to default $99 per room if no config
              recalculatedPackingCents = Math.round(99 * 100 * updateData.service_details.packing_rooms)
            }
          }
        } catch (err) {
          console.error('Error fetching packing config:', err)
          // Fallback to default $99 per room
          recalculatedPackingCents = Math.round(99 * 100 * updateData.service_details.packing_rooms)
        }
      } else if (updateData.service_details.packing_help === 'paygo') {
        // CRITICAL: Pay as You Go - calculate cost from selected materials only
        const packingMaterials = updateData.service_details.packing_materials || []
        if (Array.isArray(packingMaterials) && packingMaterials.length > 0) {
          recalculatedPackingCents = packingMaterials.reduce((sum: number, mat: any) => {
            const quantity = mat.quantity || 1
            const priceCents = mat.price_cents || 0
            return sum + (priceCents * quantity)
          }, 0)
        } else {
          // No materials selected - cost is $0
          recalculatedPackingCents = 0
        }
      }

      // CRITICAL: Update breakdown with recalculated packing cost BEFORE calling computeTotalDue
      // This ensures computeTotalDue reads the correct packing cost
      const existingBreakdown = updateData.service_details.breakdown || booking.service_details?.breakdown || {}
      if (recalculatedPackingCents >= 0) {
        // Always update packing cost (even if 0) for kit and paygo
        existingBreakdown.packing_cost_cents = recalculatedPackingCents
        existingBreakdown.packing_cost = recalculatedPackingCents / 100
        existingBreakdown.packing = recalculatedPackingCents / 100
        existingBreakdown.packingCost = recalculatedPackingCents / 100
      } else if (updateData.service_details.packing_help === 'none' || updateData.service_details.packing === 'none') {
        // Clear packing cost if packing was removed
        existingBreakdown.packing_cost_cents = 0
        existingBreakdown.packing_cost = 0
        existingBreakdown.packing = 0
        existingBreakdown.packingCost = 0
      }
      updateData.service_details.breakdown = existingBreakdown

      // Recalculate totals using shared utility (ensures team size affects price)
      const bookingForCalc = {
        ...booking,
        service_details: updateData.service_details,
        hourly_rate_cents: (updateData.hourly_rate_cents ?? hourly_rate_cents) ?? booking.hourly_rate_cents,
        estimated_duration_hours: (updateData.estimated_duration_hours ?? estimated_duration_hours) ?? booking.estimated_duration_hours,
        additional_fees_cents: additional_fees_cents ?? booking.additional_fees_cents,
      }
      const totals = computeTotalDue(bookingForCalc)
      updateData.base_price_cents = totals.baseCents + totals.additionalBilledCents + totals.destinationCents + totals.heavyItemsCents + totals.packingCents + totals.stairsCents + (totals.storageCents > 0 ? totals.storageCents : 0) + (totals.insuranceCents > 0 ? totals.insuranceCents : 0)
      updateData.total_price_cents = totals.totalDueCents
      
      // CRITICAL: Update breakdown to reflect new team size and rates
      updateData.service_details.breakdown = {
        ...existingBreakdown,
        mover_team: normalizedTeam,
        crew_size: normalizedTeam,
        hourly_rate_cents: updateData.hourly_rate_cents,
        hourly_rate: updateData.hourly_rate_cents ? updateData.hourly_rate_cents / 100 : undefined,
        per_mover_rate_cents: totals.perMoverRateCents,
        per_mover_rate: totals.perMoverRateCents ? totals.perMoverRateCents / 100 : undefined,
        team_hourly_cents: totals.teamHourlyCents,
        team_hourly_rate: totals.teamHourlyCents ? totals.teamHourlyCents / 100 : undefined,
        base_hourly_cents: totals.teamHourlyCents,
        base_hourly: totals.teamHourlyCents ? totals.teamHourlyCents / 100 : undefined,
      }
      
      // CRITICAL: Update packing cost in breakdown if we recalculated it (ensure it's still there after breakdown update)
      if (recalculatedPackingCents >= 0) {
        // Always set packing cost (even if 0) for kit and paygo
        updateData.service_details.breakdown.packing_cost_cents = recalculatedPackingCents
        updateData.service_details.breakdown.packing_cost = recalculatedPackingCents / 100
        updateData.service_details.breakdown.packing = recalculatedPackingCents / 100
        updateData.service_details.breakdown.packingCost = recalculatedPackingCents / 100
      } else if (updateData.service_details.packing_help === 'none' || updateData.service_details.packing === 'none') {
        // Clear packing cost if packing was removed
        updateData.service_details.breakdown.packing_cost_cents = 0
        updateData.service_details.breakdown.packing_cost = 0
        updateData.service_details.breakdown.packing = 0
        updateData.service_details.breakdown.packingCost = 0
      }
      
      // CRITICAL: Ensure mover_team and crew_size are set at top level AFTER all merges and breakdown updates
      // This ensures they're always present even if breakdown had old values
      updateData.service_details.mover_team = normalizedTeam
      updateData.service_details.crew_size = normalizedTeam
      
      // Also ensure breakdown has the correct team size
      if (updateData.service_details.breakdown) {
        updateData.service_details.breakdown.mover_team = normalizedTeam
        updateData.service_details.breakdown.crew_size = normalizedTeam
      }
      
      console.log('🔧 API: Final team size before save:', {
        top_level: { mover_team: updateData.service_details.mover_team, crew_size: updateData.service_details.crew_size },
        breakdown: { mover_team: updateData.service_details.breakdown?.mover_team, crew_size: updateData.service_details.breakdown?.crew_size },
        full_service_details: JSON.stringify(updateData.service_details, null, 2)
      })
    }

    if (customer_notes !== undefined) updateData.customer_notes = customer_notes
    if (business_notes !== undefined) updateData.business_notes = business_notes
    // CRITICAL: Only set hourly_rate_cents from request if it wasn't already calculated from provider tier
    // (When team size changes, we calculate it from the tier, so don't override it)
    if (hourly_rate_cents !== undefined && !updateData.hourly_rate_cents) {
      updateData.hourly_rate_cents = hourly_rate_cents
    }
    if (estimated_duration_hours !== undefined) updateData.estimated_duration_hours = estimated_duration_hours
    if (base_price_cents !== undefined && service_details === undefined) updateData.base_price_cents = base_price_cents
    if (additional_fees_cents !== undefined) updateData.additional_fees_cents = additional_fees_cents
    if (total_price_cents !== undefined && service_details === undefined) updateData.total_price_cents = total_price_cents
    if (booking_status !== undefined && isAdmin) updateData.booking_status = booking_status
    if (payment_status !== undefined && isAdmin) updateData.payment_status = payment_status

    console.log('💾 API: About to save to DB:', {
      mover_team: updateData.service_details?.mover_team,
      crew_size: updateData.service_details?.crew_size,
      hourly_rate_cents: updateData.hourly_rate_cents,
      service_details_keys: updateData.service_details ? Object.keys(updateData.service_details) : [],
      full_service_details: JSON.stringify(updateData.service_details, null, 2)
    })

    // CRITICAL: Use Supabase's update with explicit service_details JSONB
    // This ensures the entire JSONB object is replaced, not merged
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        ...updateData,
        service_details: updateData.service_details // Explicitly set the entire service_details object
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: "Failed to update booking",
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('✅ API: Saved to DB:', {
      mover_team: updatedBooking.service_details?.mover_team,
      crew_size: updatedBooking.service_details?.crew_size,
      hourly_rate_cents: updatedBooking.hourly_rate_cents,
      breakdown_mover_team: updatedBooking.service_details?.breakdown?.mover_team,
      breakdown_crew_size: updatedBooking.service_details?.breakdown?.crew_size,
      full_service_details: JSON.stringify(updatedBooking.service_details, null, 2)
    })

    return NextResponse.json({ 
      success: true,
      booking: updatedBooking 
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

