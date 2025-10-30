import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { pickup, dropoff } = await request.json()
    if (!pickup || !dropoff) return NextResponse.json({ error: 'pickup and dropoff required' }, { status: 400 })

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return NextResponse.json({ error: 'Mapbox token not set' }, { status: 503 })

    // Geocode addresses
    const geocode = async (q: string) => {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}`)
      const data = await res.json()
      const [lng, lat] = data?.features?.[0]?.center || []
      return { lat, lng }
    }

    const a = await geocode(pickup)
    const b = await geocode(dropoff)
    if (!a.lat || !b.lat) return NextResponse.json({ error: 'Failed to geocode' }, { status: 400 })

    // Use Mapbox Directions Matrix for distance
    const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}?annotations=distance&access_token=${token}`
    const res = await fetch(matrixUrl)
    const data = await res.json()
    const meters = data?.distances?.[0]?.[1]
    if (!meters) return NextResponse.json({ error: 'Failed to compute distance' }, { status: 500 })
    const miles = meters / 1609.344
    return NextResponse.json({ miles })
  } catch (e) {
    const m = e instanceof Error ? e.message : 'distance failed'
    return NextResponse.json({ error: m }, { status: 400 })
  }
}


