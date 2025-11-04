export interface TotalsResult {
  baseHours: number
  movers: number
  perMoverRateCents: number
  teamHourlyCents: number
  baseCents: number
  additionalBilledCents: number
  destinationCents: number
  heavyItemsCents: number
  packingCents: number
  stairsCents: number
  storageCents: number
  insuranceCents: number
  totalDueCents: number
}

function centsFrom(value: any): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return Math.round(value * 100)
  const n = parseFloat(String(value).replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

// Pull first present key; treat *_cents as cents, others as dollars
function getBreakdownValue(br: any, keys: string[]): number {
  for (const k of keys) {
    const v = br?.[k]
    if (v === undefined || v === null || typeof v === 'object') continue
    const keyLower = String(k).toLowerCase()
    const isCents = keyLower.endsWith('_cents') || keyLower.includes('cents')
    if (isCents) {
      const n = typeof v === 'number' ? v : parseFloat(String(v))
      return isNaN(n) ? 0 : Math.round(n)
    }
    return centsFrom(v)
  }
  return 0
}

export function computeTotalDue(booking: any): TotalsResult {
  const sd = booking?.service_details || {}
  const br = sd?.breakdown || {}
  const baseHours = 3

  // Movers and rates
  const movers = sd.mover_team || sd.crew_size || br.mover_team || 0
  const hourlyRateCents = booking.hourly_rate_cents || sd.hourly_rate_cents || (sd.hourly_rate ? Math.round(parseFloat(String(sd.hourly_rate)) * 100) : 0)
  
  // CRITICAL: Determine if hourly_rate_cents is TEAM rate or PER-MOVER rate
  // Check flag first, then use heuristic
  const isTeamRate = sd.hourly_rate_is_team_rate === true || 
                     (hourlyRateCents && movers > 0 && (hourlyRateCents / movers) < 2000) // < $20/hour per mover = likely team rate
  
  let teamHourlyCents = 0
  let perMoverRateCents = 0
  
  if (hourlyRateCents && movers > 0) {
    if (isTeamRate) {
      // hourly_rate_cents is already the TEAM rate
      teamHourlyCents = hourlyRateCents
      perMoverRateCents = Math.round(hourlyRateCents / movers)
    } else {
      // hourly_rate_cents is PER-MOVER rate, multiply by movers
      perMoverRateCents = hourlyRateCents
      teamHourlyCents = hourlyRateCents * movers
    }
  } else if (hourlyRateCents) {
    // If no movers specified, assume it's already team rate
    teamHourlyCents = hourlyRateCents
    perMoverRateCents = hourlyRateCents
  }

  // Base = team hourly * baseHours OR explicit base_hourly(_cents)
  // Support basePrice (dollars) as used by quote breakdowns
  let baseHourlyFromBreakdown = getBreakdownValue(br, ['base_hourly_cents', 'base_hourly', 'baseHourly', 'basePrice'])
  const baseCents = teamHourlyCents > 0 ? Math.round(teamHourlyCents * baseHours) : baseHourlyFromBreakdown

  // Additional hours only when provider confirms
  const est = booking.estimated_duration_hours || sd.estimated_duration_hours || baseHours
  const additionalBilledCents = (sd.bill_additional === true && est > baseHours && teamHourlyCents > 0)
    ? Math.round(teamHourlyCents * (est - baseHours))
    : 0

  // Destination
  let destinationCents = 0
  if (br.destination_fee !== undefined || br.destinationFee !== undefined) destinationCents = getBreakdownValue(br, ['destination_fee_cents', 'destination_fee', 'destinationFee'])
  else if (sd.destination_fee !== undefined) {
    const v = sd.destination_fee
    if (typeof v === 'number') destinationCents = v > 100 ? Math.round(v) : Math.round(v * 100)
    else destinationCents = centsFrom(v)
  }

  // Heavy items
  let heavyItemsCents = 0
  if (Array.isArray(sd.heavy_items) && sd.heavy_items.length > 0) {
    heavyItemsCents = sd.heavy_items.reduce((s: number, it: any) => s + ((it?.price_cents || 0) * (it?.count || 1)), 0)
  } else if (br.heavy_items_cost || br.heavy_items) {
    heavyItemsCents = getBreakdownValue(br, ['heavy_items_cost_cents', 'heavy_items_cost', 'heavy_items'])
  }

  // Packing / stairs
  const packingHelp = sd.packing_help || sd.packing || 'none'
  const packingCents = packingHelp !== 'none' ? getBreakdownValue(br, ['packing_cost_cents', 'packing_cost', 'packingCost', 'packing']) : 0
  const stairsFlights = sd.stairs_flights || 0
  const stairsCents = stairsFlights > 0 ? getBreakdownValue(br, ['stairs_cost_cents', 'stairs_cost', 'stairsCost', 'stairs']) : 0

  // Optional
  const storageCents = getBreakdownValue(br, ['storage_cost_cents', 'storage_cost', 'storageCost', 'storage'])
  const insuranceCents = getBreakdownValue(br, ['insurance_cost_cents', 'insurance_cost', 'insuranceCost', 'insurance'])

  const subtotal = baseCents + additionalBilledCents + destinationCents + heavyItemsCents + packingCents + stairsCents + (storageCents > 0 ? storageCents : 0) + (insuranceCents > 0 ? insuranceCents : 0)
  const addlFees = booking.additional_fees_cents || 0
  const totalDueCents = subtotal + addlFees

  return {
    baseHours,
    movers,
    perMoverRateCents,
    teamHourlyCents,
    baseCents,
    additionalBilledCents,
    destinationCents,
    heavyItemsCents,
    packingCents,
    stairsCents,
    storageCents,
    insuranceCents,
    totalDueCents,
  }
}


