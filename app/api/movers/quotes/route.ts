import { NextRequest, NextResponse } from 'next/server'
import { quoteSchema, QuoteInput } from '@/lib/movers/quote'
import { calculateQuoteAsync } from '@/lib/movers/quoteCalculator'
import { loadProviderConfig, pickTier } from '@/lib/movers/providerConfig'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let validated: QuoteInput
    try {
      validated = quoteSchema.parse(body)
    } catch (e: any) {
      const errors = e?.errors?.map((err: any) => ({ field: err.path?.join('.'), message: err.message })) || []
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Provider-specific overrides
    let overrides: { perMile?: number; minHours?: number } = {}
    let providerId: string | undefined = (body?.providerId || body?.provider_id)
    if (providerId) {
      const cfg = await loadProviderConfig(providerId)
      const tier = pickTier(cfg.tiers, validated.mover_team ?? 2)
      if (tier) {
        overrides.minHours = tier.min_hours || undefined
        overrides.perMile = (tier.per_mile_cents ?? 0) / 100
        // if hourly differs from input, use it
        validated.hourly_rate = (tier.hourly_rate_cents ?? (validated.hourly_rate || 140)) / 100
      }
    }

    const computed = await calculateQuoteAsync(validated, overrides)

    // Store to Supabase movers_quotes
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('movers_quotes')
      .insert({
        provider_id: null,
        ...(providerId ? { provider_id: providerId } : {}),
        full_name: validated.full_name,
        email: validated.email,
        phone: validated.phone,
        pickup_address: validated.pickup_address,
        dropoff_address: validated.dropoff_address,
        move_date: validated.move_date ? new Date(validated.move_date) : null,
        crew_size: validated.mover_team,
        estimated_hours: overrides.minHours ?? 3,
        price_total_cents: parseInt(computed.price.amount) * 100,
        breakdown: computed.price.breakdown,
      })
      .select('*')
      .single()

    if (error) {
      // Non-fatal for user; return computed anyway
      return NextResponse.json({ ...computed, persist_error: error.message })
    }

    return NextResponse.json({ quote: data, ...computed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quote generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


