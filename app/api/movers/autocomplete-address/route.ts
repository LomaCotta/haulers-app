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
      const address = feature.text || ''
      const addressLine1 = feature.properties?.address || address
      const city = context.find((ctx: any) => ctx.id?.startsWith('place'))?.text || ''
      const state = context.find((ctx: any) => ctx.id?.startsWith('region'))?.text || ''
      const zip = context.find((ctx: any) => ctx.id?.startsWith('postcode'))?.text || ''
      const country = context.find((ctx: any) => ctx.id?.startsWith('country'))?.text || 'US'
      
      return {
        id: feature.id,
        place_name: feature.place_name,
        address: addressLine1,
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

