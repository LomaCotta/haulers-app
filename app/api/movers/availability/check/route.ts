import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date')
    const timeSlot = searchParams.get('timeSlot') // 'morning' or 'afternoon'

    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'Date and timeSlot are required' }, { status: 400 })
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
        return NextResponse.json({ available: false, error: 'Provider not found' }, { status: 404 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // Use the database function to check availability
    const { data, error } = await supabase.rpc('check_movers_availability', {
      p_provider_id: resolvedProviderId,
      p_date: date,
      p_time_slot: timeSlot
    })

    if (error) {
      console.error('Error checking availability:', error)
      return NextResponse.json({ available: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ available: Boolean(data) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check availability'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

