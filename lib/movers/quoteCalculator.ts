import { QuoteInput } from './quote'

type TripDistances = { distance: number; duration?: number; pickup_zip?: string; dropoff_zip?: string }
type QuotePrice = {
  amount: string
  hourly_rate: number
  mover_team: number
  insurance_cost: number
  packing_cost: number
  storage_cost: number
  destination_fee: string
  double_drive_time: boolean
  peak: boolean
  breakdown: { base_hourly: number; insurance: number; packing: number; storage: number; stairs: number; heavy_items: number; total: number }
}

const SERVICE_COSTS = {
  insurance: { basic: 0, standard: 150, premium: 300 },
  storage: { none: 0, temporary: 150, 'long-term': 250 },
}

const BASE_PRICES: Record<string, { perMile: number }> = {
  'studio': { perMile: 3.1 },
  '1-bedroom': { perMile: 3.2 },
  '2-bedroom': { perMile: 3.3 },
  '3-bedroom': { perMile: 3.4 },
  '4+-bedroom': { perMile: 3.5 },
  '1-10': { perMile: 3.3 },
}

function extractZipCode(address?: string): string {
  if (!address) return ''
  const m = address.match(/\b\d{5}(?:-\d{4})?\b/)
  return m ? m[0].slice(0, 5) : ''
}

function distanceApproxMi(zipA?: string, zipB?: string): number {
  if (!zipA || !zipB) return 10
  // lightweight proxy: last two digits delta * 1.2; replaced by real distance in async calc
  const a = parseInt(zipA.slice(3)) || 0
  const b = parseInt(zipB.slice(3)) || 0
  return Math.max(2, Math.abs(a - b) * 1.2)
}

function isDoubleDriveTime(distance: number): boolean {
  return distance > 10 // Double drive time applies if distance between pickup and dropoff is more than 10 miles
}

type CalcOverrides = { perMile?: number; minHours?: number; stairsPolicy?: { included: boolean; per_flight_cents: number }; baseZip?: string; destinationFeePerMileCents?: number; packingConfig?: { enabled: boolean; per_room_cents: number; materials_included: boolean; materials: Array<{ name: string; price_cents: number; included: boolean }> } }

export function calculateQuote(params: QuoteInput, overrides: CalcOverrides = {}): { price: QuotePrice; trip_distances: TripDistances; breakdown: any } {
  const {
    pickup_address, dropoff_address, move_size = '1-10', packing_help = 'none', packing_rooms = 0, storage = 'none', storage_size = '', ins_coverage = 'basic', mover_team = 2, hourly_rate = 140, stairs_flights = 0, heavy_items = [],
  } = params

  const pickupZip = extractZipCode(pickup_address)
  const dropoffZip = extractZipCode(dropoff_address)
  const distance = distanceApproxMi(pickupZip, dropoffZip)

  const baseHours = overrides.minHours ?? 3
  const baseHourlyCost = hourly_rate * baseHours
  const perMile = overrides.perMile ?? (BASE_PRICES[move_size]?.perMile ?? 3.3)
  const distanceCost = distance * perMile

  // Calculate packing cost based on packing_help type and packing_rooms
  let packingCost = 0
  
  // Debug: Log packing calculation inputs
  console.log('[Packing Calculation]', {
    packing_help,
    packing_rooms,
    packingConfig: overrides.packingConfig,
    enabled: overrides.packingConfig?.enabled,
    per_room_cents: overrides.packingConfig?.per_room_cents
  })
  
  // Check if packing is requested (either kit or paygo)
  if (packing_help && packing_help !== 'none' && packing_rooms > 0) {
    if (packing_help === 'kit') {
      // Full Packing Kit: per_room_cents * number of rooms
      if (overrides.packingConfig?.enabled && overrides.packingConfig?.per_room_cents) {
        const perRoomCents = overrides.packingConfig.per_room_cents
        packingCost = (perRoomCents * packing_rooms) / 100
      } else if (overrides.packingConfig?.per_room_cents) {
        // Use per_room_cents even if enabled is false (might be defaulting)
        const perRoomCents = overrides.packingConfig.per_room_cents
        packingCost = (perRoomCents * packing_rooms) / 100
      } else {
        // Fallback: use default $99 per room if no config
        packingCost = 99 * packing_rooms
      }
    } else if (packing_help === 'paygo') {
      // Pay as You Go: calculate from selected materials
      const selectedMaterials = params.packing_materials || []
      if (selectedMaterials.length > 0) {
        // Sum up material costs
        packingCost = selectedMaterials.reduce((sum: number, mat: { price_cents: number; quantity?: number }) => {
          const quantity = mat.quantity || 1
          return sum + ((mat.price_cents || 0) * quantity / 100)
        }, 0)
      }
      // If no materials provided but paygo is selected, use per-room cost if available
      if (packingCost === 0 && packing_rooms > 0 && overrides.packingConfig?.per_room_cents) {
        packingCost = (overrides.packingConfig.per_room_cents * packing_rooms) / 100
      }
    }
  }
  
  console.log('[Packing Cost Result]', packingCost)

  // storage_size monthly samples
  const storageUnitMonthly: Record<string, number> = { "5' × 10'": 250, "10' × 10'": 300, "10' × 20'": 550 }
  const storageCost = storage_size ? (storageUnitMonthly[storage_size] || 0) : (SERVICE_COSTS.storage[storage as keyof typeof SERVICE_COSTS.storage] || 0)
  const insuranceCost = SERVICE_COSTS.insurance[ins_coverage as keyof typeof SERVICE_COSTS.insurance] || 0

  const baseZip = overrides.baseZip || '91605'
  const pickupFromBase = distanceApproxMi(baseZip, pickupZip)
  const dropoffFromBase = distanceApproxMi(baseZip, dropoffZip)
  const furthestFromBase = Math.max(pickupFromBase, dropoffFromBase)
  // Use provider's destination fee rate if available, otherwise default to $2.30/mile for distances > 25 miles
  const destinationFeePerMile = overrides.destinationFeePerMileCents ? overrides.destinationFeePerMileCents / 100 : 2.3
  const destinationFee = furthestFromBase > 25 ? Math.round(furthestFromBase * destinationFeePerMile) : 0

  // Calculate stairs charge
  let stairsCost = 0
  if (stairs_flights > 0 && overrides.stairsPolicy && !overrides.stairsPolicy.included) {
    const perFlightCents = overrides.stairsPolicy.per_flight_cents || 0
    stairsCost = (perFlightCents * stairs_flights) / 100
  }

  // Calculate heavy items charge
  let heavyItemsCost = 0
  
  // Debug: Log heavy items calculation inputs
  console.log('[Heavy Items Calculation]', {
    heavy_items,
    length: heavy_items?.length,
    items: heavy_items
  })
  
  if (heavy_items && heavy_items.length > 0) {
    heavyItemsCost = heavy_items.reduce((sum: number, item: { price_cents?: number; count?: number }) => {
      const priceCents = item.price_cents || 0
      const count = item.count || 0
      const itemCost = (priceCents * count) / 100
      console.log('[Heavy Item]', { priceCents, count, itemCost, item })
      return sum + itemCost
    }, 0)
  }
  
  console.log('[Heavy Items Cost Result]', heavyItemsCost)

  const subtotal = baseHourlyCost + packingCost + storageCost + insuranceCost + stairsCost + heavyItemsCost
  const total = Math.round(subtotal + destinationFee)
  // Double drive time if: (1) distance between pickup/dropoff > 10 miles, OR (2) destination fee applies (meaning at least one address is far from base)
  const doubleDriveTime = isDoubleDriveTime(distance) || (destinationFee > 0)

  const price: QuotePrice = {
    amount: String(total),
    hourly_rate,
    mover_team,
    insurance_cost: insuranceCost,
    packing_cost: packingCost,
    storage_cost: storageCost,
    destination_fee: String(destinationFee),
    double_drive_time: doubleDriveTime,
    peak: false,
    breakdown: {
      base_hourly: baseHourlyCost,
      insurance: insuranceCost,
      packing: packingCost,
      storage: storageCost,
      stairs: stairsCost,
      heavy_items: heavyItemsCost,
      total,
    },
  }

  const trip_distances: TripDistances = { distance, pickup_zip: pickupZip, dropoff_zip: dropoffZip }
  // CRITICAL: Include heavy_items in the breakdown - it was calculated above (heavyItemsCost)
  return { 
    price, 
    trip_distances, 
    breakdown: { 
      basePrice: baseHourlyCost, 
      distanceCost, 
      packingCost, 
      storageCost, 
      insuranceCost, 
      stairsCost, 
      heavy_items: heavyItemsCost, // CRITICAL: Include heavy items cost
      peakSurcharge: 0, 
      total 
    } 
  }
}

export async function calculateQuoteAsync(params: QuoteInput, overrides: CalcOverrides = {}): Promise<{ price: QuotePrice; trip_distances: TripDistances; breakdown: any }>{
  const sync = calculateQuote(params, overrides)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !params.pickup_address || !params.dropoff_address) return sync

  const geocode = async (q: string) => {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}`)
    const data = await res.json()
    const [lng, lat] = data?.features?.[0]?.center || []
    return { lat, lng }
  }

  // Calculate total route distance if multiple addresses are provided
  let miles = 0
  let seconds = 0
  
  // all_addresses array contains: [pickup1, pickup2, ..., delivery1, delivery2, ...]
  // We need to calculate the route: pickup1 -> pickup2 -> ... -> delivery1 -> delivery2 -> ...
  // Calculate total route if we have more than 2 addresses OR if pickup/delivery are different from first addresses
  const hasMultipleAddresses = params.all_addresses && params.all_addresses.length >= 2
  
  if (hasMultipleAddresses) {
    // Filter out empty addresses
    const validAddresses = params.all_addresses.filter(a => a && a.trim() !== '')
    
    if (validAddresses.length > 1) {
      // Geocode all addresses
      const geocodedAddresses = []
      for (const addr of validAddresses) {
        const geo = await geocode(addr)
        if (geo.lat && geo.lng) {
          geocodedAddresses.push(geo)
        }
      }
      
      if (geocodedAddresses.length > 1) {
        // Calculate total distance by summing distances between consecutive addresses
        // Route: A -> B -> C -> D -> ... (all pickups, then all deliveries)
        let totalMeters = 0
        let totalSeconds = 0
        
        for (let i = 0; i < geocodedAddresses.length - 1; i++) {
          const from = geocodedAddresses[i]
          const to = geocodedAddresses[i + 1]
          
          const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?annotations=distance,duration&access_token=${token}`
          const matrixRes = await fetch(matrixUrl)
          const matrixData = await matrixRes.json()
          
          const distMeters = matrixData?.distances?.[0]?.[1]
          const durSeconds = matrixData?.durations?.[0]?.[1]
          
          if (distMeters) {
            totalMeters += distMeters
          }
          if (durSeconds) {
            totalSeconds += durSeconds
          }
        }
        
        miles = totalMeters / 1609.344
        seconds = totalSeconds
      } else {
        // Fallback: use first pickup and delivery
        const a = await geocode(params.pickup_address)
        const b = await geocode(params.dropoff_address)
        if (!a.lat || !b.lat) return sync

        const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?annotations=distance,duration&access_token=${token}`
        const res = await fetch(matrixUrl)
        const data = await res.json()
        const meters = data?.distances?.[0]?.[1]
        seconds = data?.durations?.[0]?.[1] || 0
        if (!meters) return sync
        miles = meters / 1609.344
      }
    } else {
      // Fallback: use first pickup and delivery
      const a = await geocode(params.pickup_address)
      const b = await geocode(params.dropoff_address)
      if (!a.lat || !b.lat) return sync

      const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?annotations=distance,duration&access_token=${token}`
      const res = await fetch(matrixUrl)
      const data = await res.json()
      const meters = data?.distances?.[0]?.[1]
      seconds = data?.durations?.[0]?.[1] || 0
      if (!meters) return sync
      miles = meters / 1609.344
    }
  } else {
    // Single pickup and delivery: calculate direct distance
    const a = await geocode(params.pickup_address)
    const b = await geocode(params.dropoff_address)
    if (!a.lat || !b.lat) return sync

    const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?annotations=distance,duration&access_token=${token}`
    const res = await fetch(matrixUrl)
    const data = await res.json()
    const meters = data?.distances?.[0]?.[1]
    seconds = data?.durations?.[0]?.[1] || 0
    if (!meters) return sync
    miles = meters / 1609.344
  }

  const baseZip = overrides.baseZip || '91605'
  // Calculate distance from base zip if provided
  let tripFromBaseA = miles
  if (baseZip && baseZip !== '91605') {
    // Geocode base zip for accurate distance calculation
    const baseGeo = await geocode(baseZip)
    if (baseGeo.lat) {
      // If all_addresses is provided, find the furthest one from base
      if (params.all_addresses && params.all_addresses.length > 0) {
        let maxDistance = 0
        
        // Check all addresses to find the furthest one
        for (const address of params.all_addresses) {
          if (!address || address.trim() === '') continue
          
          try {
            const addrGeo = await geocode(address)
            if (addrGeo.lat) {
              const addrFromBase = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${baseGeo.lng},${baseGeo.lat};${addrGeo.lng},${addrGeo.lat}?annotations=distance&access_token=${token}`)
              const addrData = await addrFromBase.json()
              const addrMeters = addrData?.distances?.[0]?.[1]
              if (addrMeters) {
                const addrMi = addrMeters / 1609.344
                if (addrMi > maxDistance) {
                  maxDistance = addrMi
                }
              }
            }
          } catch (e) {
            console.error('Error calculating distance for address:', address, e)
          }
        }
        
        if (maxDistance > 0) {
          tripFromBaseA = maxDistance
        }
      } else {
        // Fallback: Calculate distance from base to furthest point (pickup or delivery)
        // Geocode pickup and delivery addresses if not already done
        const pickupGeo = await geocode(params.pickup_address)
        const deliveryGeo = await geocode(params.dropoff_address)
        if (pickupGeo.lat && deliveryGeo.lat) {
          const pickupFromBase = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${baseGeo.lng},${baseGeo.lat};${pickupGeo.lng},${pickupGeo.lat}?annotations=distance&access_token=${token}`)
          const deliveryFromBase = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${baseGeo.lng},${baseGeo.lat};${deliveryGeo.lng},${deliveryGeo.lat}?annotations=distance&access_token=${token}`)
          const pickupData = await pickupFromBase.json()
          const deliveryData = await deliveryFromBase.json()
          const pickupMeters = pickupData?.distances?.[0]?.[1]
          const deliveryMeters = deliveryData?.distances?.[0]?.[1]
          if (pickupMeters && deliveryMeters) {
            const pickupMi = pickupMeters / 1609.344
            const deliveryMi = deliveryMeters / 1609.344
            tripFromBaseA = Math.max(pickupMi, deliveryMi)
          }
        }
      }
    }
  }
  // Use provider's destination fee rate if available, otherwise default to $2.30/mile for distances > 25 miles
  const destinationFeePerMile = overrides.destinationFeePerMileCents ? overrides.destinationFeePerMileCents / 100 : 2.3
  const destinationFee = tripFromBaseA > 25 ? Math.round(tripFromBaseA * destinationFeePerMile) : 0

  // Calculate total distance for all addresses if multiple addresses provided
  // This gives a more accurate picture of the total move distance
  let totalMoveDistance = miles
  if (params.all_addresses && params.all_addresses.length > 2) {
    // If we have multiple addresses, try to calculate a more realistic total distance
    // For now, use the trip distance but we could enhance this to calculate a route
    // The distance shown is between first pickup and first delivery
    // If there's a destination fee, the move is clearly substantial
    totalMoveDistance = miles
  }

  const finalTotal = Math.round(
    sync.price.breakdown.base_hourly + sync.price.breakdown.packing + sync.price.breakdown.storage + sync.price.breakdown.insurance + sync.price.breakdown.stairs + sync.price.breakdown.heavy_items + destinationFee
  )

  // Double drive time if: (1) distance between pickup/dropoff > 10 miles, OR (2) destination fee applies
  const doubleDriveTimeFinal = miles > 10 || destinationFee > 0

  return {
    price: {
      ...sync.price,
      amount: String(finalTotal),
      destination_fee: String(destinationFee),
      double_drive_time: doubleDriveTimeFinal,
      breakdown: { ...sync.price.breakdown, heavy_items: sync.price.breakdown.heavy_items || 0, total: finalTotal },
    },
    trip_distances: { ...sync.trip_distances, distance: Math.round(miles), duration: seconds ? Math.round(seconds / 60) : undefined },
    breakdown: sync.breakdown,
  }
}


