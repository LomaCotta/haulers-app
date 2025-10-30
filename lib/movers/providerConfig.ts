import { createClient } from '@/lib/supabase/server'

export type ProviderTier = {
  crew_size: number
  min_hours: number
  base_rate_cents: number
  hourly_rate_cents: number
  per_mile_cents: number
}

export type ProviderPolicies = {
  base_zip?: string | null
  service_radius_miles?: number | null
  min_lead_minutes?: number | null
}

export type ProviderConfig = {
  policies: ProviderPolicies
  tiers: ProviderTier[]
}

export async function loadProviderConfig(providerId: string): Promise<ProviderConfig> {
  const supabase = await createClient()
  const [{ data: prov }, { data: tiers }] = await Promise.all([
    supabase.from('movers_providers').select('base_zip, service_radius_miles, min_lead_minutes').eq('id', providerId).single(),
    supabase.from('movers_pricing_tiers').select('crew_size, min_hours, base_rate_cents, hourly_rate_cents, per_mile_cents').eq('provider_id', providerId).order('crew_size'),
  ])

  return {
    policies: {
      base_zip: prov?.base_zip ?? null,
      service_radius_miles: prov?.service_radius_miles ?? null,
      min_lead_minutes: prov?.min_lead_minutes ?? null,
    },
    tiers: tiers || [],
  }
}

export function pickTier(tiers: ProviderTier[], crewSize: number): ProviderTier | null {
  if (!tiers?.length) return null
  const exact = tiers.find(t => t.crew_size === crewSize)
  if (exact) return exact
  // nearest by absolute difference
  return tiers.reduce((best, t) => (Math.abs(t.crew_size - crewSize) < Math.abs((best?.crew_size ?? Infinity) - crewSize) ? t : best), tiers[0])
}


