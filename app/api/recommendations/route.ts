import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = await createClient()

    // Get user's booking history and preferences
    let userPreferences = {
      categories: [] as string[],
      service_types: [] as string[],
      price_range: [0, 1000] as [number, number],
      preferred_features: [] as string[]
    }

    if (userId) {
      // Get user's past bookings to understand preferences
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          business:businesses(
            category,
            service_types,
            base_rate_cents,
            verified,
            insurance_verified,
            background_checked
          )
        `)
        .eq('customer_id', userId)
        .eq('status', 'completed')
        .limit(50)

      if (bookings && bookings.length > 0) {
        // Analyze user preferences
        const categories = bookings.map(b => (b.business as any)?.category).filter(Boolean)
        const serviceTypes = bookings.flatMap(b => (b.business as any)?.service_types || [])
        const prices = bookings.map(b => (b.business as any)?.base_rate_cents || 0)
        
        userPreferences.categories = [...new Set(categories)]
        userPreferences.service_types = [...new Set(serviceTypes)]
        userPreferences.price_range = [
          Math.min(...prices) / 100,
          Math.max(...prices) / 100
        ]
        
        // Check for preferred features
        const verifiedCount = bookings.filter(b => (b.business as any)?.verified).length
        const insuranceCount = bookings.filter(b => (b.business as any)?.insurance_verified).length
        const backgroundCount = bookings.filter(b => (b.business as any)?.background_checked).length
        
        if (verifiedCount > bookings.length * 0.7) userPreferences.preferred_features.push('verified')
        if (insuranceCount > bookings.length * 0.7) userPreferences.preferred_features.push('insurance')
        if (backgroundCount > bookings.length * 0.7) userPreferences.preferred_features.push('background_checked')
      }
    }

    // Build recommendation query
    let query = supabase
      .from('businesses')
      .select(`
        *,
        owner:profiles!businesses_owner_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        reviews:reviews(
          id,
          rating,
          comment,
          created_at
        )
      `)
      .eq('status', 'verified')

    // Apply category filter
    if (category) {
      query = query.eq('category', category)
    } else if (userPreferences.categories.length > 0) {
      query = query.in('category', userPreferences.categories)
    }

    // Apply location filter
    if (location) {
      query = query.or(`
        city.ilike.%${location}%,
        state.ilike.%${location}%,
        address.ilike.%${location}%
      `)
    }

    // Apply service type preferences
    if (userPreferences.service_types.length > 0) {
      query = query.overlaps('service_types', userPreferences.service_types)
    }

    // Apply price range preferences
    if (userPreferences.price_range[0] > 0 || userPreferences.price_range[1] < 1000) {
      query = query
        .gte('base_rate_cents', userPreferences.price_range[0] * 100)
        .lte('base_rate_cents', userPreferences.price_range[1] * 100)
    }

    // Apply feature preferences
    if (userPreferences.preferred_features.includes('verified')) {
      query = query.eq('verified', true)
    }
    if (userPreferences.preferred_features.includes('insurance')) {
      query = query.eq('insurance_verified', true)
    }
    if (userPreferences.preferred_features.includes('background_checked')) {
      query = query.eq('background_checked', true)
    }

    // Order by relevance (rating and review count)
    query = query
      .order('rating_avg', { ascending: false })
      .order('rating_count', { ascending: false })
      .limit(limit)

    const { data: businesses, error } = await query

    if (error) {
      console.error('Recommendations error:', error)
      return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
    }

    // Calculate recommendation scores
    const scoredBusinesses = businesses?.map(business => {
      let score = 0
      
      // Base score from rating
      score += (business.rating_avg || 0) * 20
      
      // Bonus for review count
      score += Math.min(business.rating_count || 0, 100) * 0.1
      
      // Bonus for verification
      if (business.verified) score += 10
      if (business.insurance_verified) score += 5
      if (business.background_checked) score += 5
      
      // Bonus for recent activity
      const daysSinceCreated = (Date.now() - new Date(business.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreated < 30) score += 5
      
      // Bonus for completion rate
      if (business.completion_rate > 95) score += 10
      else if (business.completion_rate > 90) score += 5
      
      // Bonus for response time
      if (business.response_time === '1 hour') score += 5
      else if (business.response_time === '2 hours') score += 3
      
      return {
        ...business,
        recommendation_score: score,
        match_reasons: generateMatchReasons(business, userPreferences)
      }
    }) || []

    // Sort by recommendation score
    scoredBusinesses.sort((a, b) => b.recommendation_score - a.recommendation_score)

    return NextResponse.json({
      recommendations: scoredBusinesses,
      user_preferences: userPreferences,
      total: scoredBusinesses.length
    })

  } catch (error) {
    console.error('Recommendations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateMatchReasons(business: any, preferences: any): string[] {
  const reasons = []
  
  if (business.rating_avg >= 4.5) {
    reasons.push('Highly rated')
  }
  
  if (business.verified) {
    reasons.push('Verified business')
  }
  
  if (business.insurance_verified) {
    reasons.push('Fully insured')
  }
  
  if (business.background_checked) {
    reasons.push('Background checked')
  }
  
  if (business.completion_rate >= 95) {
    reasons.push('High completion rate')
  }
  
  if (business.response_time === '1 hour') {
    reasons.push('Quick response')
  }
  
  if (preferences.categories.includes(business.category)) {
    reasons.push('Matches your preferred category')
  }
  
  if (business.service_types.some((type: string) => preferences.service_types.includes(type))) {
    reasons.push('Offers your preferred services')
  }
  
  return reasons
}
