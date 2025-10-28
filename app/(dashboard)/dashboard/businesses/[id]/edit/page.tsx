'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { SERVICE_CATEGORIES } from '@/config/service-categories'
import { BusinessPhotoUpload } from '@/components/ui/business-photo-upload'
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail, 
  Globe, 
  Shield, 
  Award, 
  Calendar,
  Plus,
  X,
  Star,
  MapPin,
  Users,
  Settings,
  Camera,
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  description: string
  phone: string
  email?: string
  website?: string
  service_type: string
  address: string
  city: string
  state: string
  postal_code: string
  service_radius_km: number
  verified: boolean
  donation_badge?: boolean
  owner_id: string
  // Enhanced fields
  base_rate_cents?: number
  hourly_rate_cents?: number
  availability_days?: string[]
  availability_hours?: any
  services_offered?: string[]
  features?: string[]
  years_experience?: number
  languages_spoken?: string[]
  certifications?: string[]
  emergency_service?: boolean
  same_day_service?: boolean
  insurance_verified?: boolean
  licensed?: boolean
  bonded?: boolean
  response_time_hours?: number
  min_booking_notice_hours?: number
  // Photo fields
  logo_url?: string
  cover_photo_url?: string
  gallery_photos?: string[]
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

const COMMON_SERVICES = [
  'Residential Moving', 'Commercial Moving', 'Packing Services', 'Unpacking',
  'Furniture Assembly', 'Storage Solutions', 'Junk Removal', 'Cleaning Services',
  'Piano Moving', 'Antique Moving', 'White Glove Service', 'Same Day Service',
  'Emergency Service', 'Long Distance Moving', 'Local Moving', 'Office Relocation'
]

const COMMON_FEATURES = [
  'Free Estimates', 'Insurance Coverage', 'Licensed & Bonded', 'Background Checked',
  'Eco-Friendly', 'Same Day Service', 'Emergency Service', 'Free Consultation',
  'Warranty Included', '24/7 Support', 'Online Booking', 'Payment Plans'
]

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean'
]

const COMMON_CERTIFICATIONS = [
  'DOT Licensed', 'BBB A+ Rating', 'Green Certified', 'Piano Moving Certified',
  'Antique Specialist', 'Commercial Moving Certified', 'Insurance Verified'
]

export default function EditBusinessPage() {
  const params = useParams()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string>('')
  const [newService, setNewService] = useState('')
  const [newFeature, setNewFeature] = useState('')
  const [newLanguage, setNewLanguage] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    service_type: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    service_radius_km: 25,
    base_rate_cents: 0,
    hourly_rate_cents: 0,
    availability_days: [] as string[],
    availability_hours: { start: '09:00', end: '17:00' },
    services_offered: [] as string[],
    features: [] as string[],
    years_experience: 0,
    languages_spoken: [] as string[],
    certifications: [] as string[],
    emergency_service: false,
    same_day_service: false,
    insurance_verified: false,
    licensed: false,
    bonded: false,
    response_time_hours: 24,
    min_booking_notice_hours: 24,
  })

  const [photos, setPhotos] = useState({
    logo_url: '',
    cover_photo_url: '',
    gallery_photos: [] as string[]
  })

  useEffect(() => {
    if (params.id) {
      fetchBusiness(params.id as string)
    }
  }, [params.id])

  const fetchBusiness = async (businessId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
      }

      // Allow admins to edit any business, owners to edit their own
      let query = supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)

      if (profile?.role !== 'admin') {
        query = query.eq('owner_id', user.id)
      }

      const { data, error } = await query.single()

      if (error) {
        console.error('Error fetching business:', error)
        router.push('/dashboard/businesses')
        return
      }

      setBusiness(data)
      setFormData({
        name: data.name || '',
        description: data.description || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        service_type: data.service_type || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        service_radius_km: data.service_radius_km || 25,
        base_rate_cents: data.base_rate_cents || 0,
        hourly_rate_cents: data.hourly_rate_cents || 0,
        availability_days: data.availability_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availability_hours: data.availability_hours || { start: '09:00', end: '17:00' },
        services_offered: data.services_offered || [],
        features: data.features || [],
        years_experience: data.years_experience || 0,
        languages_spoken: data.languages_spoken || ['English'],
        certifications: data.certifications || [],
        emergency_service: data.emergency_service || false,
        same_day_service: data.same_day_service || false,
        insurance_verified: data.insurance_verified || false,
        licensed: data.licensed || false,
        bonded: data.bonded || false,
        response_time_hours: data.response_time_hours || 24,
        min_booking_notice_hours: data.min_booking_notice_hours || 24,
      })
      
      setPhotos({
        logo_url: data.logo_url || '',
        cover_photo_url: data.cover_photo_url || '',
        gallery_photos: data.gallery_photos || []
      })
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard/businesses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !business) return

      // If user is admin, update directly
      if (userRole === 'admin') {
        const updateData: any = {
          description: formData.description,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          service_type: formData.service_type,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          service_radius_km: formData.service_radius_km,
          base_rate_cents: formData.base_rate_cents,
          hourly_rate_cents: formData.hourly_rate_cents,
          availability_days: formData.availability_days,
          availability_hours: formData.availability_hours,
          services_offered: formData.services_offered,
          features: formData.features,
          years_experience: formData.years_experience,
          languages_spoken: formData.languages_spoken,
          certifications: formData.certifications,
          emergency_service: formData.emergency_service,
          same_day_service: formData.same_day_service,
          insurance_verified: formData.insurance_verified,
          licensed: formData.licensed,
          bonded: formData.bonded,
          response_time_hours: formData.response_time_hours,
          min_booking_notice_hours: formData.min_booking_notice_hours,
          name: formData.name, // Admins can change business name
          // Photo data
          logo_url: photos.logo_url,
          cover_photo_url: photos.cover_photo_url,
          gallery_photos: photos.gallery_photos,
        }

        const { error: updateError } = await supabase
          .from('businesses')
          .update(updateData)
          .eq('id', business.id)

        if (updateError) {
          setError('Failed to update business: ' + updateError.message)
          return
        }

        router.push('/dashboard/businesses')
      } else {
        // For business owners, submit changes for admin approval
        const proposedChanges: any = {
          description: formData.description,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          service_type: formData.service_type,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          service_radius_km: formData.service_radius_km,
          base_rate_cents: formData.base_rate_cents,
          hourly_rate_cents: formData.hourly_rate_cents,
          availability_days: formData.availability_days,
          availability_hours: formData.availability_hours,
          services_offered: formData.services_offered,
          features: formData.features,
          years_experience: formData.years_experience,
          languages_spoken: formData.languages_spoken,
          certifications: formData.certifications,
          emergency_service: formData.emergency_service,
          same_day_service: formData.same_day_service,
          insurance_verified: formData.insurance_verified,
          licensed: formData.licensed,
          bonded: formData.bonded,
          response_time_hours: formData.response_time_hours,
          min_booking_notice_hours: formData.min_booking_notice_hours,
          // Photo data
          logo_url: photos.logo_url,
          cover_photo_url: photos.cover_photo_url,
          gallery_photos: photos.gallery_photos,
        }

        const { error: submitError } = await supabase
          .from('business_edit_requests')
          .insert({
            business_id: business.id,
            requester_id: user.id,
            proposed_changes: proposedChanges,
            status: 'pending'
          })

        if (submitError) {
          console.error('Submit error:', submitError)
          // If table doesn't exist, show helpful message
          if (submitError.code === '42P01') {
            setError('The edit approval system is not set up yet. Please contact an administrator to run the required SQL script.')
            return
          }
          setError('Failed to submit changes for approval: ' + submitError.message)
          return
        }

        // Show success message and redirect
        alert('Changes submitted for admin approval. You will be notified when they are reviewed.')
        router.push('/dashboard/businesses')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const addService = () => {
    if (newService.trim() && !formData.services_offered.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services_offered: [...prev.services_offered, newService.trim()]
      }))
      setNewService('')
    }
  }

  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.filter(s => s !== service)
    }))
  }

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }))
      setNewFeature('')
    }
  }

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }))
  }

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages_spoken.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages_spoken: [...prev.languages_spoken, newLanguage.trim()]
      }))
      setNewLanguage('')
    }
  }

  const removeLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages_spoken: prev.languages_spoken.filter(l => l !== language)
    }))
  }

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }))
      setNewCertification('')
    }
  }

  const removeCertification = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification)
    }))
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability_days: prev.availability_days.includes(day)
        ? prev.availability_days.filter(d => d !== day)
        : [...prev.availability_days, day]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading business...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Business not found</h3>
        <p className="text-gray-600 mb-6">
          The business you're looking for doesn't exist or you don't have permission to edit it.
        </p>
        <Button asChild>
          <Link href="/dashboard/businesses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Businesses
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" asChild className="bg-white/80 backdrop-blur-sm border-orange-200 hover:bg-orange-50">
              <Link href="/dashboard/businesses">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Businesses
              </Link>
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
              Edit Business Profile
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Showcase your business with photos, details, and services. Make it stand out to potential customers.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <Card className="border-red-200 bg-red-50/80 backdrop-blur-sm shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Approval Notice for Business Owners */}
        {userRole !== 'admin' && (
          <div className="mb-6">
            <Card className="border-blue-200 bg-blue-50/80 backdrop-blur-sm shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-blue-700">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-lg">Changes Require Admin Approval</p>
                    <p className="text-blue-600 mt-1">
                      Your changes will be submitted for review and will only go live after admin approval.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Photo Upload Section */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Camera className="w-8 h-8 text-orange-500" />
                <CardTitle className="text-2xl font-bold text-gray-800">Business Photos</CardTitle>
              </div>
              <CardDescription className="text-gray-600 text-lg">
                Upload your logo, cover photo, and gallery images to showcase your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessPhotoUpload
                businessId={business.id}
                currentPhotos={photos}
                onPhotosChange={setPhotos}
              />
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Settings className="w-6 h-6" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-orange-100">Update your business details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Name - Only admins can edit */}
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              {userRole === 'admin' ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter business name"
                  required
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="font-medium">{formData.name}</p>
                  <p className="text-sm text-gray-500">Only administrators can change business names</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your business and services"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.business.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <DollarSign className="w-6 h-6" />
              Pricing & Rates
            </CardTitle>
            <CardDescription className="text-green-100">Set competitive rates for your services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_rate_cents">Base Rate (cents)</Label>
                <Input
                  id="base_rate_cents"
                  type="number"
                  min="0"
                  value={formData.base_rate_cents}
                  onChange={(e) => setFormData({ ...formData, base_rate_cents: parseInt(e.target.value) || 0 })}
                  placeholder="8000"
                />
                <p className="text-sm text-gray-500">$80.00 = 8000 cents</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate_cents">Hourly Rate (cents)</Label>
                <Input
                  id="hourly_rate_cents"
                  type="number"
                  min="0"
                  value={formData.hourly_rate_cents}
                  onChange={(e) => setFormData({ ...formData, hourly_rate_cents: parseInt(e.target.value) || 0 })}
                  placeholder="6000"
                />
                <p className="text-sm text-gray-500">$60.00/hour = 6000 cents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="w-6 h-6" />
              Services Offered
            </CardTitle>
            <CardDescription className="text-blue-100">List all the services you provide to customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add a service (e.g., Piano Moving)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
              />
              <Button type="button" onClick={addService} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.services_offered.map((service) => (
                <Badge key={service} variant="secondary" className="flex items-center gap-1">
                  {service}
                  <button
                    type="button"
                    onClick={() => removeService(service)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Common services:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_SERVICES.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => {
                      if (!formData.services_offered.includes(service)) {
                        setFormData(prev => ({
                          ...prev,
                          services_offered: [...prev.services_offered, service]
                        }))
                      }
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Availability
            </CardTitle>
            <CardDescription>Set your working days and hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.availability_days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.availability_hours.start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    availability_hours: { ...prev.availability_hours, start: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.availability_hours.end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    availability_hours: { ...prev.availability_hours, end: e.target.value }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Features & Benefits
            </CardTitle>
            <CardDescription>Highlight what makes your business special</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature (e.g., Free Estimates)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature) => (
                <Badge key={feature} variant="outline" className="flex items-center gap-1">
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(feature)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="text-sm text-gray-500">
              <p className="font-medium mb-2">Common features:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_FEATURES.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => {
                      if (!formData.features.includes(feature)) {
                        setFormData(prev => ({
                          ...prev,
                          features: [...prev.features, feature]
                        }))
                      }
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Business Details
            </CardTitle>
            <CardDescription>Additional information about your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                min="0"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label>Languages Spoken</Label>
              <div className="flex gap-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="Add a language"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <Button type="button" onClick={addLanguage} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.languages_spoken.map((language) => (
                  <Badge key={language} variant="secondary" className="flex items-center gap-1">
                    {language}
                    <button
                      type="button"
                      onClick={() => removeLanguage(language)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium mb-1">Common languages:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_LANGUAGES.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => {
                        if (!formData.languages_spoken.includes(language)) {
                          setFormData(prev => ({
                            ...prev,
                            languages_spoken: [...prev.languages_spoken, language]
                          }))
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Certifications</Label>
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add a certification"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                />
                <Button type="button" onClick={addCertification} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.certifications.map((certification) => (
                  <Badge key={certification} variant="outline" className="flex items-center gap-1">
                    {certification}
                    <button
                      type="button"
                      onClick={() => removeCertification(certification)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <p className="font-medium mb-1">Common certifications:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_CERTIFICATIONS.map((certification) => (
                    <button
                      key={certification}
                      type="button"
                      onClick={() => {
                        if (!formData.certifications.includes(certification)) {
                          setFormData(prev => ({
                            ...prev,
                            certifications: [...prev.certifications, certification]
                          }))
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {certification}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Service Options
            </CardTitle>
            <CardDescription>Configure your service capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency_service"
                    checked={formData.emergency_service}
                    onCheckedChange={(checked) => setFormData({ ...formData, emergency_service: !!checked })}
                  />
                  <Label htmlFor="emergency_service">Emergency Service Available</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same_day_service"
                    checked={formData.same_day_service}
                    onCheckedChange={(checked) => setFormData({ ...formData, same_day_service: !!checked })}
                  />
                  <Label htmlFor="same_day_service">Same Day Service</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insurance_verified"
                    checked={formData.insurance_verified}
                    onCheckedChange={(checked) => setFormData({ ...formData, insurance_verified: !!checked })}
                  />
                  <Label htmlFor="insurance_verified">Insurance Verified</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="licensed"
                    checked={formData.licensed}
                    onCheckedChange={(checked) => setFormData({ ...formData, licensed: !!checked })}
                  />
                  <Label htmlFor="licensed">Licensed</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bonded"
                    checked={formData.bonded}
                    onCheckedChange={(checked) => setFormData({ ...formData, bonded: !!checked })}
                  />
                  <Label htmlFor="bonded">Bonded</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="response_time_hours">Response Time (hours)</Label>
                <Input
                  id="response_time_hours"
                  type="number"
                  min="1"
                  value={formData.response_time_hours}
                  onChange={(e) => setFormData({ ...formData, response_time_hours: parseInt(e.target.value) || 24 })}
                  placeholder="24"
                />
                <p className="text-sm text-gray-500">How quickly you respond to inquiries</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_booking_notice_hours">Minimum Booking Notice (hours)</Label>
                <Input
                  id="min_booking_notice_hours"
                  type="number"
                  min="1"
                  value={formData.min_booking_notice_hours}
                  onChange={(e) => setFormData({ ...formData, min_booking_notice_hours: parseInt(e.target.value) || 24 })}
                  placeholder="24"
                />
                <p className="text-sm text-gray-500">Minimum advance notice required for bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Type */}
        <Card>
          <CardHeader>
            <CardTitle>Service Type</CardTitle>
            <CardDescription>Select your primary service category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Category *</Label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your service category" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location & Service Area
            </CardTitle>
            <CardDescription>Update your business location and service radius</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Los Angeles"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">ZIP Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="90210"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_radius_km">Service Radius (km)</Label>
              <Input
                id="service_radius_km"
                type="number"
                min="1"
                max="100"
                value={formData.service_radius_km}
                onChange={(e) => setFormData({ ...formData, service_radius_km: parseInt(e.target.value) || 25 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center pt-8">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-12 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                {userRole === 'admin' ? 'Saving Changes...' : 'Submitting for Approval...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-3" />
                {userRole === 'admin' ? 'Save All Changes' : 'Submit for Admin Approval'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  </div>
)
}