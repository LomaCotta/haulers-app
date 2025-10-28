"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  DollarSign, 
  Verified, 
  Award, 
  Shield, 
  Users, 
  Calendar, 
  MessageCircle, 
  Heart, 
  Share2, 
  Bookmark, 
  BookmarkCheck,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Camera,
  Star as StarIcon,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

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
  distance_km?: number
  image_url?: string
  phone?: string
  email?: string
  website?: string
  address: string
  availability: string[]
  specialties: string[]
  years_experience: number
  insurance_verified: boolean
  background_checked: boolean
  response_time: string
  completion_rate: number
  total_jobs: number
  last_active: string
  languages: string[]
  certifications: string[]
  awards: string[]
  is_favorite?: boolean
  is_bookmarked?: boolean
  gallery?: string[]
  about?: string
  services?: string[]
  pricing?: {
    service: string
    price: string
    description: string
  }[]
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

export default function BusinessDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [businessId, setBusinessId] = useState<string>('')
  
  useEffect(() => {
    params.then(({ slug }) => setBusinessId(slug))
  }, [params])
  
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isBookingForm, setIsBookingForm] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    service_type: '',
    preferred_date: ''
  })
  
  const supabase = createClient()

  // Mock data - in production, this would come from API
  const mockBusiness: Business = {
    id: '1',
    name: 'Elite Moving Solutions',
    description: 'Professional moving services with 15+ years experience. Specializing in residential and commercial moves.',
    rating_avg: 4.8,
    rating_count: 127,
    verified: true,
    base_rate_cents: 8000,
    hourly_rate_cents: 6000,
    service_types: ['moving', 'packing'],
    city: 'Los Angeles',
    state: 'CA',
    distance_km: 2.3,
    image_url: '/images/moving-1.jpg',
    phone: '(555) 123-4567',
    email: 'info@elitemoving.com',
    website: 'https://elitemoving.com',
    address: '123 Main St, Los Angeles, CA 90210',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    specialties: ['Residential Moves', 'Commercial Moves', 'Piano Moving'],
    years_experience: 15,
    insurance_verified: true,
    background_checked: true,
    response_time: '2 hours',
    completion_rate: 98,
    total_jobs: 1250,
    last_active: '2 hours ago',
    languages: ['English', 'Spanish'],
    certifications: ['DOT Licensed', 'BBB A+ Rating'],
    awards: ['Best Moving Company 2023', 'Customer Choice Award'],
    is_favorite: false,
    is_bookmarked: false,
    gallery: [
      '/images/moving-1.jpg',
      '/images/moving-2.jpg',
      '/images/moving-3.jpg',
      '/images/moving-4.jpg'
    ],
    about: 'Elite Moving Solutions has been serving the Los Angeles area for over 15 years. We specialize in residential and commercial moves, with a focus on providing stress-free relocation experiences. Our team of experienced professionals is fully licensed, insured, and background-checked.',
    services: [
      'Residential Moving',
      'Commercial Moving',
      'Piano Moving',
      'Packing Services',
      'Storage Solutions',
      'Long Distance Moving'
    ],
    pricing: [
      {
        service: 'Local Move (1-2 bedroom)',
        price: '$800 - $1,200',
        description: 'Includes 2 movers, truck, and basic packing materials'
      },
      {
        service: 'Local Move (3-4 bedroom)',
        price: '$1,200 - $1,800',
        description: 'Includes 3 movers, truck, and premium packing materials'
      },
      {
        service: 'Piano Moving',
        price: '$300 - $500',
        description: 'Specialized piano moving with protective equipment'
      }
    ]
  }

  const mockReviews: Review[] = [
    {
      id: '1',
      user_name: 'Sarah Johnson',
      user_avatar: '/avatars/sarah.jpg',
      rating: 5,
      comment: 'Excellent service! The team was professional, punctual, and handled our belongings with great care. Highly recommended!',
      date: '2 weeks ago',
      helpful: 12,
      verified: true
    },
    {
      id: '2',
      user_name: 'Mike Chen',
      user_avatar: '/avatars/mike.jpg',
      rating: 5,
      comment: 'Moved our entire office in one day. Very efficient and organized. Will definitely use again.',
      date: '1 month ago',
      helpful: 8,
      verified: true
    },
    {
      id: '3',
      user_name: 'Emily Rodriguez',
      user_avatar: '/avatars/emily.jpg',
      rating: 4,
      comment: 'Good service overall. The team was friendly and careful with our items. Slightly over the estimated time but worth it.',
      date: '2 months ago',
      helpful: 5,
      verified: true
    }
  ]

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!businessId) return
      
      try {
        setLoading(true)
        
        // Fetch business data from database
        const { data: businessData, error } = await supabase
          .from('businesses')
          .select(`
            *,
            owner:profiles!businesses_owner_id_fkey(id, full_name)
          `)
          .eq('id', businessId)
          .eq('verified', true)
          .single()

        if (error) {
          console.error('Error fetching business:', error)
          setBusiness(null)
          return
        }

        if (businessData) {
          // Fetch real reviews for this business
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              consumer:profiles!reviews_consumer_id_fkey(id, full_name)
            `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

          if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError)
          }

          // Transform reviews data
          const transformedReviews: Review[] = (reviewsData || []).map(review => ({
            id: review.id,
            user_name: review.consumer?.full_name || 'Anonymous',
            user_avatar: undefined,
            rating: review.rating,
            comment: review.body || '',
            date: new Date(review.created_at).toLocaleDateString(),
            helpful: 0, // Not implemented yet
            verified: true // Reviews are from completed bookings
          }))

          // Calculate real rating stats
          const totalReviews = transformedReviews.length
          const avgRating = totalReviews > 0 
            ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
            : 0

          // Transform database data to match interface
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
            // Add default values for fields not in database yet
            distance_km: 0,
            image_url: undefined,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            specialties: [],
            years_experience: businessData.years_experience || 0,
            insurance_verified: businessData.insurance_verified || false,
            background_checked: businessData.background_checked || false,
            response_time: 'No info yet',
            completion_rate: 95,
            total_jobs: 0,
            last_active: 'No info yet',
            languages: businessData.languages_spoken || ['English'],
            certifications: businessData.certifications || [],
            awards: [],
            is_favorite: false,
            is_bookmarked: false,
            gallery: [],
            about: businessData.description,
            services: businessData.services_offered || [],
            pricing: []
          }
          
          setBusiness(transformedBusiness)
          setReviews(transformedReviews)
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        setBusiness(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [businessId])

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Contact form submitted:', contactForm)
    setShowContactForm(false)
  }

  const handleBookNow = () => {
    // Open the contact form for booking
    setIsBookingForm(true)
    setShowContactForm(true)
  }

  const handleMessage = () => {
    // Open the contact form for messaging
    setIsBookingForm(false)
    setShowContactForm(true)
  }

  const toggleFavorite = () => {
    if (business) {
      setBusiness(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
    }
  }

  const toggleBookmark = () => {
    if (business) {
      setBusiness(prev => prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Business not found</h1>
          <Link href="/find">
            <Button>Back to Search</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/find">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 font-medium">{business.rating_avg}</span>
                  <span className="ml-1 text-gray-500">({business.rating_count} reviews)</span>
                </div>
                {business.distance_km && (
                  <div className="flex items-center text-gray-500">
                    <Navigation className="h-4 w-4 mr-1" />
                    {formatDistance(business.distance_km)} away
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleFavorite}>
                {business.is_favorite ? (
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleBookmark}>
                {business.is_bookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-blue-500 fill-current" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            {business.gallery && business.gallery.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                      <img 
                        src={business.gallery[currentImageIndex]} 
                        alt={`${business.name} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {business.gallery.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === 0 ? business.gallery!.length - 1 : prev - 1
                          )}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          onClick={() => setCurrentImageIndex(prev => 
                            prev === business.gallery!.length - 1 ? 0 : prev + 1
                          )}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                          <div className="flex gap-1">
                            {business.gallery.map((_, index) => (
                              <button
                                key={index}
                                className={`w-2 h-2 rounded-full ${
                                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                                onClick={() => setCurrentImageIndex(index)}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About {business.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{business.about}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Services Offered</h4>
                    <ul className="space-y-1">
                      {business.services?.map((service, index) => (
                        <li key={index} className="text-sm text-gray-600">• {service}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Specialties</h4>
                    <ul className="space-y-1">
                      {business.specialties.map((specialty, index) => (
                        <li key={index} className="text-sm text-gray-600">• {specialty}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            {business.pricing && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {business.pricing.map((item, index) => (
                      <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.service}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">{item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews ({business.rating_count})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {review.user_avatar ? (
                            <img 
                              src={review.user_avatar} 
                              alt={review.user_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{review.user_name}</span>
                            {review.verified && (
                              <Badge variant="secondary" className="text-xs">
                                <Verified className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <span className="text-sm text-gray-500">{review.date}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon 
                                key={i} 
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`} 
                              />
                            ))}
                          </div>
                          <p className="text-gray-600 mb-2">{review.comment}</p>
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Helpful ({review.helpful})
                            </Button>
                            <Button variant="ghost" size="sm">
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Not helpful
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <Star className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-500">
                      This business hasn't received any reviews yet. Be the first to book and review their services!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact & Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {formatPrice(business.base_rate_cents)}
                  </div>
                  <div className="text-sm text-gray-500">base rate</div>
                  <div className="text-sm text-gray-500">
                    {formatPrice(business.hourly_rate_cents)}/hour
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" size="lg" onClick={handleBookNow}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    {business.phone && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(`tel:${business.phone}`, '_self')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  {business.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a 
                        href={`tel:${business.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {business.phone}
                      </a>
                    </div>
                  )}
                  {business.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a 
                        href={`mailto:${business.email}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {business.email}
                      </a>
                    </div>
                  )}
                  {business.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={business.website} className="text-sm text-blue-600 hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-600">{business.address}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <div className="flex flex-wrap gap-1">
                    {business.availability.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-1">
                    {business.languages.map((language) => (
                      <Badge key={language} variant="secondary" className="text-xs">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Certifications</h4>
                  <ul className="space-y-1">
                    {business.certifications.map((cert, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <Award className="h-3 w-3 mr-1" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Business Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Years Experience</span>
                  <span className="font-medium">
                    {business.years_experience > 0 ? business.years_experience : 'No info yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-medium">
                    {business.completion_rate > 0 ? `${business.completion_rate}%` : 'No info yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Jobs</span>
                  <span className="font-medium">
                    {business.total_jobs > 0 ? business.total_jobs : 'No info yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="font-medium">{business.response_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Active</span>
                  <span className="font-medium">{business.last_active}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {isBookingForm ? `Book ${business.name}` : `Contact ${business.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="service_type">Service Type</Label>
                  <Input
                    id="service_type"
                    value={contactForm.service_type}
                    onChange={(e) => setContactForm(prev => ({ ...prev, service_type: e.target.value }))}
                    placeholder="e.g., Local Move, Piano Moving"
                  />
                </div>
                <div>
                  <Label htmlFor="preferred_date">Preferred Date</Label>
                  <Input
                    id="preferred_date"
                    type="date"
                    value={contactForm.preferred_date}
                    onChange={(e) => setContactForm(prev => ({ ...prev, preferred_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us about your project..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {isBookingForm ? 'Request Booking' : 'Send Message'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowContactForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
