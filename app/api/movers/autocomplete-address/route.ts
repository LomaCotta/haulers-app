import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '5')
    
    if (!query || query.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'Mapbox token not set' }, { status: 503 })
    }

    // Use Mapbox Geocoding API with address type filter
    const autocompleteUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=${limit}&types=address&country=US`
    const res = await fetch(autocompleteUrl)
    const data = await res.json()
    
    if (!data.features) {
      return NextResponse.json({ suggestions: [] })
    }

    const suggestions = data.features.map((feature: any) => {
      const [lng, lat] = feature.center
      const context = feature.context || []
      
      // Extract address components
      // Mapbox API structure:
      // - feature.text = street name (may or may not include number, unreliable)
      // - feature.properties.address = street number (may or may not exist)
      // - feature.place_name = full formatted address (e.g., "123 Elm St, City, State") - MOST RELIABLE
      
      // CRITICAL: Extract street address from place_name (first part before comma)
      // This always includes the full address with street number
      let addressLine1 = ''
      if (feature.place_name) {
        const placeParts = feature.place_name.split(',')
        // First part is the full street address with number (e.g., "123 Elm St")
        addressLine1 = placeParts[0]?.trim() || ''
      }
      
      // If place_name extraction didn't yield a result with a number, try properties
      if (!addressLine1 || !/^\d+/.test(addressLine1.trim())) {
        const streetNumber = feature.properties?.address || ''
        const streetName = feature.text || ''
        
        // Combine street number and name if both exist
        if (streetNumber && streetName) {
          addressLine1 = `${streetNumber} ${streetName}`.trim()
        } else if (streetName && !addressLine1) {
          // Only street name available, use it
          addressLine1 = streetName
        } else if (streetNumber && !addressLine1) {
          // Only street number available, use it
          addressLine1 = streetNumber
        }
        
        // If we still have place_name but no number, use place_name
        if (!addressLine1 && feature.place_name) {
          const placeParts = feature.place_name.split(',')
          addressLine1 = placeParts[0]?.trim() || ''
        }
      }
      
      const city = context.find((ctx: any) => ctx.id?.startsWith('place'))?.text || ''
      const state = context.find((ctx: any) => ctx.id?.startsWith('region'))?.text || ''
      const zip = context.find((ctx: any) => ctx.id?.startsWith('postcode'))?.text || ''
      const country = context.find((ctx: any) => ctx.id?.startsWith('country'))?.text || 'US'
      
      return {
        id: feature.id,
        place_name: feature.place_name,
        address: addressLine1.trim(),
        city,
        state,
        zip,
        country,
        lat,
        lng,
        fullAddress: feature.place_name
      }
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Autocomplete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

