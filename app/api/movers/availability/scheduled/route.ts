import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve provider_id from business_id if needed
    let resolvedProviderId = providerId
    if (!resolvedProviderId && businessId) {
      const { data: provider } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .eq('owner_user_id', user.id)
        .maybeSingle()
      
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      }
      resolvedProviderId = provider.id
    }

    if (!resolvedProviderId) {
      return NextResponse.json({ error: 'Provider ID or Business ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: provider } = await supabase
      .from('movers_providers')
      .select('id')
      .eq('id', resolvedProviderId)
      .eq('owner_user_id', user.id)
      .maybeSingle()

    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('movers_scheduled_jobs')
      .select(`
        *,
        quote:movers_quotes(
          id,
          full_name,
          email,
          phone,
          pickup_address,
          dropoff_address,
          price_total_cents
        )
      `)
      .eq('provider_id', resolvedProviderId)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })

    if (startDate) {
      query = query.gte('scheduled_date', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_date', endDate)
    }

    const { data: scheduled, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scheduled: scheduled || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scheduled jobs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

