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
  destination_fee_per_mile_cents?: number | null
  max_travel_distance_miles?: number | null
}

export type ProviderConfig = {
  policies: ProviderPolicies
  tiers: ProviderTier[]
  heavy_item_tiers?: Array<{ min_weight_lbs: number; max_weight_lbs: number; price_cents: number }>
  packing?: {
    enabled: boolean
    per_room_cents: number
    materials_included: boolean
    materials: Array<{ name: string; price_cents: number; included: boolean }>
  }
  stairs?: { included: boolean; per_flight_cents: number }
}

export async function loadProviderConfig(providerId: string): Promise<ProviderConfig> {
  const supabase = await createClient()

  // Prefer consolidated table; then view; then tables
  const { data: consolidated } = await supabase
    .from('movers_provider_config')
    .select('policies, tiers, heavy_item_tiers, packing')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (consolidated) {
    const packingRaw = (consolidated.packing as any) || {}
    const packingMaterials = packingRaw.materials || []
    
    return {
      policies: {
        base_zip: (consolidated.policies as any)?.base_zip ?? null,
        service_radius_miles: (consolidated.policies as any)?.service_radius_miles ?? null,
        min_lead_minutes: (consolidated.policies as any)?.min_lead_minutes ?? null,
        destination_fee_per_mile_cents: (consolidated.policies as any)?.destination_fee_per_mile_cents ?? null,
        max_travel_distance_miles: (consolidated.policies as any)?.max_travel_distance_miles ?? null,
      },
      tiers: (consolidated.tiers as any[]) || [],
      heavy_item_tiers: (consolidated.heavy_item_tiers as any[]) || [],
      packing: {
        enabled: Boolean(packingRaw.enabled),
        per_room_cents: packingRaw.per_room_cents || 0,
        materials_included: Boolean(packingRaw.materials_included),
        materials: Array.isArray(packingMaterials) ? packingMaterials : [],
      },
      stairs: ((consolidated.policies as any)?.stairs as any) || { included: true, per_flight_cents: 0 }
    }
  }

  // Prefer the existing view if present; fall back to tables if needed
  const { data: viewRows } = await supabase
    .from('v_movers_provider_config')
    .select('base_zip, service_radius_miles, min_lead_minutes, tiers, provider_id')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (viewRows) {
    return {
      policies: {
        base_zip: (viewRows as any).base_zip ?? null,
        service_radius_miles: (viewRows as any).service_radius_miles ?? null,
        min_lead_minutes: (viewRows as any).min_lead_minutes ?? null,
      },
      tiers: ((viewRows as any).tiers as any[]) || [],
    }
  }

  const [provRes, tiersRes, heavyRes, packPolRes, packMatRes, stairsRes] = await Promise.all([
    supabase.from('movers_providers').select('base_zip, service_radius_miles, min_lead_minutes').eq('id', providerId).maybeSingle(),
    supabase.from('movers_pricing_tiers').select('crew_size, min_hours, base_rate_cents, hourly_rate_cents, per_mile_cents').eq('provider_id', providerId).order('crew_size'),
    supabase.from('movers_heavy_item_tiers').select('min_weight_lbs, max_weight_lbs, price_cents').eq('provider_id', providerId).order('min_weight_lbs'),
    supabase.from('movers_packing_policies').select('*').eq('provider_id', providerId).maybeSingle(),
    supabase.from('movers_packing_materials').select('name, price_cents, included').eq('provider_id', providerId).order('name'),
    supabase.from('movers_stairs_policies').select('*').eq('provider_id', providerId).maybeSingle()
  ])

  return {
    policies: {
      base_zip: provRes.data?.base_zip ?? null,
      service_radius_miles: provRes.data?.service_radius_miles ?? null,
      min_lead_minutes: provRes.data?.min_lead_minutes ?? null,
      // Note: destination_fee_per_mile_cents and max_travel_distance_miles don't exist in movers_providers schema
      destination_fee_per_mile_cents: null,
      max_travel_distance_miles: null,
    },
    tiers: tiersRes.data || [],
    heavy_item_tiers: heavyRes.data || [],
    packing: {
      enabled: Boolean(packPolRes.data?.packing_enabled),
      per_room_cents: packPolRes.data?.per_room_cents ?? 0,
      materials_included: Boolean(packPolRes.data?.materials_included),
      materials: packMatRes.data || [],
    },
    stairs: { included: Boolean(stairsRes.data?.included), per_flight_cents: stairsRes.data?.per_flight_cents ?? 0 }
  }
}

export async function loadProviderConfigByBusinessId(businessId: string): Promise<ProviderConfig | null> {
  const supabase = await createClient()
  // First try to resolve provider id and reuse the main loader for full config
  const { data: prov } = await supabase
    .from('movers_providers')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle()

  if (prov?.id) {
    return await loadProviderConfig(prov.id)
  }

  // Fallback: return partial data from view
  const { data: viewRows } = await supabase
    .from('v_movers_provider_config')
    .select('base_zip, service_radius_miles, min_lead_minutes, tiers, business_id')
    .eq('business_id', businessId)
    .maybeSingle()

  if (viewRows) {
    return {
      policies: {
        base_zip: (viewRows as any).base_zip ?? null,
        service_radius_miles: (viewRows as any).service_radius_miles ?? null,
        min_lead_minutes: (viewRows as any).min_lead_minutes ?? null,
        destination_fee_per_mile_cents: (viewRows as any).destination_fee_per_mile_cents ?? null,
        max_travel_distance_miles: (viewRows as any).max_travel_distance_miles ?? null,
      },
      tiers: ((viewRows as any).tiers as any[]) || [],
    }
  }
  return null
}

export function pickTier(tiers: ProviderTier[], crewSize: number): ProviderTier | null {
  if (!tiers?.length) return null
  const exact = tiers.find(t => t.crew_size === crewSize)
  if (exact) return exact
  // nearest by absolute difference
  return tiers.reduce((best, t) => (Math.abs(t.crew_size - crewSize) < Math.abs((best?.crew_size ?? Infinity) - crewSize) ? t : best), tiers[0])
}


