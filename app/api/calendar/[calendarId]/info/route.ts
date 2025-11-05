import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Public Calendar Info API
 * Returns minimal business info for calendar display (no sensitive data)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const { calendarId } = await params

    if (!calendarId) {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get provider_id from calendar_id
    const { data: providerData, error: providerError } = await supabase
      .from('movers_providers')
      .select('id, business_id')
      .eq('calendar_id', calendarId)
      .maybeSingle()

    if (providerError || !providerData) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Get minimal business info (only public fields)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, city, state, description, min_booking_notice_hours')
      .eq('id', providerData.business_id)
      .maybeSingle()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Return ONLY public information - no provider_id, business_id, or sensitive data
    return NextResponse.json({
      calendarId,
      name: business.name,
      city: business.city,
      state: business.state,
      description: business.description,
      minBookingNoticeHours: business.min_booking_notice_hours || 24
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get calendar info'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

