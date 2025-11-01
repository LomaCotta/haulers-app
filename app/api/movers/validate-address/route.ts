import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address, providerBaseZip, serviceRadiusMiles, maxTravelDistanceMiles } = await request.json()
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'Mapbox token not set' }, { status: 503 })
    }

    // Geocode the address
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
    const geocodeRes = await fetch(geocodeUrl)
    const geocodeData = await geocodeRes.json()
    
    if (!geocodeData.features || geocodeData.features.length === 0) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Address could not be found. Please check and try again.' 
      }, { status: 200 })
    }

    const feature = geocodeData.features[0]
    const [lng, lat] = feature.center
    const addressZip = feature.context?.find((ctx: any) => ctx.id?.startsWith('postcode'))?.text || null

    // If we have provider base zip and service radius, check if address is within radius
    if (providerBaseZip && serviceRadiusMiles) {
      // Geocode base zip
      const baseZipUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(providerBaseZip)}.json?access_token=${token}&limit=1&types=postcode`
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
        
        const roundedDistance = Math.round(distanceMiles * 10) / 10 // Round to 1 decimal
        
        // Check max travel distance (hard limit)
        if (maxTravelDistanceMiles && roundedDistance > maxTravelDistanceMiles) {
          return NextResponse.json({
            valid: false,
            error: `This address is ${roundedDistance} miles away, which exceeds our maximum travel distance of ${maxTravelDistanceMiles} miles. Please contact us for special arrangements.`,
            distanceMiles: roundedDistance,
            baseZip: providerBaseZip,
            serviceRadiusMiles: serviceRadiusMiles,
            maxTravelDistanceMiles: maxTravelDistanceMiles,
            withinServiceRadius: false,
            exceedsMaxTravel: true
          }, { status: 200 })
        }
        
        // Check service radius (will charge destination fee if beyond)
        if (roundedDistance > serviceRadiusMiles) {
          return NextResponse.json({
            valid: true,
            lat,
            lng,
            addressZip,
            formattedAddress: feature.place_name,
            distanceMiles: roundedDistance,
            baseZip: providerBaseZip,
            serviceRadiusMiles: serviceRadiusMiles,
            maxTravelDistanceMiles: maxTravelDistanceMiles,
            withinServiceRadius: false,
            warning: `This address is ${roundedDistance} miles away (beyond our standard ${serviceRadiusMiles} mile service area). A destination fee will apply.`
          }, { status: 200 })
        }
        
        return NextResponse.json({
          valid: true,
          lat,
          lng,
          addressZip,
          formattedAddress: feature.place_name,
          distanceMiles: roundedDistance,
          baseZip: providerBaseZip,
          serviceRadiusMiles: serviceRadiusMiles,
          maxTravelDistanceMiles: maxTravelDistanceMiles,
          withinServiceRadius: true
        })
      }
    }

    return NextResponse.json({
      valid: true,
      lat,
      lng,
      addressZip,
      formattedAddress: feature.place_name,
      withinServiceRadius: true
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Address validation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

