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
  AlertCircle
} from 'lucide-react'
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
  user_avatar?: string
  rating: number
  comment: string
  date: string
  helpful: number
  verified: boolean
}

export default function BusinessProfilePage() {
  const params = useParams()
  const businessId = params.slug as string
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
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
          
          // Fetch reviews
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              consumer:profiles(id, full_name)
            `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

          if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError)
          }

          const transformedReviews: Review[] = (reviewsData || []).map(review => ({
            id: review.id,
            user_name: review.consumer?.full_name || 'Anonymous',
            rating: review.rating,
            comment: review.body || '',
            date: new Date(review.created_at).toLocaleDateString(),
            helpful: 0,
            verified: true
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
              daily_availability: businessData.daily_availability || null,
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
  const BookingCTA = () => (
    <div className="flex gap-3">
      {isMovers && (
        <Button asChild>
          <Link href={`/movers/book?providerId=${business.id}`}>
            Book Now
          </Link>
        </Button>
      )}
    </div>
  )

  // Only show response time if we have bookings or reviews to compute it from
  const hasResponse = business.response_time_hours != null 
    && business.response_time_hours > 0 
    && ((business.total_jobs ?? 0) > 0 || business.rating_count > 0)
  const hasTrustFlags = Boolean(business.insurance_verified || business.background_checked)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-4xl font-bold">{business.name}</h1>
                    {business.verified && (
                      <Badge className="bg-green-500 text-white px-3 py-1">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-lg">
                    {business.rating_count > 0 && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{business.rating_avg.toFixed(1)}</span>
                        <span className="text-gray-300">({business.rating_count} reviews)</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-5 h-5" />
                      <span>{business.city}, {business.state}</span>
                    </div>
                    
                    {(business.years_experience ?? 0) > 0 && (
                      <div className="flex items-center space-x-1">
                        <Award className="w-5 h-5" />
                        <span>{business.years_experience ?? 0} years experience</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  <Heart className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              {/* Booking CTA for movers */}
              <BookingCTA />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About / Description */}
            {business.description && business.description.trim().length > 0 && (
              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            )}
            {/* Pricing & Booking Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing & Booking</h2>
                    <div className="flex items-center space-x-4">
                      {business.base_rate_cents > 0 && (
                        <div className="text-3xl font-bold text-green-600">
                          {formatPrice(business.base_rate_cents)}
                          <span className="text-lg text-gray-600 ml-2">base rate</span>
                        </div>
                      )}
                      {business.hourly_rate_cents > 0 && (
                        <div className="text-2xl font-semibold text-gray-700">
                          {formatPrice(business.hourly_rate_cents)}/hour
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {hasResponse && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Response Time</div>
                      <div className="text-lg font-semibold text-blue-600">{getResponseTimeText()}</div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-4">
                  <Button 
                    size="lg" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg"
                    asChild
                  >
                    <Link href={`/movers/book?providerId=${business.id}`}>
                      <Calendar className="w-5 h-5 mr-2" />
                      Book Now
                    </Link>
                  </Button>
                  
                  <Button size="lg" variant="outline" className="px-6 py-4">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>
                  
                  <Button size="lg" variant="outline" className="px-6 py-4">
                    <Phone className="w-5 h-5 mr-2" />
                    Call
                  </Button>
                </div>
                
                {business.phone && (
                  <div className="mt-4 flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span className="font-medium">{business.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <Info className="w-6 h-6 mr-2 text-blue-600" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location */}
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                    <p className="text-gray-700">{business.address}</p>
                    <p className="text-gray-600">{business.city}, {business.state}</p>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-start space-x-4">
                  <Clock className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                    {business.daily_availability ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => {
                          const entry = business.daily_availability?.[day]
                          const isClosed = entry?.closed === true || (!entry?.start && !entry?.end)
                          return (
                            <div key={day} className="flex items-center justify-between border-b border-gray-100 py-1">
                              <span className="text-gray-700 font-medium mr-4 w-28">{day}</span>
                              <span className="text-gray-600">
                                {isClosed ? (
                                  <Badge variant="secondary" className="px-2 py-0.5">Closed</Badge>
                                ) : (
                                  <>{entry?.start ? formatTime(entry.start) : ''} {entry?.start && entry?.end ? ' - ' : ''} {entry?.end ? formatTime(entry.end) : ''}</>
                                )}
                              </span>
                            </div>
                          )
                        })}
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
                    <Award className="w-6 h-6 text-purple-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Services Offered</h3>
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
                  <Languages className="w-6 h-6 text-orange-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
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
                    <Award className="w-6 h-6 text-indigo-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Certifications</h3>
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

            {/* Performance Stats */}
            {(hasYears || hasCompletion || hasJobs || hasResponse || hasTrustFlags) && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
                  Performance & Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {hasYears && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {business.years_experience}
                      </div>
                      <div className="text-sm text-gray-600">Years Experience</div>
                    </div>
                  )}
                  
                  {hasCompletion && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {business.completion_rate}%
                      </div>
                      <div className="text-sm text-gray-600">Completion Rate</div>
                    </div>
                  )}
                  
                  {hasJobs && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {business.total_jobs}
                      </div>
                      <div className="text-sm text-gray-600">Total Jobs</div>
                    </div>
                  )}
                  
                  {hasResponse && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        {getResponseTimeText()}
                      </div>
                      <div className="text-sm text-gray-600">Response Time</div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex flex-wrap gap-4">
                  {business.insurance_verified && (
                    <div className="flex items-center text-green-600">
                      <Shield className="w-5 h-5 mr-2" />
                      <span className="font-medium">Insurance Verified</span>
                    </div>
                  )}
                  
                  {business.background_checked && (
                    <div className="flex items-center text-blue-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Background Checked</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <Star className="w-6 h-6 mr-2 text-yellow-500" />
                  Reviews ({business.rating_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {review.user_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{review.user_name}</div>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{review.date}</div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                        {review.verified && (
                          <div className="flex items-center text-green-600 mt-2">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">Verified Booking</span>
                          </div>
                        )}
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
              <CardHeader>
                <CardTitle className="text-xl font-bold">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Photos</CardTitle>
                </CardHeader>
                <CardContent>
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
                    <Link href={`/movers/book?providerId=${business.id}`}>
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
