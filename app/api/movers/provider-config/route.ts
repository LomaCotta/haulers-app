import { NextRequest, NextResponse } from 'next/server'
import { loadProviderConfig, loadProviderConfigByBusinessId } from '@/lib/movers/providerConfig'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Ensure no caching at the edge/client
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    const { searchParams } = new URL(request.url)
    let providerId = searchParams.get('providerId')
    const businessId = searchParams.get('businessId')
    const calendarId = searchParams.get('calendarId') // NEW: Support calendarId

    console.log('[Provider Config API] Request:', { providerId, businessId, calendarId })

    // Resolve providerId from calendarId if provided (secure method)
    if (calendarId) {
      const supabase = await createClient()
      const { data: providerData, error: calendarError } = await supabase
        .from('movers_providers')
        .select('id, business_id')
        .eq('calendar_id', calendarId)
        .maybeSingle()
      
      if (calendarError) {
        console.error('[Provider Config API] Error resolving provider from calendarId:', calendarError)
        return NextResponse.json({ error: `Failed to resolve provider: ${calendarError.message}` }, { status: 500, headers })
      }
      
      if (providerData?.id) {
        providerId = providerData.id
        console.log('[Provider Config API] Resolved providerId from calendarId:', providerId)
      } else {
        console.warn('[Provider Config API] No provider found for calendarId:', calendarId)
        return NextResponse.json({ error: 'Provider not found' }, { status: 404, headers })
      }
    }

    // Resolve providerId from businessId if needed (legacy)
    if (!providerId && businessId) {
      const supabase = await createClient()
      const { data, error: provError } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle()
      
      if (provError) {
        console.error('[Provider Config API] Error resolving provider:', provError)
        return NextResponse.json({ error: `Failed to resolve provider: ${provError.message}` }, { status: 500, headers })
      }
      
      if (data?.id) {
        providerId = data.id
        console.log('[Provider Config API] Resolved providerId:', providerId)
      } else {
        console.warn('[Provider Config API] No provider found for businessId:', businessId)
      }
    }

    // If providerId still looks like a business id, attempt resolution
    if (providerId && providerId.includes('-')) {
      const supabase = await createClient()
      const { data, error: provError } = await supabase
        .from('movers_providers')
        .select('id')
        .eq('business_id', providerId)
        .maybeSingle()
      
      if (provError) {
        console.error('[Provider Config API] Error resolving provider (second attempt):', provError)
      } else if (data?.id) {
        providerId = data.id
      }
    }

    if (!providerId && businessId) {
      console.log('[Provider Config API] Loading config by businessId:', businessId)
      const cfgByBiz = await loadProviderConfigByBusinessId(businessId)
      if (cfgByBiz) {
        console.log('[Provider Config API] Config loaded by businessId:', { 
          hasTiers: cfgByBiz.tiers?.length > 0,
          tiersCount: cfgByBiz.tiers?.length || 0
        })
        return NextResponse.json({ success: true, config: cfgByBiz }, { headers })
      } else {
        console.warn('[Provider Config API] No config found for businessId:', businessId)
      }
    }

    if (!providerId) {
      console.error('[Provider Config API] Missing providerId and businessId config not found')
      return NextResponse.json({ error: 'providerId or businessId required' }, { status: 400, headers })
    }

    console.log('[Provider Config API] Loading config by providerId:', providerId)
    const cfg = await loadProviderConfig(providerId)
    console.log('[Provider Config API] Config loaded by providerId:', { 
      hasTiers: cfg.tiers?.length > 0,
      tiersCount: cfg.tiers?.length || 0
    })
    return NextResponse.json({ success: true, config: cfg }, { headers })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load provider config'
    const errorDetails = e instanceof Error ? { message: e.message, stack: e.stack } : { error: String(e) }
    console.error('[Provider Config API] Exception:', errorDetails)
    return NextResponse.json({ error: message, details: errorDetails }, { status: 500 })
  }
}


