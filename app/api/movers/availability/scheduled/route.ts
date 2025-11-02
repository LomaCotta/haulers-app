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

    // Check for archive filter
    const showArchived = searchParams.get('showArchived') === 'true'

    // Build query - try with archive filter first, fallback if column doesn't exist
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
    
    // Try to apply archive filter - if column doesn't exist, query will fail
    // We'll catch that and retry without the filter
    let shouldApplyArchiveFilter = !showArchived
    
    query = query
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })

    if (startDate) {
      query = query.gte('scheduled_date', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_date', endDate)
    }

    // Try to apply archive filter if needed
    if (shouldApplyArchiveFilter) {
      query = query.or('is_archived.is.null,is_archived.eq.false')
    }

    let { data: scheduled, error } = await query

    // If error is due to missing column, retry without archive filter
    if (error && (error.message?.includes('is_archived') || error.code === '42703')) {
      console.warn('Archive column not found, ignoring archive filter. Please run migration 025_add_job_archive.sql')
      // Rebuild query without archive filter
      query = supabase
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
      
      const retryResult = await query
      scheduled = retryResult.data
      error = retryResult.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scheduled: scheduled || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scheduled jobs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

