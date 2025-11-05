import { NextRequest, NextResponse } from 'next/server'
import { quoteSchema, QuoteInput } from '@/lib/movers/quote'
import { calculateQuoteAsync } from '@/lib/movers/quoteCalculator'
import { loadProviderConfig, pickTier } from '@/lib/movers/providerConfig'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to request a quote'
      }, { status: 401 })
    }

    const body = await request.json()

    let validated: QuoteInput
    try {
      // Parse with schema (will strip unknown fields)
      validated = quoteSchema.parse(body)
      // Manually add heavy_items and packing_materials that might not be in schema yet
      if (body.heavy_items) {
        (validated as any).heavy_items = body.heavy_items
      }
      if (body.packing_materials) {
        (validated as any).packing_materials = body.packing_materials
      }
      if (body.packing_rooms !== undefined) {
        (validated as any).packing_rooms = body.packing_rooms
      }
    } catch (e: any) {
      const errors = e?.errors?.map((err: any) => ({ field: err.path?.join('.'), message: err.message })) || []
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Provider-specific overrides
    let overrides: { perMile?: number; minHours?: number; stairsPolicy?: { included: boolean; per_flight_cents: number }; baseZip?: string; destinationFeePerMileCents?: number; packingConfig?: { enabled: boolean; per_room_cents: number; materials_included: boolean; materials: Array<{ name: string; price_cents: number; included: boolean }> } } = {}
    let providerId: string | undefined = (body?.providerId || body?.provider_id)
    const businessId: string | undefined = body?.businessId
    const calendarId: string | undefined = body?.calendarId // NEW: Support calendarId

    // Resolve providerId from calendarId if provided (secure method)
    if (calendarId) {
      const supabase = await createClient()
      const { data: providerData, error: calendarError } = await supabase
        .from('movers_providers')
        .select('id, business_id')
        .eq('calendar_id', calendarId)
        .maybeSingle()
      
      if (providerData?.id) {
        providerId = providerData.id
      }
    }

    // Resolve providerId from businessId if needed (legacy)
    if (!providerId && businessId) {
      const supabase = await createClient()
      const { data } = await supabase.from('movers_providers').select('id').eq('business_id', businessId).maybeSingle()
      if (data?.id) providerId = data.id
    }
    // If providerId looks like a business id, resolve
    if (providerId && providerId.includes('-')) {
      const supabase = await createClient()
      const { data } = await supabase.from('movers_providers').select('id').eq('business_id', providerId).maybeSingle()
      if (data?.id) providerId = data.id
    }
    
    // Load provider config first to get policies
    let cfg: any = null
    if (providerId) {
      cfg = await loadProviderConfig(providerId)
      
      // Validate addresses against service radius if provider has base zip and service radius
      let validationErrors: string[] = []
      if (cfg.policies?.base_zip && cfg.policies?.service_radius_miles) {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (token) {
          // Helper to geocode and validate
          const validateAddress = async (address: string, addressType: string) => {
            try {
              const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
              const geocodeRes = await fetch(geocodeUrl)
              const geocodeData = await geocodeRes.json()
              
              if (!geocodeData.features || geocodeData.features.length === 0) {
                return { valid: false, error: `${addressType}: Address could not be found. Please check and try again.` }
              }

              const feature = geocodeData.features[0]
              const [lng, lat] = feature.center
              
              // Geocode base zip
              const baseZipUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cfg.policies.base_zip)}.json?access_token=${token}&limit=1&types=postcode`
              const baseZipRes = await fetch(baseZipUrl)
              const baseZipData = await baseZipRes.json()
              
              if (baseZipData.features && baseZipData.features.length > 0) {
                const [baseLng, baseLat] = baseZipData.features[0].center
                
                // Calculate distance using Haversine formula
                const R = 3959 // Earth's radius in miles
                const dLat = (lat - baseLat) * Math.PI / 180
                const dLng = (lng - baseLng) * Math.PI / 180
                const a = 
                  Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(baseLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
                  Math.sin(dLng/2) * Math.sin(dLng/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distanceMiles = R * c
                
                const roundedDistance = Math.round(distanceMiles * 10) / 10
                // Check max travel distance (hard limit)
                if (cfg.policies?.max_travel_distance_miles && roundedDistance > cfg.policies.max_travel_distance_miles) {
                  return { 
                    valid: false, 
                    error: `${addressType}: This address is ${roundedDistance} miles away, which exceeds our maximum travel distance of ${cfg.policies.max_travel_distance_miles} miles. Please contact us for special arrangements.`,
                    exceedsMaxTravel: true
                  }
                }
                // If beyond service radius but within max travel, allow but will charge destination fee
                // No error - just proceed (destination fee will be calculated)
              }
              
              return { valid: true }
            } catch (e) {
              return { valid: false, error: `${addressType}: Failed to validate address` }
            }
          }
          
          // Validate primary pickup and delivery addresses
          if (validated.pickup_address) {
            const pickupValidation = await validateAddress(validated.pickup_address, 'Pickup address')
            if (!pickupValidation.valid) {
              validationErrors.push(pickupValidation.error || 'Pickup address validation failed')
            }
          }
          
          if (validated.dropoff_address) {
            const deliveryValidation = await validateAddress(validated.dropoff_address, 'Delivery address')
            if (!deliveryValidation.valid) {
              validationErrors.push(deliveryValidation.error || 'Delivery address validation failed')
            }
          }
          
          // Validate all additional addresses if provided
          if (validated.all_addresses && validated.all_addresses.length > 0) {
            for (let i = 0; i < validated.all_addresses.length; i++) {
              const address = validated.all_addresses[i]
              if (!address || address.trim() === '') continue
              
              // Skip if already validated as primary pickup/delivery
              if (address === validated.pickup_address || address === validated.dropoff_address) continue
              
              const addrValidation = await validateAddress(address, `Additional address ${i + 1}`)
              if (!addrValidation.valid) {
                validationErrors.push(addrValidation.error || `Additional address ${i + 1} validation failed`)
              }
            }
          }
          
          if (validationErrors.length > 0) {
            return NextResponse.json({ 
              error: 'Address validation failed', 
              details: validationErrors 
            }, { status: 400 })
          }
        }
      }
      
      const tier = pickTier(cfg.tiers, validated.mover_team ?? 2)
      if (tier) {
        overrides.minHours = tier.min_hours || undefined
        overrides.perMile = (tier.per_mile_cents ?? 0) / 100
        // if hourly differs from input, use it
        validated.hourly_rate = (tier.hourly_rate_cents ?? (validated.hourly_rate || 140)) / 100
      }
      // Add stairs policy to overrides if available
      if (cfg.stairs) {
        overrides.stairsPolicy = cfg.stairs
      }
      // Add base zip to overrides if available
      if (cfg.policies?.base_zip) {
        overrides.baseZip = cfg.policies.base_zip
      }
      // Add destination fee per mile to overrides if available
      if (cfg.policies?.destination_fee_per_mile_cents) {
        overrides.destinationFeePerMileCents = cfg.policies.destination_fee_per_mile_cents
      }
      // Add packing config to overrides if available
      if (cfg.packing) {
        overrides.packingConfig = cfg.packing
      }
    }

    const computed = await calculateQuoteAsync(validated, overrides)

    // Store to Supabase movers_quotes
    // User is authenticated at this point (checked above)
    
    // Try to insert quote - user must be authenticated
    let quoteRecord = null
    try {
      const { data, error } = await supabase
        .from('movers_quotes')
        .insert({
          provider_id: null,
          ...(providerId ? { provider_id: providerId } : {}),
          customer_id: user.id, // Set customer_id since user is authenticated
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
        console.error('[Quotes API] Error saving quote to database:', error)
        // If it's an RLS error, return error since user is authenticated
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          return NextResponse.json({ 
            error: 'Permission denied',
            message: 'Unable to save quote. Please try again.',
            details: error.message
          }, { status: 403 })
        }
        // For other errors, still return computed but log the error
        return NextResponse.json({ ...computed, persist_error: error.message })
      }
      
      quoteRecord = data
      console.log('[Quotes API] Quote saved successfully:', { quoteId: data?.id })
    } catch (e) {
      console.error('[Quotes API] Exception saving quote:', e)
      return NextResponse.json({ 
        error: 'Failed to save quote',
        message: 'An error occurred while saving your quote. Please try again.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      quote: quoteRecord || { id: null }, 
      ...computed 
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quote generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


