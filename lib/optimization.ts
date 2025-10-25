// Supabase Egress Optimization Utilities

import { createClient } from '@/lib/supabase/client'

// Cache for expensive queries
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function getCachedQuery<T>(key: string): T | null {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

export function setCachedQuery<T>(key: string, data: T): void {
  queryCache.set(key, { data, timestamp: Date.now() })
}

// Optimized business search with minimal data
export async function getBusinessesOptimized(filters: any) {
  const cacheKey = `businesses:${JSON.stringify(filters)}`
  const cached = getCachedQuery(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  // Only select essential fields to reduce egress
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      rating_avg,
      rating_count,
      city,
      state,
      base_rate_cents,
      verified,
      service_types
    `)
    .eq('status', 'verified')
    .limit(20)

  if (error) throw error
  
  setCachedQuery(cacheKey, data)
  return data
}

// Optimized search with pagination
export async function searchBusinessesOptimized(
  query: string,
  location: string,
  page: number = 1,
  limit: number = 20
) {
  const cacheKey = `search:${query}:${location}:${page}:${limit}`
  const cached = getCachedQuery(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  // Use text search with minimal fields
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      rating_avg,
      city,
      state,
      base_rate_cents,
      verified
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('status', 'verified')
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error
  
  setCachedQuery(cacheKey, data)
  return data
}

// Optimized business details
export async function getBusinessDetailsOptimized(id: string) {
  const cacheKey = `business:${id}`
  const cached = getCachedQuery(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
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
      awards
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  setCachedQuery(cacheKey, data)
  return data
}

// Clear cache when data changes
export function clearBusinessCache(id?: string) {
  if (id) {
    queryCache.delete(`business:${id}`)
  } else {
    queryCache.clear()
  }
}

// Usage tracking
export function trackUsage(endpoint: string, dataSize: number) {
  console.log(`📊 Usage: ${endpoint} - ${(dataSize / 1024).toFixed(2)} KB`)
  
  // You can send this to your analytics service
  // analytics.track('api_usage', { endpoint, dataSize })
}
