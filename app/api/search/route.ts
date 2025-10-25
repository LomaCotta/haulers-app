import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const searchSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  service_types: z.array(z.string()).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_price: z.number().min(0).optional(),
  max_distance: z.number().min(0).optional(),
  verified_only: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  sort_by: z.enum(['relevance', 'rating', 'distance', 'price_low', 'price_high', 'newest', 'most_reviews']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate search parameters
    const params = {
      query: searchParams.get('query') || undefined,
      location: searchParams.get('location') || undefined,
      category: searchParams.get('category') || undefined,
      service_types: searchParams.get('service_types')?.split(',') || undefined,
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      max_price: searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : undefined,
      max_distance: searchParams.get('max_distance') ? parseFloat(searchParams.get('max_distance')!) : undefined,
      verified_only: searchParams.get('verified_only') === 'true',
      features: searchParams.get('features')?.split(',') || undefined,
      sort_by: searchParams.get('sort_by') || 'relevance',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined
    }

    const validatedParams = searchSchema.parse(params)
    
    const supabase = await createClient()
    
    // Build the query with minimal fields to reduce egress
    let query = supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        rating_avg,
        rating_count,
        base_rate_cents,
        hourly_rate_cents,
        city,
        state,
        address,
        phone,
        email,
        website,
        verified,
        service_types,
        specialties,
        years_experience,
        insurance_verified,
        background_checked,
        response_time,
        completion_rate,
        total_jobs,
        last_active,
        languages,
        certifications,
        awards,
        created_at,
        lat,
        lng
      `)
      .eq('status', 'verified')

    // Apply filters
    if (validatedParams.category) {
      query = query.eq('category', validatedParams.category)
    }

    if (validatedParams.service_types && validatedParams.service_types.length > 0) {
      query = query.overlaps('service_types', validatedParams.service_types)
    }

    if (validatedParams.min_rating) {
      query = query.gte('rating_avg', validatedParams.min_rating)
    }

    if (validatedParams.max_price) {
      query = query.lte('base_rate_cents', validatedParams.max_price * 100)
    }

    if (validatedParams.verified_only) {
      query = query.eq('verified', true)
    }

    if (validatedParams.features && validatedParams.features.length > 0) {
      // Apply feature filters
      if (validatedParams.features.includes('verified')) {
        query = query.eq('verified', true)
      }
      if (validatedParams.features.includes('insurance')) {
        query = query.eq('insurance_verified', true)
      }
      if (validatedParams.features.includes('background_checked')) {
        query = query.eq('background_checked', true)
      }
      if (validatedParams.features.includes('licensed')) {
        query = query.not('certifications', 'is', null)
      }
    }

    // Text search
    if (validatedParams.query) {
      query = query.or(`
        name.ilike.%${validatedParams.query}%,
        description.ilike.%${validatedParams.query}%,
        specialties.ilike.%${validatedParams.query}%
      `)
    }

    // Location search
    if (validatedParams.location) {
      query = query.or(`
        city.ilike.%${validatedParams.location}%,
        state.ilike.%${validatedParams.location}%,
        address.ilike.%${validatedParams.location}%
      `)
    }

    // Apply sorting
    switch (validatedParams.sort_by) {
      case 'rating':
        query = query.order('rating_avg', { ascending: false })
        break
      case 'distance':
        // In a real implementation, you'd calculate distance using PostGIS
        query = query.order('created_at', { ascending: true })
        break
      case 'price_low':
        query = query.order('base_rate_cents', { ascending: true })
        break
      case 'price_high':
        query = query.order('base_rate_cents', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'most_reviews':
        query = query.order('rating_count', { ascending: false })
        break
      default:
        // Relevance - combine rating and review count
        query = query.order('rating_avg', { ascending: false })
        break
    }

    // Apply pagination
    const page = validatedParams.page || 1
    const limit = validatedParams.limit || 20
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: businesses, error } = await query

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Calculate additional metrics (without expensive reviews query)
    const enrichedBusinesses = businesses?.map(business => {
      return {
        ...business,
        total_reviews: business.rating_count || 0,
        avg_rating: business.rating_avg || 0,
        // Calculate distance if coordinates provided
        distance_km: validatedParams.lat && validatedParams.lng && business.lat && business.lng
          ? calculateDistance(validatedParams.lat, validatedParams.lng, business.lat, business.lng)
          : null
      }
    }) || []

    // Filter by distance if specified
    let filteredBusinesses = enrichedBusinesses
    if (validatedParams.max_distance && validatedParams.lat && validatedParams.lng) {
      const maxDistance = validatedParams.max_distance
      filteredBusinesses = enrichedBusinesses.filter(business => 
        business.distance_km && business.distance_km <= maxDistance
      )
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'verified')

    return NextResponse.json({
      businesses: filteredBusinesses,
      pagination: {
        page: page,
        limit: limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: validatedParams
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}