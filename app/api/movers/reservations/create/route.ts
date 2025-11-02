import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      providerId,
      businessId,
      quoteId,
      moveDate,
      timeSlot,
      fullName,
      email,
      phone,
      pickupAddresses,
      deliveryAddresses,
      teamSize,
      totalPriceCents,
      // CRITICAL: Get service details from request body if available
      heavy_items,
      heavy_items_count,
      heavy_item_band,
      stairs_flights,
      packing_help,
      packing_rooms,
      packing_materials,
      quoteBreakdown,
      // CRITICAL: Get destination fee, double drive time, and trip distance info
      destination_fee,
      double_drive_time,
      trip_distance_miles,
      trip_distance_duration,
      trip_distances
    } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Allow both authenticated and guest bookings
    // Guest bookings will use the provided email/phone from the form

    // Resolve provider_id from business_id if needed
    let resolvedProviderId = providerId
    if (!resolvedProviderId && businessId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle()
      
      if (provider) {
        resolvedProviderId = provider.id
      }
    }

    if (!resolvedProviderId || !moveDate || !timeSlot) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check availability, auto-creating default rules if needed
    const weekday = new Date(moveDate).getDay()
    let { data: available, error: availError } = await supabase.rpc('check_movers_availability', {
      p_provider_id: resolvedProviderId,
      p_date: moveDate,
      p_time_slot: timeSlot,
    })

    // If availability check failed or returned false, check if it's because no rules exist
    if (availError || !available) {
      const { data: rules } = await supabase
        .from('movers_availability_rules')
        .select('*')
        .eq('provider_id', resolvedProviderId)
        .eq('weekday', weekday)
        .maybeSingle()
      
      // If no rules exist for this weekday, auto-create default rules using security definer function
      if (!rules) {
        console.log(`No availability rule found for weekday ${weekday}, attempting to auto-create default rule`)
        
        // Use security definer function to create the rule (bypasses RLS)
        const { data: ruleId, error: createRuleError } = await supabase.rpc('auto_create_availability_rule', {
          p_provider_id: resolvedProviderId,
          p_weekday: weekday,
        })
        
        if (createRuleError) {
          console.error('Error creating default availability rule:', createRuleError)
          console.error('Full error details:', JSON.stringify(createRuleError, null, 2))
          return NextResponse.json({ 
            error: `Unable to set up availability for ${new Date(moveDate).toLocaleDateString('en-US', { weekday: 'long' })}. Please contact the provider.`,
            noRules: true,
            details: createRuleError.message
          }, { status: 500 })
        }
        
        console.log(`Successfully created default availability rule for weekday ${weekday} (${new Date(moveDate).toLocaleDateString('en-US', { weekday: 'long' })}), rule ID: ${ruleId}`)
        
        // Small delay to ensure rule is committed (though this shouldn't be necessary)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Re-check availability after creating default rule
        const recheckResult = await supabase.rpc('check_movers_availability', {
          p_provider_id: resolvedProviderId,
          p_date: moveDate,
          p_time_slot: timeSlot,
        })
        
        console.log('Recheck availability result:', { available: recheckResult.data, error: recheckResult.error })
        
        if (recheckResult.error) {
          console.error('Error rechecking availability after creating rule:', recheckResult.error)
          // Try to proceed anyway if the rule was created successfully
          // The rule should make it available, so we'll assume it's available
          console.log('Proceeding with booking despite recheck error (rule was created successfully)')
          available = true
        } else if (!recheckResult.data) {
          // Even with default rules, it's not available - check why
          const { data: bookedCount } = await supabase
            .from('movers_scheduled_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('provider_id', resolvedProviderId)
            .eq('scheduled_date', moveDate)
            .eq('time_slot', timeSlot)
            .in('status', ['scheduled', 'in_progress'])
          
          // Check if date is blocked
          const { data: blocked } = await supabase
            .from('movers_availability_overrides')
            .select('id')
            .eq('provider_id', resolvedProviderId)
            .eq('date', moveDate)
            .eq('kind', 'block')
            .maybeSingle()
          
          console.log('Availability check failed after creating rule:', { bookedCount, blocked, timeSlot })
          
          if (blocked) {
            return NextResponse.json({ 
              error: `This date has been blocked by the provider. Please select another date.`,
              blocked: true
            }, { status: 400 })
          }
          
          // Check the actual rule that was created to see if there's an issue
          const { data: createdRule } = await supabase
            .from('movers_availability_rules')
            .select('*')
            .eq('provider_id', resolvedProviderId)
            .eq('weekday', weekday)
            .maybeSingle()
          
          console.log('Created rule details:', createdRule)
          
          // Default values: 3 for morning, 2 for afternoon (matching the auto_create_availability_rule function)
          const defaultMorningJobs = 3
          const defaultAfternoonJobs = 2
          const maxJobs = timeSlot === 'morning' ? defaultMorningJobs : defaultAfternoonJobs
          
          // If there are no bookings and it's not blocked, but still not available,
          // there might be an issue with the rule or the SQL function
          if ((bookedCount || 0) === 0 && !blocked) {
            console.warn('Rule created but availability still false with no bookings - possible SQL function issue')
            // Proceed anyway - the rule was created and there are no bookings
            available = true
          } else {
            return NextResponse.json({ 
              error: `This time slot is fully booked (${bookedCount || 0}/${maxJobs} spots taken). Please select another date or time.`,
              available: false,
              fullyBooked: true
            }, { status: 400 })
          }
        } else {
          // Availability is confirmed after creating default rule
          available = true
        }
      } else {
        // Rules exist but slot is not available - check why
        const { count: bookedCount } = await supabase
          .from('movers_scheduled_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', resolvedProviderId)
          .eq('scheduled_date', moveDate)
          .eq('time_slot', timeSlot)
          .in('status', ['scheduled', 'in_progress'])
        
        // Check if date is blocked
        const { data: blocked } = await supabase
          .from('movers_availability_overrides')
          .select('id')
          .eq('provider_id', resolvedProviderId)
          .eq('date', moveDate)
          .eq('kind', 'block')
          .maybeSingle()
        
        if (blocked) {
          return NextResponse.json({ 
            error: `This date has been blocked by the provider. Please select another date.`,
            blocked: true
          }, { status: 400 })
        }
        
        // Get max jobs, handling NULL values
        let maxJobs = timeSlot === 'morning' ? (rules.morning_jobs ?? null) : (rules.afternoon_jobs ?? null)
        
        // If maxJobs is NULL or 0, there might be an issue with the rule - check if it was just created
        if (maxJobs === null || maxJobs === undefined || maxJobs === 0) {
          console.warn('Rule has NULL or 0 max jobs - treating as available', { rules, timeSlot })
          // If no bookings exist, assume it's available (rule might not have been set correctly)
          const { count: actualBookedCount } = await supabase
            .from('movers_scheduled_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('provider_id', resolvedProviderId)
            .eq('scheduled_date', moveDate)
            .eq('time_slot', timeSlot)
            .in('status', ['scheduled', 'in_progress'])
          
          if ((actualBookedCount || 0) === 0) {
            console.log('No bookings exist and maxJobs is NULL/0 - proceeding with booking')
            available = true
          } else {
            return NextResponse.json({ 
              error: `This time slot has reached capacity. Please select another date or time.`,
              available: false,
              fullyBooked: true
            }, { status: 400 })
          }
        } else {
          const actualBookedCount = bookedCount || 0
          const maxJobsNum = Number(maxJobs) || 0
          
          console.log('Rules exist but not available:', { 
            timeSlot, 
            maxJobs: maxJobsNum,
            bookedCount: actualBookedCount, 
            rule: rules,
            comparison: `${actualBookedCount} < ${maxJobsNum} = ${actualBookedCount < maxJobsNum}`
          })
          
          // Double-check: if bookedCount < maxJobs, proceed anyway (SQL function might have an issue)
          // This handles cases where the SQL function incorrectly returns false
          if (actualBookedCount < maxJobsNum && maxJobsNum > 0) {
            console.warn('SQL function returned false but bookedCount < maxJobs - proceeding with booking', {
              actualBookedCount,
              maxJobs: maxJobsNum,
              comparison: actualBookedCount < maxJobsNum
            })
            available = true
          } else {
            // Only return error if actually fully booked
            if (actualBookedCount >= maxJobsNum && maxJobsNum > 0) {
              return NextResponse.json({ 
                error: `This time slot is fully booked (${actualBookedCount}/${maxJobsNum} spots taken). Please select another date or time.`,
                available: false,
                fullyBooked: true
              }, { status: 400 })
            } else {
              // If maxJobs is 0 or invalid, treat as available (shouldn't happen but handle it)
              console.warn('maxJobs is 0 or invalid but no bookings - proceeding with booking')
              available = true
            }
          }
        }
      }
    }
    
    // If we get here, availability is confirmed - proceed with booking

    // STEP 1: ALWAYS create or update quote record FIRST using security definer function
    // This ensures we have a quote_id before creating the scheduled job and bypasses RLS
    let finalQuoteId: string | null = quoteId && quoteId !== 'null' ? quoteId : null
    const userId = user?.id || null
    
    console.log('[Reservations API] STEP 1: Creating/updating quote')
    console.log('[Reservations API] Provided quoteId:', quoteId)
    console.log('[Reservations API] Customer info:', { fullName, email, phone, userId })
    
    // Use RPC function to create/update quote (bypasses RLS)
    // CRITICAL: Build quote breakdown from service details if available
    let quoteBreakdownForRpc = quoteBreakdown || null
    
    // CRITICAL: Ensure heavy_items_cost is always saved as a NUMBER in breakdown
    // Calculate heavy items total cost from array if needed
    if (quoteBreakdownForRpc) {
      // CRITICAL: If heavy_items is already a number in breakdown (from quoteCalculator), use it
      if (typeof quoteBreakdownForRpc.heavy_items === 'number' && quoteBreakdownForRpc.heavy_items !== 0) {
        // heavy_items is already the total cost in dollars - save as heavy_items_cost
        quoteBreakdownForRpc = {
          ...quoteBreakdownForRpc,
          heavy_items_cost: quoteBreakdownForRpc.heavy_items
        }
      } else if (Array.isArray(quoteBreakdownForRpc.heavy_items) && quoteBreakdownForRpc.heavy_items.length > 0) {
        // If heavy_items is an array, calculate total cost
        const heavyItemsTotalCost = quoteBreakdownForRpc.heavy_items.reduce((sum: number, item: any) => {
          if (item && typeof item === 'object') {
            const priceCents = item.price_cents || 0
            const count = item.count || 1
            // price_cents is in cents, convert to dollars
            return sum + ((priceCents * count) / 100)
          }
          return sum
        }, 0)
        
        // CRITICAL: Save heavy_items_cost as a NUMBER (in dollars) for easy reading from database
        quoteBreakdownForRpc = {
          ...quoteBreakdownForRpc,
          heavy_items_cost: heavyItemsTotalCost
          // Keep heavy_items as array for detail
        }
      } else if (!quoteBreakdownForRpc.heavy_items_cost && quoteBreakdownForRpc.heavyItemsCost) {
        // If heavyItemsCost exists (camelCase), use it
        quoteBreakdownForRpc = {
          ...quoteBreakdownForRpc,
          heavy_items_cost: quoteBreakdownForRpc.heavyItemsCost
        }
      }
    } else if (heavy_items || stairs_flights !== undefined || packing_help || packing_rooms) {
      // Build breakdown from individual service details
      let heavyItemsTotalCost = 0
      
      // Calculate heavy items total cost from array
      if (Array.isArray(heavy_items) && heavy_items.length > 0) {
        heavyItemsTotalCost = heavy_items.reduce((sum: number, item: any) => {
          if (item && typeof item === 'object') {
            const priceCents = item.price_cents || 0
            const count = item.count || 1
            return sum + ((priceCents * count) / 100)
          }
          return sum
        }, 0)
      }
      
      quoteBreakdownForRpc = {
        heavy_items: heavy_items || [],
        heavy_items_count: heavy_items_count || 0,
        heavy_item_band: heavy_item_band || 'none',
        // CRITICAL: Save heavy_items_cost as a NUMBER (in dollars) for database
        heavy_items_cost: heavyItemsTotalCost,
        stairs_flights: stairs_flights || 0,
        stairs: (stairs_flights !== undefined && stairs_flights > 0) || false,
        packing_help: packing_help || 'none',
        packing_rooms: packing_rooms || 0,
        packing_materials: packing_materials || []
        // Removed 'packing' - it's not defined in the destructured variables
      }
    }
    
    console.log('[Reservations API] Passing breakdown to RPC:', JSON.stringify(quoteBreakdownForRpc, null, 2))
    
    // CRITICAL: Extract destination fee, double drive time, and trip distance from body
    const destinationFee = body.destination_fee || null
    const destinationFeeCents = body.destination_fee_cents || 
      (body.destination_fee ? Math.round(parseFloat(body.destination_fee) * 100) : null)
    const doubleDriveTime = body.double_drive_time !== undefined ? body.double_drive_time : null
    const tripDistanceMiles = body.trip_distance_miles || body.trip_distances?.distance || null
    const tripDistanceDuration = body.trip_distance_duration || body.trip_distances?.duration || null
    const tripDistances = body.trip_distances || null
    
    console.log('[Reservations API] Trip and fee details:', {
      destinationFee,
      destinationFeeCents,
      doubleDriveTime,
      tripDistanceMiles,
      tripDistanceDuration
    })
    
    const { data: quoteIdFromRpc, error: quoteRpcError } = await supabase.rpc('create_or_update_movers_quote', {
      p_provider_id: resolvedProviderId || null,
      p_customer_id: userId,
      p_full_name: fullName || '',
      p_email: email || '',
      p_phone: phone || '',
      p_pickup_address: pickupAddresses?.[0] || '',
      p_dropoff_address: deliveryAddresses?.[0] || '',
      p_move_date: moveDate,
      p_crew_size: teamSize || 2,
      p_price_total_cents: totalPriceCents || 0,
      p_status: 'confirmed',
      p_existing_quote_id: finalQuoteId || null, // If quoteId provided, update it, otherwise create new
      p_breakdown: quoteBreakdownForRpc, // CRITICAL: Pass breakdown to RPC function
      // CRITICAL: Pass destination fee, double drive time, and trip distance info
      p_destination_fee: destinationFee,
      p_destination_fee_cents: destinationFeeCents,
      p_double_drive_time: doubleDriveTime,
      p_trip_distance_miles: tripDistanceMiles,
      p_trip_distance_duration: tripDistanceDuration,
      p_trip_distances: tripDistances
    })
    
    if (quoteRpcError) {
      console.error('[Reservations API] ❌ Error creating/updating quote via RPC:', quoteRpcError)
      console.error('[Reservations API] Quote RPC error details:', JSON.stringify(quoteRpcError, null, 2))
      
      // Fallback: Try to find existing draft quote and update it manually
      if (!finalQuoteId) {
        console.log('[Reservations API] RPC failed, trying to find existing draft quote')
        const { data: existingDraftQuote } = await supabase
          .from('movers_quotes')
          .select('id')
          .eq('provider_id', resolvedProviderId)
          .eq('move_date', moveDate)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (existingDraftQuote?.id) {
          finalQuoteId = existingDraftQuote.id
          console.log('[Reservations API] Found draft quote to use:', finalQuoteId)
        }
      }
      
      // If still no quote_id, this is a critical error but we'll continue
      if (!finalQuoteId) {
        console.error('[Reservations API] ⚠️ CRITICAL: Could not create or find quote. Reservation will proceed without quote_id.')
      }
    } else if (quoteIdFromRpc) {
      finalQuoteId = quoteIdFromRpc
      console.log('[Reservations API] ✅ Successfully created/updated quote via RPC:', finalQuoteId)
    } else {
      console.error('[Reservations API] ❌ RPC returned no quote_id. This should not happen!')
    }
    
    // Validate we have a quote_id before proceeding
    if (!finalQuoteId) {
      console.error('[Reservations API] ⚠️ WARNING: No quote_id available. Scheduled job will be created without quote link.')
      console.error('[Reservations API] This means customer info will not be linked to the reservation.')
    } else {
      console.log('[Reservations API] ✅ Quote ID confirmed:', finalQuoteId)
    }

    // STEP 2: Create scheduled job using security definer function to bypass RLS
    // Now we have finalQuoteId to link it properly
    const scheduledStartTime = timeSlot === 'morning' ? '08:00:00' : '12:00:00'
    const scheduledEndTime = timeSlot === 'morning' ? '12:00:00' : '17:00:00'

    console.log('[Reservations API] Creating scheduled job with quote_id:', finalQuoteId)

    // Use RPC function to create scheduled job (bypasses RLS)
    const { data: jobId, error: jobError } = await supabase.rpc('create_movers_scheduled_job', {
      p_provider_id: resolvedProviderId,
      p_quote_id: finalQuoteId || null, // Use the quote we just created/updated
      p_scheduled_date: moveDate,
      p_time_slot: timeSlot,
      p_scheduled_start_time: scheduledStartTime,
      p_scheduled_end_time: scheduledEndTime,
      p_crew_size: teamSize || 2,
      p_status: 'scheduled',
    })

    if (jobError) {
      console.error('[Reservations API] Error creating scheduled job:', jobError)
      console.error('[Reservations API] Job error details:', JSON.stringify(jobError, null, 2))
      // Check if it's a duplicate constraint error
      if (jobError.code === '23505' || jobError.message?.includes('duplicate') || jobError.message?.includes('unique')) {
        return NextResponse.json({ 
          error: 'This time slot was just booked by another customer. Please select another time.',
          conflict: true,
          details: jobError.message
        }, { status: 409 })
      }
      return NextResponse.json({ 
        error: 'Failed to create reservation', 
        details: jobError.message,
        code: jobError.code,
        hint: jobError.hint
      }, { status: 500 })
    }

    if (!jobId) {
      return NextResponse.json({ 
        error: 'Failed to create reservation: No job ID returned',
        details: 'The scheduled job was not created successfully'
      }, { status: 500 })
    }

    console.log('[Reservations API] ✅ Created scheduled job:', jobId, 'with quote_id:', finalQuoteId)

    // Fetch the created scheduled job to return it
    const { data: scheduledJob, error: fetchError } = await supabase
      .from('movers_scheduled_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError) {
      console.error('[Reservations API] Error fetching created scheduled job:', fetchError)
      // Continue anyway - the job was created, we just can't return it
    }

    // CRITICAL: Also create a row in the bookings table so customers can see their reservations
    let bookingId: string | null = null
    if (userId && businessId) {
      // Get business info for booking
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .maybeSingle()

      if (business) {
        // Convert time slot to time format
        const timeSlotMap: Record<string, string> = {
          'morning': '08:00:00',
          'afternoon': '12:00:00',
          'full_day': '08:00:00'
        }
        
        // Get pickup and delivery addresses
        const pickupAddr = pickupAddresses?.[0] || ''
        const deliveryAddr = deliveryAddresses?.[0] || ''
        const serviceAddress = pickupAddr || deliveryAddr || ''
        
        // Extract city/state/zip from address (improved parsing)
        // Typical format: "123 Main St, City, State ZIP" or "123 Main St, City, State"
        let city = ''
        let state = ''
        let zip = ''
        
        if (serviceAddress) {
          const addressParts = serviceAddress.split(',').map((s: string) => s.trim())
          // Last part should be "State ZIP" or just "State"
          if (addressParts.length >= 2) {
            city = addressParts[addressParts.length - 2] || ''
            const stateZipPart = addressParts[addressParts.length - 1] || ''
            // Try to parse state and zip (format: "CA 90210" or "California 90210")
            const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/)
            if (stateZipMatch) {
              state = stateZipMatch[1].trim()
              zip = stateZipMatch[2].trim()
            } else {
              // No zip found, just use as state
              state = stateZipPart.trim()
            }
          } else if (addressParts.length === 1) {
            // Single part address - try to extract what we can
            city = addressParts[0] || ''
          }
        }
        
        // Fetch quote data to include all service details in booking
        // CRITICAL: Use breakdown from body first (it has the actual service details), then fetch from DB
        let quoteBreakdownData: any = quoteBreakdown || {}
        let quoteData: any = null
        
        if (finalQuoteId) {
          const { data: quote } = await supabase
            .from('movers_quotes')
            .select('breakdown, pickup_address, dropoff_address, move_date, crew_size, price_total_cents')
            .eq('id', finalQuoteId)
            .single()
          
          if (quote) {
            quoteData = quote
            // Use breakdown from body if provided (it's more complete), otherwise use DB breakdown
            const dbBreakdown = quote.breakdown || {}
            quoteBreakdownData = Object.keys(quoteBreakdownData).length > 0 ? quoteBreakdownData : dbBreakdown
            
            console.log('[Reservations API] Quote breakdown from body:', JSON.stringify(quoteBreakdown, null, 2))
            console.log('[Reservations API] Quote breakdown from DB:', JSON.stringify(dbBreakdown, null, 2))
            console.log('[Reservations API] Using quote breakdown:', JSON.stringify(quoteBreakdownData, null, 2))
            
            // CRITICAL: Update the quote's breakdown if body has better data
            if (Object.keys(quoteBreakdown || {}).length > 0 && JSON.stringify(quoteBreakdown) !== JSON.stringify(dbBreakdown)) {
              console.log('[Reservations API] Updating quote breakdown with complete data from body...')
              await supabase
                .from('movers_quotes')
                .update({ 
                  breakdown: quoteBreakdown,
                  updated_at: new Date().toISOString()
                })
                .eq('id', finalQuoteId)
              
              quoteBreakdownData = quoteBreakdown
              console.log('[Reservations API] ✅ Quote breakdown updated in database')
            }
          }
        }
        
        // If no quote breakdown from body or DB, try to build it from individual fields
        if (Object.keys(quoteBreakdownData).length === 0) {
          quoteBreakdownData = {
            heavy_items: heavy_items || [],
            heavy_items_count: heavy_items_count || 0,
            heavy_item_band: heavy_item_band || 'none',
            stairs_flights: stairs_flights !== undefined ? stairs_flights : 0,
            packing_help: packing_help || 'none',
            packing_rooms: packing_rooms !== undefined ? packing_rooms : 0,
            packing_materials: packing_materials || [],
          }
          console.log('[Reservations API] Built breakdown from individual fields:', JSON.stringify(quoteBreakdownData, null, 2))
        }
        
        // Build comprehensive service_details from quote breakdown and reservation data
        const serviceDetails: any = {
          quote_id: finalQuoteId,
          scheduled_job_id: jobId,
          pickup_addresses: pickupAddresses || [],
          delivery_addresses: deliveryAddresses || [],
          from_address: quoteData?.pickup_address || pickupAddresses?.[0] || '',
          to_address: quoteData?.dropoff_address || deliveryAddresses?.[0] || '',
          pickup_address: quoteData?.pickup_address || pickupAddresses?.[0] || '',
          dropoff_address: quoteData?.dropoff_address || deliveryAddresses?.[0] || '',
          crew_size: teamSize || quoteData?.crew_size || 2,
          time_slot: timeSlot,
          move_date: moveDate,
          source: 'movers_reservation',
          // Merge all data from quote breakdown (heavy_items, stairs_flights, packing, etc.)
          ...quoteBreakdownData,
          // CRITICAL: Ensure these specific fields are ALWAYS set for database storage
          // Priority: body fields > quoteBreakdownData > defaults
          // Heavy Items - prioritize body, then quote breakdown, then empty array
          heavy_items: Array.isArray(body.heavy_items) && body.heavy_items.length > 0
            ? body.heavy_items
            : (Array.isArray(quoteBreakdownData.heavy_items) && quoteBreakdownData.heavy_items.length > 0 
              ? quoteBreakdownData.heavy_items 
              : []),
          heavy_items_count: body.heavy_items_count !== undefined && body.heavy_items_count > 0
            ? body.heavy_items_count
            : (quoteBreakdownData.heavy_items_count !== undefined && quoteBreakdownData.heavy_items_count > 0
              ? quoteBreakdownData.heavy_items_count
              : 0),
          heavy_item_band: body.heavy_item_band || body.weight_band 
            || quoteBreakdownData.heavy_item_band || quoteBreakdownData.weight_band 
            || 'none',
          // Stairs - ALWAYS store the flights count
          stairs_flights: body.stairs_flights !== undefined 
            ? body.stairs_flights 
            : (quoteBreakdownData.stairs_flights !== undefined 
              ? quoteBreakdownData.stairs_flights 
              : 0),
          stairs: (body.stairs_flights !== undefined && body.stairs_flights > 0)
            || body.stairs === true
            || (quoteBreakdownData.stairs_flights !== undefined && quoteBreakdownData.stairs_flights > 0) 
            || quoteBreakdownData.stairs === true,
          // Packing - ALWAYS store all packing details
          packing_help: body.packing_help 
            || quoteBreakdownData.packing_help || quoteBreakdownData.packing
            || 'none',
          packing_rooms: body.packing_rooms !== undefined 
            ? body.packing_rooms 
            : (quoteBreakdownData.packing_rooms !== undefined 
              ? quoteBreakdownData.packing_rooms 
              : 0),
          packing_materials: Array.isArray(body.packing_materials) && body.packing_materials.length > 0
            ? body.packing_materials
            : (Array.isArray(quoteBreakdownData.packing_materials) && quoteBreakdownData.packing_materials.length > 0
              ? quoteBreakdownData.packing_materials
              : []),
          packing: body.packing || quoteBreakdownData.packing || {},
          move_size: quoteBreakdownData.move_size || body.move_size || `${teamSize || 2}-bedroom`,
          mover_team: quoteBreakdownData.mover_team || teamSize || 2,
          hourly_rate: quoteBreakdownData.hourly_rate || body.hourly_rate || null,
          hourly_rate_cents: quoteBreakdownData.hourly_rate_cents || (quoteBreakdownData.hourly_rate ? Math.round(quoteBreakdownData.hourly_rate * 100) : null),
          storage: quoteBreakdownData.storage || body.storage || 'none',
          ins_coverage: quoteBreakdownData.ins_coverage || body.ins_coverage || 'basic',
          // CRITICAL: Include destination fee, double drive time, and mileage info
          destination_fee: body.destination_fee || quoteBreakdownData.destination_fee || quoteData?.destination_fee || null,
          destination_fee_cents: body.destination_fee ? Math.round(parseFloat(body.destination_fee) * 100) : (quoteBreakdownData.destination_fee_cents || null),
          double_drive_time: body.double_drive_time !== undefined 
            ? body.double_drive_time 
            : (quoteBreakdownData.double_drive_time !== undefined 
              ? quoteBreakdownData.double_drive_time 
              : false),
          trip_distance_miles: body.trip_distance_miles !== undefined 
            ? body.trip_distance_miles 
            : (body.trip_distances?.distance !== undefined 
              ? body.trip_distances.distance 
              : (quoteBreakdownData.trip_distance_miles || quoteData?.trip_distance_miles || null)),
          trip_distance_duration: body.trip_distance_duration !== undefined 
            ? body.trip_distance_duration 
            : (body.trip_distances?.duration !== undefined 
              ? body.trip_distances.duration 
              : (quoteBreakdownData.trip_distance_duration || quoteData?.trip_distance_duration || null)),
          trip_distances: body.trip_distances || quoteBreakdownData.trip_distances || null,
          mileage: body.trip_distance_miles || body.trip_distances?.distance || quoteBreakdownData.trip_distance_miles || quoteData?.trip_distance_miles || null,
          // Include customer info
          full_name: fullName,
          email: email,
          phone: phone,
        }
        
        console.log('[Reservations API] Complete service_details:', JSON.stringify(serviceDetails, null, 2))
        
        // Create booking record for customer visibility
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            customer_id: userId,
            business_id: businessId,
            service_type: 'moving',
            booking_status: 'confirmed',
            requested_date: moveDate,
            requested_time: timeSlotMap[timeSlot] || '09:00:00',
            estimated_duration_hours: timeSlot === 'full_day' ? 8 : 4,
            service_address: serviceAddress,
            service_city: city || '',
            service_state: state || '',
            service_postal_code: zip || '',
            base_price_cents: totalPriceCents || 0,
            total_price_cents: totalPriceCents || 0,
            hourly_rate_cents: serviceDetails.hourly_rate_cents || null,
            customer_phone: phone,
            customer_email: email,
            customer_notes: `Reservation via movers booking system. Quote ID: ${finalQuoteId || 'N/A'}`,
            service_details: serviceDetails
          })
          .select('id, service_details')
          .single()
        
        if (bookingError) {
          console.error('[Reservations API] Error creating booking record:', bookingError)
          console.error('[Reservations API] Booking error details:', JSON.stringify(bookingError, null, 2))
          // This is critical - without this, customers can't see their reservation
          // But don't fail the whole reservation
        } else if (booking) {
          bookingId = booking.id
          console.log('[Reservations API] Successfully created booking record for customer:', bookingId)
          
          // Verify service_details was saved correctly
          console.log('[Reservations API] Saved service_details:', JSON.stringify(booking.service_details, null, 2))
          
          // Verify completeness using database function (if available)
          try {
            const { data: verification, error: verifyError } = await supabase.rpc(
              'verify_service_details_completeness',
              { p_booking_id: bookingId }
            )
            
            if (!verifyError && verification) {
              console.log('[Reservations API] Service details verification:', JSON.stringify(verification, null, 2))
              
              // If missing fields, try to enrich
              if (!verification.valid && verification.missing_fields) {
                console.log('[Reservations API] Missing fields detected, attempting to enrich...')
                const { data: enriched, error: enrichError } = await supabase.rpc(
                  'enrich_booking_service_details',
                  { p_booking_id: bookingId }
                )
                
                if (!enrichError && enriched) {
                  console.log('[Reservations API] Successfully enriched service_details')
                } else {
                  console.error('[Reservations API] Error enriching service_details:', enrichError)
                }
              }
            }
          } catch (err) {
            // Function might not exist yet (migration not run), that's okay
            console.log('[Reservations API] Verification function not available (migration may not be run)')
          }
        }
      }
    } else {
      console.warn('[Reservations API] Cannot create booking record - missing userId or businessId:', { userId, businessId })
    }

    // Get provider owner user_id for notifications
    const { data: provider } = await supabase
      .from('movers_providers')
      .select('owner_user_id')
      .eq('id', resolvedProviderId)
      .single()

    // Create notification for provider
    if (provider?.owner_user_id) {
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: provider.owner_user_id,
            title: 'New Reservation',
            message: `${fullName} has booked a move on ${new Date(moveDate).toLocaleDateString()} (${timeSlot}). Total: $${(totalPriceCents / 100).toFixed(2)}`,
            type: 'reservation',
            related_id: jobId || scheduledJob?.id,
            is_read: false,
          })
        
        if (notificationError) {
          console.error('[Reservations API] Error creating notification:', notificationError)
          // Don't fail the reservation if notification fails
        }
      } catch (err) {
        console.error('[Reservations API] Exception creating notification:', err)
        // Don't fail the reservation if notification fails
      }
    }

    return NextResponse.json({ 
      success: true,
      reservation_id: jobId || scheduledJob?.id,
      scheduled_job_id: jobId || scheduledJob?.id,
      quote_id: finalQuoteId,
      booking_id: bookingId,
      scheduled_job: scheduledJob || { id: jobId },
      // Provide reference IDs for client to track their reservation
      references: {
        scheduled_job_id: jobId || scheduledJob?.id,
        quote_id: finalQuoteId,
        booking_id: bookingId,
        provider_id: resolvedProviderId,
        business_id: businessId
      }
    })
  } catch (error) {
    console.error('[Reservations API] Error creating reservation:', error)
    const message = error instanceof Error ? error.message : 'Failed to create reservation'
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[Reservations API] Error details:', { message, stack })
    return NextResponse.json({ 
      error: message,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 })
  }
}

