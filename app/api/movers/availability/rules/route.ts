import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')

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

    // Get availability rules
    const { data: rules, error } = await supabase
      .from('movers_availability_rules')
      .select('*')
      .eq('provider_id', resolvedProviderId)
      .order('weekday')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rules: rules || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch availability rules'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, businessId, rules } = body

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

    // Delete existing rules for this provider
    await supabase
      .from('movers_availability_rules')
      .delete()
      .eq('provider_id', resolvedProviderId)

    // Insert new rules
    if (rules && rules.length > 0) {
      const rulesToInsert = rules.map((rule: any) => ({
        provider_id: resolvedProviderId,
        weekday: rule.weekday,
        start_time: rule.start_time || '08:00:00',
        end_time: rule.end_time || '17:00:00',
        max_concurrent_jobs: rule.max_concurrent_jobs || 1,
        crew_capacity: rule.crew_capacity || 2,
        morning_jobs: rule.morning_jobs || 0,
        afternoon_jobs: rule.afternoon_jobs || 0,
        morning_start: rule.morning_start || '08:00:00',
        afternoon_start: rule.afternoon_start || '12:00:00',
        afternoon_end: rule.afternoon_end || '17:00:00',
      }))

      const { error: insertError } = await supabase
        .from('movers_availability_rules')
        .insert(rulesToInsert)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save availability rules'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

