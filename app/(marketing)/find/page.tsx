"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  Map,
  List,
  Verified,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  X,
  SortAsc,
  SortDesc,
  Grid3X3,
  Menu,
  Navigation,
  Award,
  Shield,
  Users,
  Calendar,
  MessageCircle,
  Bookmark,
  BookmarkCheck
} from "lucide-react"
import { useServiceCategory } from "@/hooks/use-service-category"
import { SERVICE_CATEGORIES } from "@/config/service-categories"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Business {
  id: string
  name: string
  description: string
  rating_avg: number
  rating_count: number
  verified: boolean
  phone?: string
  service_type: string
  city: string
  state: string
  address: string
  postal_code: string
  service_radius_km: number
  created_at: string
  updated_at: string
  donation_badge?: boolean
  owner: {
    id: string
    full_name: string
  }
  // Legacy fields for compatibility
  base_rate_cents?: number
  hourly_rate_cents?: number
  service_types?: string[]
  distance_km?: number
  image_url?: string
  email?: string
  website?: string
  availability?: string[]
  specialties?: string[]
  years_experience?: number
  insurance_verified?: boolean
  background_checked?: boolean
  response_time?: string
  completion_rate?: number
  total_jobs?: number
  last_active?: string
  languages?: string[]
  certifications?: string[]
  awards?: string[]
  is_favorite?: boolean
  is_bookmarked?: boolean
}

interface FilterState {
  search: string
  location: string
  category: string
  service_types: string[]
  min_rating: number
  max_price: number
  verified_only: boolean
  max_distance: number
  availability: string[]
  price_range: [number, number]
  sort_by: string
  features: string[]
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "rating", label: "Highest Rated" },
  { value: "distance", label: "Nearest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "most_reviews", label: "Most Reviews" }
]

const FEATURE_FILTERS = [
  { id: "verified", label: "Verified", icon: Shield },
  { id: "insurance", label: "Insured", icon: Award },
  { id: "background_checked", label: "Background Checked", icon: Shield },
  { id: "same_day", label: "Same Day Available", icon: Clock },
  { id: "emergency", label: "Emergency Service", icon: Phone },
  { id: "licensed", label: "Licensed", icon: Award },
  { id: "bonded", label: "Bonded", icon: Shield },
  { id: "warranty", label: "Warranty", icon: Award }
]

export default function FindPage() {
  const serviceCategory = useServiceCategory()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  
  // Get search parameter from URL
  const [urlSearch, setUrlSearch] = useState('')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const searchParam = urlParams.get('search')
      if (searchParam) {
        setUrlSearch(searchParam)
        setFilters(prev => ({
          ...prev,
          search: searchParam
        }))
      }
    }
  }, [])
  
  const [filters, setFilters] = useState<FilterState>({
    search: urlSearch,
    location: '',
    category: serviceCategory?.id || '',
    service_types: [],
    min_rating: 0,
    max_price: 1000,
    verified_only: true, // Default to showing only verified businesses
    max_distance: 50,
    availability: [],
    price_range: [0, 1000],
    sort_by: 'relevance',
    features: []
  })
  const supabase = createClient()

  const serviceTypes = useMemo(() => {
    if (serviceCategory) {
      return serviceCategory.keywords.map(keyword => ({
        id: keyword.toLowerCase().replace(/\s+/g, '_'),
        label: keyword
      }))
    }
    return [
      { id: 'moving', label: 'Moving' },
      { id: 'junk_haul', label: 'Junk Haul' },
      { id: 'packing', label: 'Packing' },
      { id: 'piano', label: 'Piano Moving' },
      { id: 'storage', label: 'Storage' },
      { id: 'cleaning', label: 'Cleaning' }
    ]
  }, [serviceCategory])

  const handleSearch = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build the query
      let query = supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!businesses_owner_id_fkey(id, full_name)
        `)
        .eq('verified', true) // Only show verified businesses
        .order('created_at', { ascending: false })

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Apply location filter
      if (filters.location) {
        query = query.or(`city.ilike.%${filters.location}%,state.ilike.%${filters.location}%,address.ilike.%${filters.location}%`)
      }

      // Apply service type filter
      if (filters.service_types.length > 0) {
        query = query.in('service_type', filters.service_types)
      }

      // Apply rating filter
      if (filters.min_rating > 0) {
        query = query.gte('rating_avg', filters.min_rating)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching businesses:', error)
        setBusinesses([])
        return
      }

      // Debug: Log business data to see what's available
      console.log('Business data from find page:', data?.map(b => ({
        id: b.id,
        name: b.name,
        logo_url: b.logo_url,
        cover_photo_url: b.cover_photo_url,
        image_url: b.image_url
      })))

      // Transform the data to match the expected format - NO FAKE DATA
      const transformedBusinesses = (data || []).map(business => ({
        ...business,
        // Only use real data from database
        service_types: business.service_type ? [business.service_type] : [],
        base_rate_cents: business.base_rate_cents || 0,
        hourly_rate_cents: business.hourly_rate_cents || 0,
        // Map logo_url to image_url for display
        image_url: business.logo_url || business.cover_photo_url || undefined,
        // Remove all fake/mock data - only show what's actually in the database
        is_favorite: false,
        is_bookmarked: false
      }))

      setBusinesses(transformedBusinesses)
    } catch (error) {
      console.error('Unexpected error:', error)
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [filters, supabase])

  // Auto-search when URL search parameter is set
  useEffect(() => {
    if (urlSearch) {
      handleSearch()
    }
  }, [urlSearch, handleSearch])

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleFeature = (featureId: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }))
  }

  const toggleServiceType = (serviceType: string) => {
    setFilters(prev => ({
      ...prev,
      service_types: prev.service_types.includes(serviceType)
        ? prev.service_types.filter(s => s !== serviceType)
        : [...prev.service_types, serviceType]
    }))
  }

  const toggleFavorite = (businessId: string) => {
    setBusinesses(prev => prev.map(b => 
      b.id === businessId ? { ...b, is_favorite: !b.is_favorite } : b
    ))
  }

  const toggleBookmark = (businessId: string) => {
    setBusinesses(prev => prev.map(b => 
      b.id === businessId ? { ...b, is_bookmarked: !b.is_bookmarked } : b
    ))
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Contact for pricing'
    return `$${(cents / 100).toFixed(0)}`
  }

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder={serviceCategory ? `Find ${serviceCategory.name.toLowerCase()} services...` : "What service do you need?"}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Label htmlFor="location" className="sr-only">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="location"
                    placeholder="Where are you located?"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={handleSearch} className="px-6">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {SERVICE_CATEGORIES.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating Filter */}
                <div>
                  <Label className="text-sm font-medium">Minimum Rating</Label>
                  <Select value={filters.min_rating.toString()} onValueChange={(value) => handleFilterChange('min_rating', parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="text-sm font-medium">Price Range</Label>
                  <div className="space-y-2">
                    <Slider
                      value={filters.price_range}
                      onValueChange={(value) => handleFilterChange('price_range', value)}
                      max={1000}
                      min={0}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>${filters.price_range[0]}</span>
                      <span>${filters.price_range[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <Label className="text-sm font-medium">Sort By</Label>
                  <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange('sort_by', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Types */}
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">Service Types</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceTypes.map(type => (
                    <Button
                      key={type.id}
                      variant={filters.service_types.includes(type.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleServiceType(type.id)}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Feature Filters */}
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">Features</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {FEATURE_FILTERS.map(feature => (
                    <div key={feature.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature.id}
                        checked={filters.features.includes(feature.id)}
                        onCheckedChange={() => toggleFeature(feature.id)}
                      />
                      <Label htmlFor={feature.id} className="text-sm flex items-center">
                        <feature.icon className="h-3 w-3 mr-1" />
                        {feature.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setFilters({
                  search: '',
                  location: '',
                  category: '',
                  service_types: [],
                  min_rating: 0,
                  max_price: 1000,
                  verified_only: false,
                  max_distance: 50,
                  availability: [],
                  price_range: [0, 1000],
                  sort_by: 'relevance',
                  features: []
                })}>
                  Clear All Filters
                </Button>
                <Button size="sm" onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {businesses.length} {serviceCategory ? serviceCategory.name : 'Service'} Providers
            </h1>
            <p className="text-gray-600">
              {filters.location && `near ${filters.location}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Interactive map coming soon</p>
              <p className="text-sm text-gray-400">Use list or grid view to browse providers</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <Card key={business.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{business.name}</h3>
                        {business.verified && (
                          <Badge variant="secondary" className="text-xs">
                            <Verified className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {business.donation_badge && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            💚 Donation Partner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {business.rating_count > 0 ? (
                          <>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="ml-1 font-medium">{business.rating_avg.toFixed(1)}</span>
                            </div>
                            <span className="text-gray-500 text-sm">({business.rating_count} reviews)</span>
                          </>
                        ) : (
                          <div className="flex items-center text-blue-600 text-sm">
                            <Star className="h-4 w-4 text-blue-400" />
                            <span className="ml-1">New to Haulers</span>
                          </div>
                        )}
                        {business.distance_km && (
                          <span className="text-gray-500 text-sm">• {formatDistance(business.distance_km)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(business.id)}
                      >
                        {business.is_favorite ? (
                          <Heart className="h-4 w-4 text-red-500 fill-current" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(business.id)}
                      >
                        {business.is_bookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-blue-500 fill-current" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{business.description}</p>
                  
                   {business.base_rate_cents && business.base_rate_cents > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Base Rate:</span>
                        <span className="font-medium">{formatPrice(business.base_rate_cents)}</span>
                      </div>
                      {business.hourly_rate_cents && business.hourly_rate_cents > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Hourly Rate:</span>
                          <span className="font-medium">{formatPrice(business.hourly_rate_cents)}/hr</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
                     {business.service_types?.slice(0, 3).map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                    {business.service_types && business.service_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{business.service_types.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/b/${business.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map((business) => (
              <Card key={business.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Business Image */}
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                      {business.image_url ? (
                        <img 
                          src={business.image_url} 
                          alt={business.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Business Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{business.name}</h3>
                            {business.verified && (
                              <Badge variant="secondary" className="text-xs">
                                <Verified className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {business.donation_badge && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                💚 Donation Partner
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mb-2">
                            {business.rating_count > 0 ? (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="ml-1 font-medium">{business.rating_avg.toFixed(1)}</span>
                                <span className="ml-1 text-gray-500 text-sm">({business.rating_count} reviews)</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-blue-600 text-sm">
                                <Star className="h-4 w-4 text-blue-400" />
                                <span className="ml-1">New to Haulers</span>
                              </div>
                            )}
                            {business.distance_km && (
                              <div className="flex items-center text-gray-500 text-sm">
                                <Navigation className="h-4 w-4 mr-1" />
                                {formatDistance(business.distance_km)}
                              </div>
                            )}
                          </div>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{business.description}</p>

                          <div className="flex flex-wrap gap-2 mb-3">
                             {business.service_types?.slice(0, 4).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type.replace('_', ' ')}
                              </Badge>
                            ))}
                            {business.service_types && business.service_types.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{business.service_types.length - 4} more
                              </Badge>
                            )}
                          </div>

                          {/* Only show real data from database */}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {business.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                {business.phone}
                              </div>
                            )}
                            {business.service_radius_km && (
                              <div className="flex items-center">
                                <Navigation className="h-4 w-4 mr-1" />
                                {business.service_radius_km}km radius
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFavorite(business.id)}
                            >
                              {business.is_favorite ? (
                                <Heart className="h-4 w-4 text-red-500 fill-current" />
                              ) : (
                                <Heart className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleBookmark(business.id)}
                            >
                              {business.is_bookmarked ? (
                                <BookmarkCheck className="h-4 w-4 text-blue-500 fill-current" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-right">
                             {business.base_rate_cents && business.base_rate_cents > 0 ? (
                              <>
                                <div className="text-lg font-semibold">{formatPrice(business.base_rate_cents)}</div>
                                <div className="text-sm text-gray-500">base rate</div>
                                {business.hourly_rate_cents && business.hourly_rate_cents > 0 && (
                                  <div className="text-sm text-gray-500">{formatPrice(business.hourly_rate_cents)}/hr</div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-gray-500">Contact for pricing</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex gap-2">
                          <Button asChild>
                            <Link href={`/b/${business.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button variant="outline">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                          <Button variant="outline">
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        </div>
                        {/* Remove fake last active info */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {businesses.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or location
            </p>
            <Button onClick={() => setFilters({
              search: '',
              location: '',
              category: '',
              service_types: [],
              min_rating: 0,
              max_price: 1000,
              verified_only: false,
              max_distance: 50,
              availability: [],
              price_range: [0, 1000],
              sort_by: 'relevance',
              features: []
            })}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}