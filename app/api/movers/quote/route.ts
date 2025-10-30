import { NextRequest, NextResponse } from 'next/server'

// Simple pricing engine based on tiers and inputs; swap with Supabase queries next
type QuoteInput = {
  providerId?: string
  crewSize: number
  estimatedHours: number
  distanceMiles: number
  oversized?: Array<{ name: string; withStairs?: boolean }>
  specialties?: Array<{ name: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteInput
    const { crewSize, estimatedHours, distanceMiles } = body
    if (!crewSize || !estimatedHours) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Placeholder tier mapping; in the next step load from Supabase tables
    const tier = {
      base_rate_cents: [0, 0, 17000, 26000, 37000, 50000][crewSize] || 17000,
      hourly_rate_cents: [0, 0, 10000, 15000, 20000, 25000][crewSize] || 10000,
      per_mile_cents: 353,
      between_locations_per_mile_cents: 300,
      min_hours: 2,
    }

    const hours = Math.max(estimatedHours, tier.min_hours)
    const base = tier.base_rate_cents
    const hourly = Math.round((hours - 2) * tier.hourly_rate_cents)
    const travel = Math.round(Math.max(0, distanceMiles - 10) * tier.per_mile_cents)
    const between = Math.round(Math.max(0, distanceMiles - 10) * tier.between_locations_per_mile_cents)
    const oversized = 0
    const specialty = 0
    const total = base + hourly + travel + between + oversized + specialty

    return NextResponse.json({
      success: true,
      price_total_cents: total,
      breakdown: {
        base_cents: base,
        hourly_cents: hourly,
        travel_cents: travel,
        between_cents: between,
        oversized_cents: oversized,
        specialty_cents: specialty,
      },
      suggested_deposit_cents: Math.round(total * 0.1),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quote failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


