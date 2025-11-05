import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Fetch overrides for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Resolve provider_id from business_id if needed
    let resolvedProviderId = providerId
    if (!resolvedProviderId && businessId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle()
      
      if (!provider) {
        return NextResponse.json({ overrides: [] }, { status: 200 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // Get override for this date (may have multiple slot-specific blocks)
    const { data: overrides, error } = await supabase
      .from('movers_availability_overrides')
      .select('*')
      .eq('provider_id', resolvedProviderId)
      .eq('date', date)

    if (error) {
      console.error('Error fetching override:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return the most restrictive override (full_day > morning/afternoon)
    const fullDayOverride = overrides?.find(o => o.kind === 'block' && (o.time_slot === 'full_day' || o.time_slot === null))
    const override = fullDayOverride || overrides?.[0] || null

    return NextResponse.json({ override, allOverrides: overrides || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get override'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: Create or update override
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, businessId, date, kind, timeSlot, startTime, endTime, maxConcurrentJobs, note } = body

    if (!date || !kind) {
      return NextResponse.json({ error: 'date and kind are required' }, { status: 400 })
    }

    if (kind !== 'block' && kind !== 'extra') {
      return NextResponse.json({ error: 'kind must be "block" or "extra"' }, { status: 400 })
    }

    const supabase = await createClient()

    // Resolve provider_id from business_id if needed
    let resolvedProviderId = providerId
    if (!resolvedProviderId && businessId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle()
      
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // For blocks, check if we need to delete existing slot-specific blocks
    // If blocking full day, delete any slot-specific blocks first
    if (kind === 'block') {
      const targetTimeSlot = timeSlot || 'full_day'
      
      console.log(`[Block Override] Blocking ${targetTimeSlot} for date ${date}, provider ${resolvedProviderId}`)
      
      if (targetTimeSlot === 'full_day') {
        // Delete all blocks for this date (including slot-specific ones)
        const { error: deleteError } = await supabase
          .from('movers_availability_overrides')
          .delete()
          .eq('provider_id', resolvedProviderId)
          .eq('date', date)
          .eq('kind', 'block')
        
        if (deleteError) {
          console.error('Error deleting existing blocks:', deleteError)
        }
      } else {
        // Delete only this specific slot block, or full-day block if it exists
        // First check if full-day block exists (check both 'full_day' and null for backward compatibility)
        // Query for full_day first
        const { data: fullDayBlock1 } = await supabase
          .from('movers_availability_overrides')
          .select('id')
          .eq('provider_id', resolvedProviderId)
          .eq('date', date)
          .eq('kind', 'block')
          .eq('time_slot', 'full_day')
          .maybeSingle()
        
        // Query for null
        const { data: fullDayBlock2 } = await supabase
          .from('movers_availability_overrides')
          .select('id')
          .eq('provider_id', resolvedProviderId)
          .eq('date', date)
          .eq('kind', 'block')
          .is('time_slot', null)
          .maybeSingle()
        
        const fullDayBlock = fullDayBlock1 || fullDayBlock2
        
        if (fullDayBlock) {
          console.log(`[Block Override] Found full-day block, replacing with ${targetTimeSlot} block`)
          // If full-day block exists, replace it with slot-specific block
          await supabase
            .from('movers_availability_overrides')
            .delete()
            .eq('id', fullDayBlock.id)
        } else {
          // Delete only this slot's block if it exists
          console.log(`[Block Override] Deleting existing ${targetTimeSlot} block if it exists`)
          const { error: deleteError } = await supabase
            .from('movers_availability_overrides')
            .delete()
            .eq('provider_id', resolvedProviderId)
            .eq('date', date)
            .eq('kind', 'block')
            .eq('time_slot', targetTimeSlot)
          
          if (deleteError) {
            console.error('Error deleting slot-specific block:', deleteError)
          }
        }
      }
    }

    // Check if override already exists for this specific slot
    const existingTimeSlot = kind === 'block' ? (timeSlot || 'full_day') : null
    const { data: existing } = await supabase
      .from('movers_availability_overrides')
      .select('id')
      .eq('provider_id', resolvedProviderId)
      .eq('date', date)
      .eq('kind', kind)
      .eq('time_slot', existingTimeSlot)
      .maybeSingle()

    console.log(`[Block Override] Existing override found:`, existing ? 'yes' : 'no', 'for time_slot:', existingTimeSlot)

    const overrideData: any = {
      provider_id: resolvedProviderId,
      date,
      kind,
      time_slot: kind === 'block' ? (timeSlot || 'full_day') : null,
      note: note || null,
    }

    if (kind === 'block') {
      // Block doesn't need time/jobs
      overrideData.start_time = null
      overrideData.end_time = null
      overrideData.max_concurrent_jobs = null
    } else if (kind === 'extra') {
      // Extra window needs time and optionally max jobs
      overrideData.start_time = startTime || null
      overrideData.end_time = endTime || null
      overrideData.max_concurrent_jobs = maxConcurrentJobs || null
    }

    console.log(`[Block Override] Existing override found:`, existing ? 'yes' : 'no', 'for time_slot:', existingTimeSlot)
    
    console.log(`[Block Override] Creating/updating override:`, {
      provider_id: resolvedProviderId,
      date,
      kind,
      time_slot: overrideData.time_slot
    })

    let result
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('movers_availability_overrides')
        .update(overrideData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating override:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('movers_availability_overrides')
        .insert(overrideData)
        .select()
        .single()

      if (error) {
        console.error('Error creating override:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ success: true, override: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save override'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: Remove override
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date')
    const timeSlot = searchParams.get('timeSlot') // Optional: 'morning', 'afternoon', or null for full day

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Resolve provider_id from business_id if needed
    let resolvedProviderId = providerId
    if (!resolvedProviderId && businessId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle()
      
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // Build delete query
    let deleteQuery = supabase
      .from('movers_availability_overrides')
      .delete()
      .eq('provider_id', resolvedProviderId)
      .eq('date', date)

    // If timeSlot specified, only delete that specific slot's block
    if (timeSlot) {
      deleteQuery = deleteQuery.eq('time_slot', timeSlot)
    } else {
      // If no timeSlot, delete all blocks for this date
      deleteQuery = deleteQuery.eq('kind', 'block')
    }

    const { error } = await deleteQuery

    if (error) {
      console.error('Error deleting override:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete override'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

