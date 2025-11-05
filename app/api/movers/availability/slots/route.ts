import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') || startDate

    if (!startDate) {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 })
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
        return NextResponse.json({ slots: [] }, { status: 200 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // Get business config for advance notice requirements
    let resolvedBusinessId = businessId
    if (!resolvedBusinessId && resolvedProviderId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('business_id')
        .eq('id', resolvedProviderId)
        .maybeSingle()
      
      if (provider) {
        resolvedBusinessId = provider.business_id
      }
    }

    let minBookingNoticeHours = 24 // Default to 24 hours
    if (resolvedBusinessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('min_booking_notice_hours')
        .eq('id', resolvedBusinessId)
        .maybeSingle()
      
      if (business?.min_booking_notice_hours) {
        minBookingNoticeHours = business.min_booking_notice_hours
      }
    }

    // Calculate minimum bookable date/time based on advance notice
    const now = new Date()
    const minBookableTime = new Date(now.getTime() + (minBookingNoticeHours * 60 * 60 * 1000))
    const minBookableDate = minBookableTime.toISOString().split('T')[0]
    const minBookableDateTime = minBookableTime.toISOString()

    console.log(`[Availability Slots] Min booking notice: ${minBookingNoticeHours} hours, min bookable date: ${minBookableDate}`)

    // Get availability rules for weekdays
    let { data: rules } = await supabase
      .from('movers_availability_rules')
      .select('*')
      .eq('provider_id', resolvedProviderId)

    console.log(`[Availability Slots] Loaded ${rules?.length || 0} availability rules for provider ${resolvedProviderId}`)
    if (rules && rules.length > 0) {
      console.log('[Availability Slots] Sample rules:', rules.slice(0, 3).map(r => ({
        weekday: r.weekday,
        morning_jobs: r.morning_jobs,
        afternoon_jobs: r.afternoon_jobs
      })))
    }

    // Get date-specific overrides
    const { data: overrides, error: overridesError } = await supabase
      .from('movers_availability_overrides')
      .select('*')
      .eq('provider_id', resolvedProviderId)
      .gte('date', startDate)
      .lte('date', endDate || startDate)

    if (overridesError) {
      console.error('[Availability Slots] Error fetching overrides:', overridesError)
    }

    // Debug: Log blocks found
    if (overrides && overrides.length > 0) {
      const blocks = overrides.filter(o => o.kind === 'block')
      if (blocks.length > 0) {
        console.log(`[Availability Slots] Found ${blocks.length} blocks for provider ${resolvedProviderId}:`, blocks.map(b => `${b.date} ${b.time_slot || 'full_day'}`).join(', '))
      } else {
        console.log(`[Availability Slots] Found ${overrides.length} overrides but none are blocks`)
      }
    } else {
      console.log(`[Availability Slots] No overrides found for provider ${resolvedProviderId} from ${startDate} to ${endDate}`)
    }

    // Get current bookings from movers_scheduled_jobs
    const { data: scheduledJobs } = await supabase
      .from('movers_scheduled_jobs')
      .select('scheduled_date, time_slot')
      .eq('provider_id', resolvedProviderId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate || startDate)
      .in('status', ['scheduled', 'in_progress'])

    // Get bookings from bookings table
    let businessBookings: any[] = []
    if (resolvedBusinessId) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('requested_date, service_details')
        .eq('business_id', resolvedBusinessId)
        .gte('requested_date', startDate)
        .lte('requested_date', endDate || startDate)
        .in('booking_status', ['confirmed', 'pending', 'in_progress'])
      
      businessBookings = bookings || []
    }

    // Combine bookings from both sources, deduplicating by date+timeSlot
    const allBookings: Array<{ date: string; timeSlot: 'morning' | 'afternoon' }> = []
    const bookingSet = new Set<string>() // Track unique bookings by date+timeSlot
    
    // Add scheduled jobs
    scheduledJobs?.forEach(job => {
      // Normalize date to YYYY-MM-DD format for consistent matching
      const dateStr = typeof job.scheduled_date === 'string' 
        ? job.scheduled_date.split('T')[0] 
        : new Date(job.scheduled_date).toISOString().split('T')[0]
      
      if (job.time_slot === 'morning' || job.time_slot === 'afternoon') {
        const key = `${dateStr}:${job.time_slot}`
        if (!bookingSet.has(key)) {
          bookingSet.add(key)
          allBookings.push({
            date: dateStr,
            timeSlot: job.time_slot as 'morning' | 'afternoon'
          })
        }
      } else if (job.time_slot === 'full_day') {
        // Full day counts as both morning and afternoon
        const morningKey = `${dateStr}:morning`
        const afternoonKey = `${dateStr}:afternoon`
        if (!bookingSet.has(morningKey)) {
          bookingSet.add(morningKey)
          allBookings.push({ date: dateStr, timeSlot: 'morning' })
        }
        if (!bookingSet.has(afternoonKey)) {
          bookingSet.add(afternoonKey)
          allBookings.push({ date: dateStr, timeSlot: 'afternoon' })
        }
      }
    })

    // Add bookings from bookings table
    businessBookings?.forEach(booking => {
      if (!booking.requested_date) return
      
      const dateStr = typeof booking.requested_date === 'string' 
        ? booking.requested_date.split('T')[0] 
        : booking.requested_date.toISOString().split('T')[0]
      
      // Determine time slot from service_details or requested_time
      const timeSlot = booking.service_details?.time_slot || 
                       (booking.service_details?.requested_time 
                         ? (booking.service_details.requested_time < '12:00:00' ? 'morning' : 'afternoon')
                         : null)
      
      if (timeSlot === 'morning' || timeSlot === 'afternoon') {
        const key = `${dateStr}:${timeSlot}`
        if (!bookingSet.has(key)) {
          bookingSet.add(key)
          allBookings.push({ date: dateStr, timeSlot })
        }
      } else if (timeSlot === 'full_day' || !timeSlot) {
        // Default to morning if unclear, or full_day counts as both
        const morningKey = `${dateStr}:morning`
        const afternoonKey = `${dateStr}:afternoon`
        if (!bookingSet.has(morningKey)) {
          bookingSet.add(morningKey)
          allBookings.push({ date: dateStr, timeSlot: 'morning' })
        }
        if (!bookingSet.has(afternoonKey)) {
          bookingSet.add(afternoonKey)
          allBookings.push({ date: dateStr, timeSlot: 'afternoon' })
        }
      }
    })

    console.log(`[Availability Slots] Found ${allBookings.length} total bookings (${scheduledJobs?.length || 0} scheduled jobs, ${businessBookings.length} bookings table)`)

    // Build availability slots - iterate through all dates in range
    const slots: Array<{
      date: string
      timeSlot: 'morning' | 'afternoon'
      available: boolean
      maxJobs: number
      currentBookings: number
    }> = []

    const start = new Date(startDate + 'T00:00:00Z') // Ensure UTC
    const end = new Date(endDate + 'T00:00:00Z') // Ensure UTC
    
    // Use a counter to avoid infinite loops and ensure we cover all dates
    let currentDate = new Date(start)
    const maxIterations = 1000 // Safety limit
    let iterations = 0
    
    while (currentDate <= end && iterations < maxIterations) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const weekday = currentDate.getUTCDay() // Use UTC to match database DOW calculation

      // Get rule for this weekday - auto-create if missing using database function
      let rule = rules?.find(r => r.weekday === weekday)
      
      if (!rule) {
        // Auto-create default rule for this weekday if missing using database function
        console.log(`No availability rule found for weekday ${weekday}, auto-creating rule`)
        try {
          const { data: ruleId, error: createError } = await supabase.rpc('auto_create_availability_rule', {
            p_provider_id: resolvedProviderId,
            p_weekday: weekday
          })
          
          if (!createError && ruleId) {
            // Fetch the newly created rule
            const { data: newRule, error: fetchError } = await supabase
              .from('movers_availability_rules')
              .select('*')
              .eq('id', ruleId)
              .single()
            
            if (!fetchError && newRule) {
              rule = newRule
              // Add to rules array for future iterations
              if (!rules) rules = []
              rules.push(newRule)
              console.log(`Successfully created and fetched rule for weekday ${weekday}`)
            } else {
              console.error('Error fetching newly created rule:', fetchError)
              // Fallback: use default values
              rule = {
                weekday: weekday,
                morning_jobs: 3,
                afternoon_jobs: 2,
                max_concurrent_jobs: 3,
                morning_start: '08:00:00',
                afternoon_start: '12:00:00',
                afternoon_end: '17:00:00',
                start_time: '08:00:00',
                end_time: '17:00:00'
              } as any
            }
          } else {
            console.error('Error auto-creating availability rule:', createError)
            // Fallback: use default values
            rule = {
              weekday: weekday,
              morning_jobs: 3,
              afternoon_jobs: 2,
              max_concurrent_jobs: 3,
              morning_start: '08:00:00',
              afternoon_start: '12:00:00',
              afternoon_end: '17:00:00',
              start_time: '08:00:00',
              end_time: '17:00:00'
            } as any
          }
        } catch (error) {
          console.error('Exception auto-creating availability rule:', error)
          // Fallback: use default values
          rule = {
            weekday: weekday,
            morning_jobs: 3,
            afternoon_jobs: 2,
            max_concurrent_jobs: 3,
            morning_start: '08:00:00',
            afternoon_start: '12:00:00',
            afternoon_end: '17:00:00',
            start_time: '08:00:00',
            end_time: '17:00:00'
          } as any
        }
      }

      // Check for slot-specific blocks (do NOT use the old generic block check)
      // Normalize date formats for comparison (database might return Date object or string)
      
      // Debug: Log what we're looking for vs what's in overrides
      if (process.env.NODE_ENV === 'development' && (dateStr === '2025-11-07' || dateStr === '2025-11-08' || dateStr === '2025-11-13' || dateStr === '2025-11-20')) {
        console.log(`[Availability] Checking ${dateStr} for blocks. Overrides count: ${overrides?.length || 0}`)
        if (overrides && overrides.length > 0) {
          const relevantOverrides = overrides.filter(o => {
            const overrideDate = typeof o.date === 'string' ? o.date.split('T')[0] : new Date(o.date).toISOString().split('T')[0]
            return overrideDate === dateStr
          })
          console.log(`[Availability] ${dateStr}: Found ${relevantOverrides.length} matching overrides:`, relevantOverrides.map(o => ({
            date: typeof o.date === 'string' ? o.date.split('T')[0] : new Date(o.date).toISOString().split('T')[0],
            kind: o.kind,
            time_slot: o.time_slot
          })))
        }
      }
      
      const fullDayBlock = overrides?.find(o => {
        const overrideDate = typeof o.date === 'string' ? o.date.split('T')[0] : new Date(o.date).toISOString().split('T')[0]
        return overrideDate === dateStr && o.kind === 'block' && (o.time_slot === 'full_day' || o.time_slot === null)
      })
      const morningBlock = overrides?.find(o => {
        const overrideDate = typeof o.date === 'string' ? o.date.split('T')[0] : new Date(o.date).toISOString().split('T')[0]
        return overrideDate === dateStr && o.kind === 'block' && o.time_slot === 'morning'
      })
      const afternoonBlock = overrides?.find(o => {
        const overrideDate = typeof o.date === 'string' ? o.date.split('T')[0] : new Date(o.date).toISOString().split('T')[0]
        return overrideDate === dateStr && o.kind === 'block' && o.time_slot === 'afternoon'
      })

      // Debug: Log if blocks should exist but aren't found
      if (process.env.NODE_ENV === 'development' && (fullDayBlock || morningBlock || afternoonBlock)) {
        console.log(`[Availability] ${dateStr}: Found blocks - fullDay: ${!!fullDayBlock}, morning: ${!!morningBlock}, afternoon: ${!!afternoonBlock}`)
      }

      // Check for date-specific override (extra window) - but don't use it for maxJobs calculation
      const extra = overrides?.find(o => o.date === dateStr && o.kind === 'extra')

      // Check if date is too soon (advance notice requirement)
      const dateObj = new Date(dateStr + 'T00:00:00Z')
      const isTooSoon = dateObj < new Date(minBookableDate + 'T00:00:00Z')
      
      // For same day, check if the specific time slot is still available
      let morningTooSoon = false
      let afternoonTooSoon = false
      const todayDateStr = new Date().toISOString().split('T')[0]
      if (dateStr === todayDateStr) {
        // Same day - check if morning slot (8am) or afternoon slot (12pm) has passed the advance notice time
        // Use local timezone for slot times
        const now = new Date()
        const morningSlotTime = new Date(now)
        morningSlotTime.setHours(8, 0, 0, 0)
        const afternoonSlotTime = new Date(now)
        afternoonSlotTime.setHours(12, 0, 0, 0)
        
        // Check if slots are before the minimum bookable time
        morningTooSoon = morningSlotTime < minBookableTime
        afternoonTooSoon = afternoonSlotTime < minBookableTime
      } else if (dateObj < new Date(minBookableDate + 'T00:00:00Z')) {
        // Future date but still too soon
        morningTooSoon = true
        afternoonTooSoon = true
      }

      // Morning slot
      const morningBookings = allBookings.filter(b => b.date === dateStr && b.timeSlot === 'morning').length
      // Use weekly rule values, NOT extra window max_concurrent_jobs
      const morningMax = rule.morning_jobs || rule.max_concurrent_jobs || 0
      const morningAvailable = !fullDayBlock && !morningBlock && !morningTooSoon && !isTooSoon && morningBookings < morningMax && morningMax > 0
      
      slots.push({
        date: dateStr,
        timeSlot: 'morning',
        available: morningAvailable,
        maxJobs: morningMax,
        currentBookings: morningBookings
      })

      // Afternoon slot
      const afternoonBookings = allBookings.filter(b => b.date === dateStr && b.timeSlot === 'afternoon').length
      // Use weekly rule values, NOT extra window max_concurrent_jobs
      const afternoonMax = rule.afternoon_jobs || rule.max_concurrent_jobs || 0
      const afternoonAvailable = !fullDayBlock && !afternoonBlock && !afternoonTooSoon && !isTooSoon && afternoonBookings < afternoonMax && afternoonMax > 0
      
      // Debug logging for specific dates
      if (process.env.NODE_ENV === 'development') {
        const hasBlock = !!fullDayBlock || !!morningBlock || !!afternoonBlock
        console.log(`[Availability] ${dateStr} (weekday ${weekday}): M=${morningBookings}/${morningMax} (blocked: ${hasBlock}, fullDay: ${!!fullDayBlock}, morning: ${!!morningBlock}, afternoon: ${!!afternoonBlock}, tooSoon: ${morningTooSoon}), A=${afternoonBookings}/${afternoonMax} (blocked: ${hasBlock}, tooSoon: ${afternoonTooSoon})`)
        if (hasBlock) {
          console.log(`[Availability] ${dateStr} BLOCKED - fullDay: ${fullDayBlock?.id}, morning: ${morningBlock?.id}, afternoon: ${afternoonBlock?.id}`)
        }
        console.log(`[Availability] Rule values: morning_jobs=${rule.morning_jobs}, afternoon_jobs=${rule.afternoon_jobs}`)
      }
      
      slots.push({
        date: dateStr,
        timeSlot: 'afternoon',
        available: afternoonAvailable,
        maxJobs: afternoonMax,
        currentBookings: afternoonBookings
      })
      
      // Move to next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      iterations++
    }

    console.log(`[Availability Slots] Generated ${slots.length} slots for dates ${startDate} to ${endDate}`)

    return NextResponse.json({ slots })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get availability slots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

