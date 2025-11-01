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

    // Get availability rules for weekdays
    const { data: rules } = await supabase
      .from('movers_availability_rules')
      .select('*')
      .eq('provider_id', resolvedProviderId)

    // Get date-specific overrides
    const { data: overrides } = await supabase
      .from('movers_availability_overrides')
      .select('*')
      .eq('provider_id', resolvedProviderId)
      .gte('date', startDate)
      .lte('date', endDate || startDate)

    // Get current bookings
    const { data: bookings } = await supabase
      .from('movers_scheduled_jobs')
      .select('scheduled_date, time_slot')
      .eq('provider_id', resolvedProviderId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate || startDate)
      .in('status', ['scheduled', 'in_progress'])

    // Build availability slots
    const slots: Array<{
      date: string
      timeSlot: 'morning' | 'afternoon'
      available: boolean
      maxJobs: number
      currentBookings: number
    }> = []

    const start = new Date(startDate)
    const end = new Date(endDate || startDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const weekday = d.getDay()

      // Check for date-specific block
      const block = overrides?.find(o => o.date === dateStr && o.kind === 'block')
      if (block) {
        // Date is blocked
        slots.push(
          { date: dateStr, timeSlot: 'morning', available: false, maxJobs: 0, currentBookings: 0 },
          { date: dateStr, timeSlot: 'afternoon', available: false, maxJobs: 0, currentBookings: 0 }
        )
        continue
      }

      // Get rule for this weekday
      const rule = rules?.find(r => r.weekday === weekday)
      
      if (!rule) {
        // No rule = not available
        slots.push(
          { date: dateStr, timeSlot: 'morning', available: false, maxJobs: 0, currentBookings: 0 },
          { date: dateStr, timeSlot: 'afternoon', available: false, maxJobs: 0, currentBookings: 0 }
        )
        continue
      }

      // Check for date-specific override (extra window)
      const extra = overrides?.find(o => o.date === dateStr && o.kind === 'extra')

      // Morning slot
      const morningBookings = bookings?.filter(b => b.scheduled_date === dateStr && b.time_slot === 'morning').length || 0
      const morningMax = extra?.max_concurrent_jobs || rule.morning_jobs || rule.max_concurrent_jobs
      
      slots.push({
        date: dateStr,
        timeSlot: 'morning',
        available: morningBookings < morningMax,
        maxJobs: morningMax,
        currentBookings: morningBookings
      })

      // Afternoon slot
      const afternoonBookings = bookings?.filter(b => b.scheduled_date === dateStr && b.time_slot === 'afternoon').length || 0
      const afternoonMax = extra?.max_concurrent_jobs || rule.afternoon_jobs || rule.max_concurrent_jobs
      
      slots.push({
        date: dateStr,
        timeSlot: 'afternoon',
        available: afternoonBookings < afternoonMax,
        maxJobs: afternoonMax,
        currentBookings: afternoonBookings
      })
    }

    return NextResponse.json({ slots })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get availability slots'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

