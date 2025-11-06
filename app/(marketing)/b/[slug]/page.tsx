'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Calendar,
  MessageCircle,
  Heart,
  Share2,
  Award,
  Shield,
  CheckCircle,
  Users,
  TrendingUp,
  Zap,
  ChevronRight,
  ChevronDown,
  Play,
  Camera,
  Navigation,
  DollarSign,
  Timer,
  Languages,
  ThumbsUp,
  MessageSquare,
  PhoneCall,
  ExternalLink,
  Info,
  AlertCircle,
  Building
} from 'lucide-react'
import Avatar from '@/components/ui/avatar'
import Image from 'next/image'
import Link from 'next/link'
import ModernBookingSystem from '@/components/modern-booking-system'

interface Business {
  id: string
  name: string
  description: string
  rating_avg: number
  rating_count: number
  verified: boolean
  base_rate_cents: number
  hourly_rate_cents: number
  service_types: string[]
  city: string
  state: string
  address: string
  phone: string
  email: string
  website: string
  distance_km: number
  image_url?: string
  cover_photo_url?: string
  gallery_photos?: string[]
  availability_days: string[]
  availability_hours: { start: string; end: string }
  daily_availability?: { [day: string]: { start?: string; end?: string; closed?: boolean } } | null
  services_offered: string[]
  features: string[]
  years_experience: number | null
  insurance_verified: boolean
  background_checked: boolean
  response_time_hours: number | null
  completion_rate: number | null
  total_jobs: number | null
  languages_spoken: string[]
  certifications: string[]
  owner_name: string
  created_at: string
  last_active: string
  emergency_service: boolean
  same_day_service: boolean
  min_booking_notice_hours: number
}

interface Review {
  id: string
  user_name: string
  user_id?: string
  user_avatar?: string
  user_joined_date?: string
  rating: number
  comment: string
  date: string
  helpful: number
  verified: boolean
  owner_response?: string | null
  owner_response_at?: string | null
  review_count?: number
  friend_count?: number
}

export default function BusinessProfilePage() {
  const params = useParams()
  const businessId = params.slug as string
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [ownerProfile, setOwnerProfile] = useState<{id: string; full_name: string; avatar_url?: string} | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) {
        console.log('No businessId provided')
        return
      }
      
      console.log('Fetching business with ID:', businessId)
      
      try {
        setLoading(true)
        
        // Fetch business data with all related information
        let businessData, error
        
        // Try the main query first
        const mainQuery = await supabase
          .from('businesses')
          .select(`
            *,
            owner:profiles(id, full_name)
          `)
          .eq('id', businessId)
          .single()
        
        if (mainQuery.error) {
          console.log('Main query failed, trying fallback query:', mainQuery.error)
          
          // Fallback: try without the JOIN
          const fallbackQuery = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single()
          
          businessData = fallbackQuery.data
          error = fallbackQuery.error
        } else {
          businessData = mainQuery.data
          error = mainQuery.error
        }

        if (error) {
          console.error('Error fetching business:', {
            error,
            businessId,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            errorString: JSON.stringify(error)
          })
          return
        }

        if (businessData) {
          console.log('Business data fetched successfully:', {
            id: businessData.id,
            name: businessData.name,
            verified: businessData.verified,
            verification_status: businessData.verification_status
          })
          
          // Fetch reviews with profile data
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              consumer:profiles(id, full_name, avatar_url, created_at)
            `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

          if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError)
          }

          // Fetch availability from movers_availability_rules
          let availabilityFromRules: Record<string, { start: string; end: string; enabled: boolean }> | null = null
          const { data: provider } = await supabase
            .from('movers_providers')
            .select('id')
            .eq('business_id', businessId)
            .single()

          if (provider) {
            const { data: rules } = await supabase
              .from('movers_availability_rules')
              .select('*')
              .eq('provider_id', provider.id)
              .order('weekday', { ascending: true })

            if (rules && rules.length > 0) {
              const WEEKDAY_TO_DAY: Record<number, string> = {
                0: 'Sunday',
                1: 'Monday',
                2: 'Tuesday',
                3: 'Wednesday',
                4: 'Thursday',
                5: 'Friday',
                6: 'Saturday'
              }
              
              availabilityFromRules = {}
              rules.forEach((rule: any) => {
                const day = WEEKDAY_TO_DAY[rule.weekday]
                if (day) {
                  // Convert time format from HH:MM:SS to HH:MM
                  const startTime = rule.start_time ? rule.start_time.substring(0, 5) : '08:00'
                  const endTime = rule.end_time ? rule.end_time.substring(0, 5) : '17:00'
                  
                  availabilityFromRules![day] = {
                    start: startTime,
                    end: endTime,
                    enabled: true
                  }
                }
              })
              console.log('Fetched availability from movers_availability_rules:', availabilityFromRules)
            } else {
              console.log('No movers_availability_rules found, will use daily_availability fallback')
            }
          }

          // Fetch owner profile data for owner responses
          const ownerId = businessData.owner_id
          let ownerProfile = null
          if (ownerId) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', ownerId)
              .single()
            ownerProfile = ownerData
          }

          // Get review counts and friend counts for each reviewer via API
          const consumerIds = [...new Set((reviewsData || []).map(r => r.consumer_id).filter(Boolean))]
          const reviewCountsMap: Record<string, number> = {}
          const friendCountsMap: Record<string, number> = {}
          
          if (consumerIds.length > 0) {
            try {
              // Fetch stats from API route (bypasses RLS)
              const response = await fetch('/api/users/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: consumerIds })
              })

              if (response.ok) {
                const { stats } = await response.json()
                consumerIds.forEach((userId: string) => {
                  if (stats[userId]) {
                    reviewCountsMap[userId] = stats[userId].reviewCount || 0
                    friendCountsMap[userId] = stats[userId].friendCount || 0
                  } else {
                    reviewCountsMap[userId] = 0
                    friendCountsMap[userId] = 0
                  }
                })
              } else {
                // Fallback: count reviews directly (friends will show 0)
                console.log('API route failed, using fallback')
                for (const userId of consumerIds) {
                  const { count: reviewCount } = await supabase
                    .from('reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('consumer_id', userId)
                  reviewCountsMap[userId] = reviewCount || 0
                  friendCountsMap[userId] = 0
                }
              }
            } catch (err) {
              console.error('Error fetching user stats:', err)
              // Fallback: count reviews directly
              for (const userId of consumerIds) {
                const { count: reviewCount } = await supabase
                  .from('reviews')
                  .select('*', { count: 'exact', head: true })
                  .eq('consumer_id', userId)
                reviewCountsMap[userId] = reviewCount || 0
                friendCountsMap[userId] = 0
              }
            }
          }

          const transformedReviews: Review[] = (reviewsData || []).map(review => ({
            id: review.id,
            user_name: review.consumer?.full_name || 'Anonymous',
            user_id: review.consumer_id || review.consumer?.id,
            user_avatar: review.consumer?.avatar_url || null,
            user_joined_date: review.consumer?.created_at || null,
            rating: review.rating,
            comment: review.body || '',
            date: new Date(review.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            helpful: 0,
            verified: true,
            owner_response: review.owner_response || null,
            owner_response_at: review.owner_response_at || null,
            review_count: reviewCountsMap[review.consumer_id] || 1,
            friend_count: friendCountsMap[review.consumer_id] || 0
          }))

          // Calculate stats
          const totalReviews = transformedReviews.length
          const avgRating = totalReviews > 0 
            ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
            : 0

          // Transform business data
          console.log('Starting business data transformation...')
          
          try {
            const transformedBusiness: Business = {
              id: businessData.id,
              name: businessData.name,
              description: businessData.description,
              rating_avg: avgRating,
              rating_count: totalReviews,
              verified: businessData.verified,
              base_rate_cents: businessData.base_rate_cents || 0,
              hourly_rate_cents: businessData.hourly_rate_cents || 0,
              service_types: businessData.service_type ? [businessData.service_type] : [],
              city: businessData.city || '',
              state: businessData.state || '',
              address: businessData.address || '',
              phone: businessData.phone,
              email: businessData.email,
              website: businessData.website,
              distance_km: 0,
              image_url: businessData.logo_url,
              cover_photo_url: businessData.cover_photo_url,
              gallery_photos: businessData.gallery_photos || [],
              availability_days: businessData.availability_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              availability_hours: businessData.availability_hours || { start: '09:00', end: '17:00' },
              daily_availability: availabilityFromRules || businessData.daily_availability || null,
              services_offered: businessData.services_offered || [],
              features: businessData.features || [],
              years_experience: businessData.years_experience ?? null,
              insurance_verified: businessData.insurance_verified || false,
              background_checked: businessData.background_checked || false,
              response_time_hours: businessData.response_time_hours ?? null,
              completion_rate: businessData.completion_rate ?? null,
              total_jobs: businessData.total_jobs ?? null,
              languages_spoken: businessData.languages_spoken || ['English'],
              certifications: businessData.certifications || [],
              owner_name: businessData.owner?.full_name || 'Business Owner',
              created_at: businessData.created_at,
              last_active: businessData.last_active || 'Recently active',
              emergency_service: businessData.emergency_service || false,
              same_day_service: businessData.same_day_service || false,
              min_booking_notice_hours: businessData.min_booking_notice_hours || 24
            }
            
            console.log('Business data transformed successfully:', transformedBusiness)
            setBusiness(transformedBusiness)
            setReviews(transformedReviews)
            if (ownerProfile) {
              setOwnerProfile(ownerProfile)
            }
          } catch (transformError) {
            console.error('Error transforming business data:', transformError)
            throw transformError
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [businessId])

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getAvailabilityText = () => {
    if (!business) return ''
    const { availability_days, availability_hours } = business
    const days = availability_days.join(', ')
    const hours = `${formatTime(availability_hours.start)} - ${formatTime(availability_hours.end)}`
    return `${days}: ${hours}`
  }

  const getResponseTimeText = () => {
    if (!business) return 'No info yet'
    const hours = business.response_time_hours
    if (hours == null) return 'No info yet'
    if (hours < 1) return 'Under 1 hour'
    if (hours < 24) return `${hours} hours`
    return `${Math.floor(hours / 24)} days`
  }

  const getLastActiveText = () => {
    if (!business) return 'No info yet'
    if (business.last_active === 'Recently active') return 'Recently active'
    return business.last_active
  }

  const handleBookingSuccess = (bookingId: string) => {
    console.log('Booking created successfully:', bookingId)
    setShowBookingForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading business profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
            <p className="text-gray-600 mb-6">This business could not be loaded or may have been removed.</p>
            <Button asChild>
              <Link href="/find">Find Other Services</Link>
            </Button>
          </div>
        </div>
        {/* Debug component - remove in production */}
        <div className="max-w-4xl mx-auto p-4">
        </div>
      </div>
    )
  }

  // Derived visibility flags for trustworthy display
  const isMovers = Array.isArray((business as any).service_types)
    ? (business as any).service_types.some((t: string) => (t || '').toLowerCase().includes('moving'))
    : true
  const hasYears = business.years_experience != null && business.years_experience > 0
  const hasCompletion = business.completion_rate != null && business.completion_rate > 0
  const hasJobs = business.total_jobs != null && business.total_jobs > 0
  const BookingCTA = () => {
    const [providerLink, setProviderLink] = useState<string>('')
    const makeSlug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    useEffect(() => {
      (async () => {
        try {
          const citySlug = makeSlug(business.city || '')
          const companySlug = makeSlug(business.name || '')
          setProviderLink(`/movers/${citySlug}/${companySlug}/book`)
        } catch {}
      })()
    }, [business.id, supabase])
    return (
      <div className="flex">
        {isMovers && (
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl px-6 py-3 rounded-xl"
            asChild
          >
            <Link href={providerLink}>Book Now</Link>
          </Button>
        )}
      </div>
    )
  }

  // Only show response time if we have bookings or reviews to compute it from
  const hasResponse = business.response_time_hours != null 
    && business.response_time_hours > 0 
    && ((business.total_jobs ?? 0) > 0 || business.rating_count > 0)
  const hasTrustFlags = Boolean(business.insurance_verified || business.background_checked)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Cover Photo */}
      <div className="relative h-96 overflow-hidden">
        {business.cover_photo_url ? (
          <Image
            src={business.cover_photo_url}
            alt={`${business.name} cover photo`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        {/* Business Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between">
              <div className="flex items-end space-x-6">
                {/* Business Logo */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-2xl">
                  {business.image_url ? (
                    <Image
                      src={business.image_url}
                      alt={`${business.name} logo`}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {business.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Business Details */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="text-4xl font-bold text-white drop-shadow-lg">{business.name}</h1>
                    {business.verified && (
                      <Badge className="bg-green-500 text-white px-3 py-1.5 shadow-lg">
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-lg">
                    {business.rating_count > 0 && (
                      <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-md" />
                        <span className="font-bold text-white drop-shadow-md">{business.rating_avg.toFixed(1)}</span>
                        <span className="text-gray-200 drop-shadow-md">({business.rating_count} reviews)</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-5 h-5 text-white drop-shadow-md" />
                      <span className="text-white drop-shadow-md">{business.city}, {business.state}</span>
                    </div>
                    
                    {(business.years_experience ?? 0) > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-5 h-5 text-white drop-shadow-md" />
                        <span className="text-white drop-shadow-md">{business.years_experience ?? 0} years experience</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons removed per design */}
              {/* Booking CTA for movers */}
              <BookingCTA />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About / Description */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900">About</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {business.description && business.description.trim().length > 0 && (
                  <p className="text-gray-800 leading-relaxed text-base mb-4">
                    {business.description}
                  </p>
                )}
                {Array.isArray(business.service_types) && business.service_types.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {business.service_types
                      .filter((t: string) => (t || '').toLowerCase() !== 'moving-services' && (t || '').toLowerCase() !== 'moving services')
                      .map((t: string) => (
                      <Badge key={t} variant="secondary" className="px-3 py-1 text-sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Pricing & Booking Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200">
              <CardContent className="p-8">
                <div className="flex">
                  <Button 
                    size="lg" 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                    asChild
                  >
                    <Link href={`/movers/book?businessId=${business.id}`}>
                      <Calendar className="w-5 h-5 mr-2" />
                      Book Now
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4 border-b border-gray-200">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <Info className="w-6 h-6 mr-2 text-blue-600" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {/* Location */}
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 text-base">Location</h3>
                    <p className="text-gray-700 text-base leading-relaxed">{business.address}</p>
                    <p className="text-gray-600 text-base">{business.city}, {business.state}</p>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-start space-x-4">
                  <Clock className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Availability</h3>
                    {business.daily_availability ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => {
                          const entry = business.daily_availability?.[day]
                          // Only show if entry exists and is not closed
                          const isClosed = entry?.closed === true || (!entry?.start && !entry?.end)
                          
                          // Only render if day is not closed
                          if (isClosed) return null
                          
                          return (
                            <div key={day} className="flex items-center justify-between border-b border-gray-100 py-1">
                              <span className="text-gray-700 font-medium mr-4 w-28">{day}</span>
                              <span className="text-gray-600">
                                {entry?.start ? formatTime(entry.start) : ''} {entry?.start && entry?.end ? ' - ' : ''} {entry?.end ? formatTime(entry.end) : ''}
                              </span>
                            </div>
                          )
                        })}
                        {/* Show message if no days are available */}
                        {!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].some(day => {
                          const entry = business.daily_availability?.[day]
                          return entry && !entry.closed && (entry.start || entry.end)
                        }) && (
                          <p className="text-gray-500 text-sm col-span-2">No availability set</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {business.availability_days.map((day) => (
                            <Badge key={day} variant="secondary" className="px-3 py-1">
                              {day}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-gray-700">
                          {formatTime(business.availability_hours.start)} - {formatTime(business.availability_hours.end)}
                        </p>
                      </>
                    )}
                    {business.emergency_service && (
                      <Badge className="bg-red-100 text-red-800 mt-2">
                        <Zap className="w-3 h-3 mr-1" />
                        Emergency Service Available
                      </Badge>
                    )}
                    {business.same_day_service && (
                      <Badge className="bg-blue-100 text-blue-800 mt-2 ml-2">
                        <Timer className="w-3 h-3 mr-1" />
                        Same Day Service
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Services */}
                {business.services_offered.length > 0 && (
                  <div className="flex items-start space-x-4">
                    <Award className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-3 text-base">Services Offered</h3>
                      <div className="flex flex-wrap gap-2">
                        {business.services_offered.map((service) => (
                          <Badge key={service} variant="outline" className="px-3 py-1">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Languages */}
                <div className="flex items-start space-x-4">
                  <Languages className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {business.languages_spoken.map((language) => (
                        <Badge key={language} variant="secondary" className="px-3 py-1">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                {business.certifications.length > 0 && (
                  <div className="flex items-start space-x-4">
                    <Award className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-3 text-base">Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {business.certifications.map((cert) => (
                          <Badge key={cert} className="bg-indigo-100 text-indigo-800 px-3 py-1">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section - Yelp/Thumbtack Style */}
            {reviews.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{business.rating_count} {business.rating_count === 1 ? 'Review' : 'Reviews'}</span>
                  </CardTitle>
                  {business.rating_count > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-semibold text-gray-900">{business.rating_avg.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.round(business.rating_avg) 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                        {/* Review Header - Compact Professional Style */}
                        <div className="flex items-start gap-3 mb-2">
                          {/* Clickable Avatar */}
                          {review.user_id ? (
                            <Link href={`/users/${review.user_id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                              <Avatar 
                                src={review.user_avatar} 
                                alt={review.user_name}
                                size="md"
                                className="shadow-sm"
                                fallbackIcon={
                                  <span className="text-white font-semibold text-xs bg-gradient-to-br from-blue-500 to-purple-500 w-full h-full flex items-center justify-center">
                                    {review.user_name.charAt(0).toUpperCase()}
                                  </span>
                                }
                              />
                            </Link>
                          ) : (
                            <Avatar 
                              src={review.user_avatar} 
                              alt={review.user_name}
                              size="md"
                              className="shadow-sm"
                              fallbackIcon={
                                <span className="text-white font-semibold text-xs bg-gradient-to-br from-blue-500 to-purple-500 w-full h-full flex items-center justify-center">
                                  {review.user_name.charAt(0).toUpperCase()}
                                </span>
                              }
                            />
                          )}
                          
                          {/* Reviewer Info - Inline Compact */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {/* Name */}
                                {review.user_id ? (
                                  <Link href={`/users/${review.user_id}`} className="hover:text-orange-600 transition-colors">
                                    <span className="font-semibold text-sm text-gray-900">{review.user_name}</span>
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-sm text-gray-900">{review.user_name}</span>
                                )}
                                
                                {/* Verified Badge - Icon Only */}
                                {review.verified && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                                
                                {/* Stats - Inline with name */}
                                {(review.friend_count !== undefined && review.friend_count > 0) || (review.review_count && review.review_count > 0) ? (
                                  <>
                                    <span className="text-gray-400 text-[10px]">•</span>
                                    {review.friend_count !== undefined && review.friend_count > 0 && (
                                      <>
                                        <Users className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-600">{review.friend_count}</span>
                                      </>
                                    )}
                                    {review.review_count && review.review_count > 0 && (
                                      <>
                                        {review.friend_count !== undefined && review.friend_count > 0 && (
                                          <span className="text-gray-400 text-[10px]">•</span>
                                        )}
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs text-gray-600">{review.review_count}</span>
                                      </>
                                    )}
                                  </>
                                ) : null}
                              </div>
                              
                              {/* Date - Right aligned */}
                              <span className="text-xs text-gray-500 flex-shrink-0">{review.date}</span>
                            </div>
                            
                            {/* Star Rating */}
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < review.rating 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Review Text - Compact */}
                        <div className="ml-[52px]">
                          <p className="text-gray-800 leading-relaxed text-sm mb-2">
                            {review.comment}
                          </p>
                          
                          {/* Owner Response - Compact Indented */}
                          {review.owner_response && (
                            <div className="mt-2 bg-orange-50 rounded-md p-2.5 border-l-2 border-orange-300">
                              <div className="flex items-start gap-2 mb-1.5">
                                {/* Owner Avatar */}
                                {ownerProfile ? (
                                  <Avatar 
                                    src={ownerProfile.avatar_url || undefined} 
                                    alt={ownerProfile.full_name}
                                    size="sm"
                                    className="flex-shrink-0 shadow-sm"
                                    fallbackIcon={
                                      <span className="text-white font-semibold text-[10px] bg-gradient-to-br from-orange-500 to-orange-600 w-full h-full flex items-center justify-center">
                                        {ownerProfile.full_name.charAt(0).toUpperCase()}
                                      </span>
                                    }
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                    <Building className="w-3.5 h-3.5 text-white" />
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="font-semibold text-orange-900 text-xs">
                                      {ownerProfile ? ownerProfile.full_name : 'Business Owner'}
                                    </span>
                                    <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-normal px-1 py-0 h-3.5 flex items-center">
                                      Owner
                                    </Badge>
                                    {review.owner_response_at && (
                                      <span className="text-[10px] text-orange-600">
                                        {new Date(review.owner_response_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-orange-900 leading-relaxed text-xs whitespace-pre-wrap break-words">
                                    {review.owner_response}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4 border-b border-gray-200">
                <CardTitle className="text-xl font-bold text-gray-900">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {business.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium">{business.phone}</div>
                      <div className="text-sm text-gray-600">Phone</div>
                    </div>
                  </div>
                )}
                
                {business.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">{business.email}</div>
                      <div className="text-sm text-gray-600">Email</div>
                    </div>
                  </div>
                )}
                
                {business.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <div>
                      <a 
                        href={business.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Visit Website
                        <ExternalLink className="w-3 h-3 ml-1 inline" />
                      </a>
                      <div className="text-sm text-gray-600">Website</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gallery */}
            {business.gallery_photos && business.gallery_photos.length > 0 && (
              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-4 border-b border-gray-200">
                  <CardTitle className="text-xl font-bold text-gray-900">Photos</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-3">
                    {business.gallery_photos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={photo}
                          alt={`${business.name} photo ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                  {business.gallery_photos.length > 4 && (
                    <div className="text-center mt-3">
                      <Button variant="outline" size="sm">
                        View All {business.gallery_photos.length} Photos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <Link href={`/movers/${(business.city||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}/${(business.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}/book`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Link>
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => window.open(`tel:${business.phone}`)}
                  >
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(business.address)}`)}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modern Booking System disabled in favor of new movers wizard */}
    </div>
  )
}
