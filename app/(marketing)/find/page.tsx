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
    verified_only: true,
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
      
      let query = supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles!businesses_owner_id_fkey(id, full_name)
        `)
        .eq('verified', true)
        .order('created_at', { ascending: false })

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.location) {
        query = query.or(`city.ilike.%${filters.location}%,state.ilike.%${filters.location}%,address.ilike.%${filters.location}%`)
      }

      if (filters.service_types.length > 0) {
        query = query.in('service_type', filters.service_types)
      }

      if (filters.min_rating > 0) {
        query = query.gte('rating_avg', filters.min_rating)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching businesses:', error)
        setBusinesses([])
        return
      }

      const transformedBusinesses = (data || []).map(business => ({
        ...business,
        service_types: business.service_type ? [business.service_type] : [],
        base_rate_cents: business.base_rate_cents || 0,
        hourly_rate_cents: business.hourly_rate_cents || 0,
        image_url: business.logo_url || business.cover_photo_url || undefined,
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

  const getBookingUrl = (business: Business) => {
    return `/movers/book?businessId=${business.id}`
  }

  const handlePhoneCall = (phone: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.location.href = `tel:${phone}`
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Premium Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                id="search"
                placeholder={serviceCategory ? `Find ${serviceCategory.name.toLowerCase()} services...` : "What service do you need?"}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-11 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg border-gray-200 rounded-xl focus:border-orange-500 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-all"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                id="location"
                placeholder="Where are you located?"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-11 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg border-gray-200 rounded-xl focus:border-orange-500 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-all"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              className="h-12 sm:h-14 px-6 sm:px-8 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-base sm:text-lg"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>

          {/* View Controls & Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-9 sm:h-10 px-3 sm:px-4 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">List</span>
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-9 sm:h-10 px-3 sm:px-4 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Grid</span>
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
                className={`h-9 sm:h-10 px-3 sm:px-4 rounded-lg transition-all ${
                  viewMode === 'map' 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Map</span>
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg border-gray-200 hover:border-gray-300 transition-all"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Category</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger className="bg-white border-gray-200 rounded-lg">
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

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Rating</Label>
                  <Select value={filters.min_rating.toString()} onValueChange={(value) => handleFilterChange('min_rating', parseFloat(value))}>
                    <SelectTrigger className="bg-white border-gray-200 rounded-lg">
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

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</Label>
                  <div className="space-y-2">
                    <Slider
                      value={filters.price_range}
                      onValueChange={(value) => handleFilterChange('price_range', value)}
                      max={1000}
                      min={0}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>${filters.price_range[0]}</span>
                      <span>${filters.price_range[1]}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</Label>
                  <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange('sort_by', value)}>
                    <SelectTrigger className="bg-white border-gray-200 rounded-lg">
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

              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Service Types</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceTypes.map(type => (
                    <Button
                      key={type.id}
                      variant={filters.service_types.includes(type.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleServiceType(type.id)}
                      className={`h-8 rounded-lg transition-all ${
                        filters.service_types.includes(type.id)
                          ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Features</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FEATURE_FILTERS.map(feature => (
                    <div key={feature.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature.id}
                        checked={filters.features.includes(feature.id)}
                        onCheckedChange={() => toggleFeature(feature.id)}
                        className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <Label htmlFor={feature.id} className="text-sm flex items-center cursor-pointer text-gray-700">
                        <feature.icon className="h-3 w-3 mr-1.5" />
                        {feature.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({
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
                  })}
                  className="border-gray-200 hover:border-gray-300 rounded-lg"
                >
                  Clear All Filters
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSearch}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1 tracking-tight">
              {businesses.length} {serviceCategory ? serviceCategory.name : 'Service'} {businesses.length === 1 ? 'Provider' : 'Providers'}
            </h1>
            {filters.location && (
              <p className="text-gray-600 text-sm sm:text-base">
                near {filters.location}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-96 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-1">Interactive map coming soon</p>
              <p className="text-sm text-gray-500">Use list or grid view to browse providers</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {businesses.map((business) => (
              <Link 
                key={business.id} 
                href={`/b/${business.id}`}
                className="block group"
              >
                <Card className="h-full border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-orange-600 transition-colors">{business.name}</h3>
                          {business.donation_badge && (
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5 rounded-md">
                              💚 Donation Partner
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          {business.rating_count > 0 ? (
                            <>
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-orange-400 fill-current" />
                                <span className="ml-1 font-semibold text-gray-900">{business.rating_avg.toFixed(1)}</span>
                              </div>
                              <span className="text-gray-500 text-sm">({business.rating_count})</span>
                            </>
                          ) : (
                            <div className="flex items-center text-orange-600 text-sm">
                              <Star className="h-4 w-4 text-orange-400" />
                              <span className="ml-1">New to Haulers</span>
                            </div>
                          )}
                          {business.distance_km && (
                            <span className="text-gray-500 text-sm">• {formatDistance(business.distance_km)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {business.image_url && (
                      <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-4">
                        <img 
                          src={business.image_url} 
                          alt={business.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">{business.description}</p>

                    {business.phone && (
                      <div 
                        className="space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handlePhoneCall(business.phone!, e)}
                          className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-orange-50 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-all duration-200 cursor-pointer group"
                        >
                          <Phone className="h-5 w-5 text-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-700">{business.phone}</span>
                          {business.service_radius_km && (
                            <>
                              <span className="text-gray-300">•</span>
                              <Navigation className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-600">{business.service_radius_km}km</span>
                            </>
                          )}
                        </button>
                        {business.service_types && business.service_types.length > 0 && (
                          <div className="flex justify-end">
                            <span className="text-xs text-gray-400 opacity-60">
                              {business.service_types[0]?.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {businesses.map((business) => (
              <Link 
                key={business.id} 
                href={`/b/${business.id}`}
                className="block group"
              >
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden cursor-pointer">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {/* Business Image */}
                      <div className="w-full sm:w-28 sm:h-28 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {business.image_url ? (
                          <img 
                            src={business.image_url} 
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="h-8 w-8 sm:h-10 sm:w-10" />
                          </div>
                        )}
                      </div>

                      {/* Business Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-lg sm:text-xl text-gray-900 group-hover:text-orange-600 transition-colors">{business.name}</h3>
                              {business.donation_badge && (
                                <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5 rounded-md">
                                  💚 Donation Partner
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3">
                              {business.rating_count > 0 ? (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-orange-400 fill-current" />
                                  <span className="ml-1.5 font-semibold text-gray-900">{business.rating_avg.toFixed(1)}</span>
                                  <span className="ml-1 text-gray-500 text-sm">({business.rating_count} reviews)</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-orange-600 text-sm">
                                  <Star className="h-4 w-4 text-orange-400" />
                                  <span className="ml-1.5">New to Haulers</span>
                                </div>
                              )}
                              {business.distance_km && (
                                <div className="flex items-center text-gray-500 text-sm">
                                  <Navigation className="h-4 w-4 mr-1" />
                                  {formatDistance(business.distance_km)}
                                </div>
                              )}
                            </div>

                            <p className="text-gray-600 text-sm sm:text-base mb-3 line-clamp-2 leading-relaxed">{business.description}</p>

                            {business.phone && (
                              <button
                                type="button"
                                onClick={(e) => handlePhoneCall(business.phone!, e)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-orange-50 rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-all duration-200 cursor-pointer group mb-4 inline-flex"
                              >
                                <Phone className="h-5 w-5 text-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-700">{business.phone}</span>
                                {business.service_radius_km && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <Navigation className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-600">{business.service_radius_km}km radius</span>
                                  </>
                                )}
                              </button>
                            )}
                            {!business.phone && business.service_radius_km && (
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100 mb-4 inline-flex">
                                <Navigation className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium text-gray-700">{business.service_radius_km}km radius</span>
                              </div>
                            )}
                          </div>

                          {/* Pricing/Book Now */}
                          <div className="flex sm:flex-col items-start sm:items-end gap-2">
                            {business.base_rate_cents && business.base_rate_cents > 0 ? (
                              <div className="text-right">
                                <div className="text-lg sm:text-xl font-semibold text-gray-900">{formatPrice(business.base_rate_cents)}</div>
                                <div className="text-sm text-gray-500">base rate</div>
                                {business.hourly_rate_cents && business.hourly_rate_cents > 0 && (
                                  <div className="text-sm text-gray-500">{formatPrice(business.hourly_rate_cents)}/hr</div>
                                )}
                                {business.service_types && business.service_types.length > 0 && (
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-400 opacity-50">
                                      {business.service_types[0]?.replace('_', ' ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <Button 
                                  asChild 
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-11 px-6 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link href={getBookingUrl(business)} onClick={(e) => e.stopPropagation()}>
                                    Book Now
                                  </Link>
                                </Button>
                                {business.service_types && business.service_types.length > 0 && (
                                  <span className="text-xs text-gray-400 opacity-50">
                                    {business.service_types[0]?.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {businesses.length === 0 && !loading && (
          <div className="text-center py-16 sm:py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Try adjusting your search criteria or location to find more providers
            </p>
            <Button 
              onClick={() => setFilters({
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
              })}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
