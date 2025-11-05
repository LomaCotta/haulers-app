import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Public Calendar Availability API
 * Returns simple status (available/busy/unavailable) without exposing booking counts
 * Uses movers_public_availability table for fast, secure lookups
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const { calendarId } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') || startDate

    if (!calendarId) {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 })
    }

    if (!startDate) {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get provider_id from calendar_id (using secure lookup)
    const { data: providerData, error: providerError } = await supabase
      .from('movers_providers')
      .select('id, business_id')
      .eq('calendar_id', calendarId)
      .maybeSingle()

    if (providerError || !providerData) {
      return NextResponse.json({ slots: [] }, { status: 200 })
    }

    const resolvedProviderId = providerData.id
    const resolvedBusinessId = providerData.business_id

    // Check if provider has availability rules configured
    // If no rules exist, all dates should default to available (provider hasn't configured yet)
    const { data: availabilityRules, error: rulesError } = await supabase
      .from('movers_availability_rules')
      .select('id')
      .eq('provider_id', resolvedProviderId)
      .limit(1)
    
    const hasRulesConfigured = (availabilityRules?.length || 0) > 0
    
    if (!hasRulesConfigured) {
      console.log(`[Public Availability API] No availability rules found for provider ${resolvedProviderId} - defaulting all dates to available`)
    }

    // Get advance notice requirement
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

    // Get public availability status from cache table (fast, secure)
    const { data: publicAvailability, error: availabilityError } = await supabase
      .from('movers_public_availability')
      .select('date, morning_status, afternoon_status')
      .eq('calendar_id', calendarId)
      .gte('date', startDate)
      .lte('date', endDate || startDate)
      .order('date', { ascending: true })

    if (availabilityError) {
      console.error('[Public Availability API] Error fetching public availability:', availabilityError)
    }
    
    console.log(`[Public Availability API] Found ${publicAvailability?.length || 0} availability records for calendar ${calendarId}`)
    
    // Debug: Log specific blocked dates
    if (publicAvailability && publicAvailability.length > 0) {
      const blockedDates = publicAvailability.filter(a => 
        a.morning_status === 'unavailable' || a.afternoon_status === 'unavailable'
      )
      if (blockedDates.length > 0) {
        console.log(`[Public Availability API] Found ${blockedDates.length} blocked dates:`, 
          blockedDates.map(d => `${d.date} (M:${d.morning_status}, A:${d.afternoon_status})`).join(', ')
        )
      }
    }

    // Build availability slots - iterate through all dates in range
    const slots: Array<{
      date: string
      timeSlot: 'morning' | 'afternoon'
      status: 'available' | 'busy' | 'unavailable'
      available: boolean
    }> = []

    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date((endDate || startDate) + 'T00:00:00Z')
    const currentDate = new Date(start)
    let iterations = 0
    const maxIterations = 1000 // Safety limit

    while (currentDate <= end && iterations < maxIterations) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Check if date is too soon (advance notice requirement)
      const dateObj = new Date(dateStr + 'T00:00:00Z')
      const todayDateStr = new Date().toISOString().split('T')[0]
      
      let morningTooSoon = false
      let afternoonTooSoon = false
      
      if (dateStr === todayDateStr) {
        // Same day - check if morning slot (8am) or afternoon slot (12pm) has passed
        const now = new Date()
        const morningSlotTime = new Date(now)
        morningSlotTime.setHours(8, 0, 0, 0)
        const afternoonSlotTime = new Date(now)
        afternoonSlotTime.setHours(12, 0, 0, 0)
        
        morningTooSoon = morningSlotTime < minBookableTime
        afternoonTooSoon = afternoonSlotTime < minBookableTime
      } else if (dateObj < new Date(minBookableDate + 'T00:00:00Z')) {
        morningTooSoon = true
        afternoonTooSoon = true
      }

      // Get status from public availability cache
      // IMPORTANT: Always respect 'unavailable' status from cache (blocks override everything)
      // If no cache entry exists, default to 'available' if no rules configured
      const availability = publicAvailability?.find(a => a.date === dateStr)
      
      // Debug: Log when we find a blocked date
      if (availability && (availability.morning_status === 'unavailable' || availability.afternoon_status === 'unavailable')) {
        console.log(`[Public Availability API] Found blocked date ${dateStr}: M=${availability.morning_status}, A=${availability.afternoon_status}`)
      }
      
      // Morning slot - always respect 'unavailable' status, otherwise default based on rules
      let morningStatus: 'available' | 'busy' | 'unavailable' = 'available' // Default to available
      if (availability?.morning_status) {
        // Always use cache if it exists (especially for blocked dates)
        if (['available', 'busy', 'unavailable'].includes(availability.morning_status)) {
          morningStatus = availability.morning_status as 'available' | 'busy' | 'unavailable'
        }
      } else if (!hasRulesConfigured) {
        // No cache entry and no rules - default to available
        morningStatus = 'available'
      }
      if (morningTooSoon) {
        morningStatus = 'unavailable'
      }
      
      slots.push({
        date: dateStr,
        timeSlot: 'morning',
        status: morningStatus,
        available: morningStatus === 'available'
      })

      // Afternoon slot - always respect 'unavailable' status, otherwise default based on rules
      let afternoonStatus: 'available' | 'busy' | 'unavailable' = 'available' // Default to available
      if (availability?.afternoon_status) {
        // Always use cache if it exists (especially for blocked dates)
        if (['available', 'busy', 'unavailable'].includes(availability.afternoon_status)) {
          afternoonStatus = availability.afternoon_status as 'available' | 'busy' | 'unavailable'
        }
      } else if (!hasRulesConfigured) {
        // No cache entry and no rules - default to available
        afternoonStatus = 'available'
      }
      if (afternoonTooSoon) {
        afternoonStatus = 'unavailable'
      }
      
      slots.push({
        date: dateStr,
        timeSlot: 'afternoon',
        status: afternoonStatus,
        available: afternoonStatus === 'available'
      })
      
      // Move to next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      iterations++
    }

    console.log(`[Public Availability API] Returning ${slots.length} slots (${slots.filter(s => s.status === 'available').length} available, ${slots.filter(s => s.status === 'busy').length} busy, ${slots.filter(s => s.status === 'unavailable').length} unavailable)`)

    return NextResponse.json({ slots })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get availability slots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
