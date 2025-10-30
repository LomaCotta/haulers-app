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
  breakdown: { base_hourly: number; insurance: number; packing: number; storage: number; total: number }
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
  return distance > 20
}

type CalcOverrides = { perMile?: number; minHours?: number }

export function calculateQuote(params: QuoteInput, overrides: CalcOverrides = {}): { price: QuotePrice; trip_distances: TripDistances; breakdown: any } {
  const {
    pickup_address, dropoff_address, move_size = '1-10', packing_help = 'none', storage = 'none', storage_size = '', ins_coverage = 'basic', mover_team = 2, hourly_rate = 140,
  } = params

  const pickupZip = extractZipCode(pickup_address)
  const dropoffZip = extractZipCode(dropoff_address)
  const distance = distanceApproxMi(pickupZip, dropoffZip)

  const baseHours = overrides.minHours ?? 3
  const baseHourlyCost = hourly_rate * baseHours
  const perMile = overrides.perMile ?? (BASE_PRICES[move_size]?.perMile ?? 3.3)
  const distanceCost = distance * perMile

  const isFullPack = /full/.test((packing_help || '').toLowerCase())
  const packingCost = isFullPack ? 199 : 0

  // storage_size monthly samples
  const storageUnitMonthly: Record<string, number> = { "5' × 10'": 250, "10' × 10'": 300, "10' × 20'": 550 }
  const storageCost = storage_size ? (storageUnitMonthly[storage_size] || 0) : (SERVICE_COSTS.storage[storage as keyof typeof SERVICE_COSTS.storage] || 0)
  const insuranceCost = SERVICE_COSTS.insurance[ins_coverage as keyof typeof SERVICE_COSTS.insurance] || 0

  const baseZip = '91605'
  const pickupFromBase = distanceApproxMi(baseZip, pickupZip)
  const dropoffFromBase = distanceApproxMi(baseZip, dropoffZip)
  const furthestFromBase = Math.max(pickupFromBase, dropoffFromBase)
  const destinationFee = furthestFromBase > 25 ? Math.round(furthestFromBase * 2.3) : 0

  const subtotal = baseHourlyCost + packingCost + storageCost + insuranceCost
  const total = Math.round(subtotal + destinationFee)
  const doubleDriveTime = isDoubleDriveTime(distance)

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
      total,
    },
  }

  const trip_distances: TripDistances = { distance, pickup_zip: pickupZip, dropoff_zip: dropoffZip }
  return { price, trip_distances, breakdown: { basePrice: baseHourlyCost, distanceCost, packingCost, storageCost, insuranceCost, peakSurcharge: 0, total } }
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
  const a = await geocode(params.pickup_address)
  const b = await geocode(params.dropoff_address)
  if (!a.lat || !b.lat) return sync

  const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?annotations=distance,duration&access_token=${token}`
  const res = await fetch(matrixUrl)
  const data = await res.json()
  const meters = data?.distances?.[0]?.[1]
  const seconds = data?.durations?.[0]?.[1]
  if (!meters) return sync
  const miles = meters / 1609.344

  const baseZip = '91605'
  const tripFromBaseA = miles // simple reuse
  const destinationFee = tripFromBaseA > 25 ? Math.round(tripFromBaseA * 2.3) : 0

  const finalTotal = Math.round(
    sync.price.breakdown.base_hourly + sync.price.breakdown.packing + sync.price.breakdown.storage + sync.price.breakdown.insurance + destinationFee
  )

  return {
    price: {
      ...sync.price,
      amount: String(finalTotal),
      destination_fee: String(destinationFee),
      double_drive_time: miles > 20,
      breakdown: { ...sync.price.breakdown, total: finalTotal },
    },
    trip_distances: { ...sync.trip_distances, distance: Math.round(miles), duration: seconds ? Math.round(seconds / 60) : undefined },
    breakdown: sync.breakdown,
  }
}


