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
import { ApprovalDialog } from '@/components/ui/approval-dialog'
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
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [submissionTime, setSubmissionTime] = useState<Date | null>(null)
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
    daily_availability: {} as Record<string, { start: string; end: string; enabled: boolean }>,
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
        daily_availability: data.daily_availability || {
          Monday: { start: '09:00', end: '17:00', enabled: true },
          Tuesday: { start: '09:00', end: '17:00', enabled: true },
          Wednesday: { start: '09:00', end: '17:00', enabled: true },
          Thursday: { start: '09:00', end: '17:00', enabled: true },
          Friday: { start: '09:00', end: '17:00', enabled: true },
          Saturday: { start: '10:00', end: '15:00', enabled: false },
          Sunday: { start: '10:00', end: '15:00', enabled: false },
        },
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
          daily_availability: formData.daily_availability,
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
          daily_availability: formData.daily_availability,
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

        // Show success dialog
        setSubmissionTime(new Date())
        setShowApprovalDialog(true)
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
        : [...prev.availability_days, day],
      daily_availability: {
        ...prev.daily_availability,
        [day]: {
          ...prev.daily_availability[day],
          enabled: !prev.daily_availability[day]?.enabled
        }
      }
    }))
  }

  const updateDayTime = (day: string, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      daily_availability: {
        ...prev.daily_availability,
        [day]: {
          ...prev.daily_availability[day],
          [field]: value
        }
      }
    }))
  }

  const toggleDayEnabled = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daily_availability: {
        ...prev.daily_availability,
        [day]: {
          ...prev.daily_availability[day],
          enabled: !prev.daily_availability[day]?.enabled
        }
      }
    }))
  }

  const handleApprovalDialogClose = () => {
    setShowApprovalDialog(false)
    router.push('/dashboard/businesses')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" asChild className="bg-white/90 backdrop-blur-sm border-slate-200 hover:bg-slate-50 shadow-sm">
              <Link href="/dashboard/businesses">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Businesses
              </Link>
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Edit Business Profile
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Showcase your business with photos, details, and services. Make it stand out to potential customers.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8">
            <Card className="border-red-200 bg-red-50/90 backdrop-blur-sm shadow-xl">
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
          <div className="mb-8">
            <Card className="border-blue-200 bg-blue-50/90 backdrop-blur-sm shadow-xl">
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
        <div className="mb-10">
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Camera className="w-8 h-8 text-blue-500" />
                <CardTitle className="text-2xl font-bold text-slate-800">Business Photos</CardTitle>
              </div>
              <CardDescription className="text-slate-600 text-lg">
                Upload your logo, cover photo, and gallery images to showcase your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessPhotoUpload
                businessId={business.id}
                currentPhotos={photos}
                onPhotosChange={(updated) =>
                  setPhotos((prev) => ({
                    logo_url: updated.logo_url ?? prev.logo_url,
                    cover_photo_url: updated.cover_photo_url ?? prev.cover_photo_url,
                    gallery_photos: updated.gallery_photos ?? prev.gallery_photos,
                  }))
                }
              />
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
        {/* Basic Information */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Settings className="w-6 h-6" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-blue-100">Update your business details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Business Name - Only admins can edit */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-lg font-semibold text-slate-700">Business Name *</Label>
              {userRole === 'admin' ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter business name"
                  required
                  className="text-xl font-bold border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              ) : (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
                  <p className="text-2xl font-bold text-slate-800 mb-2">{formData.name}</p>
                  <p className="text-sm text-blue-600 font-medium">Only administrators can change business names</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-lg font-semibold text-slate-700">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your business and services"
                rows={4}
                className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-lg font-semibold text-slate-700">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-lg font-semibold text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                  className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="website" className="text-lg font-semibold text-slate-700">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.business.com"
                  className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <DollarSign className="w-6 h-6" />
              Pricing & Rates
            </CardTitle>
            <CardDescription className="text-emerald-100">Set competitive rates for your services</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="w-6 h-6" />
              Services Offered
            </CardTitle>
            <CardDescription className="text-violet-100">List all the services you provide to customers</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
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
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Calendar className="w-6 h-6" />
              Availability Schedule
            </CardTitle>
            <CardDescription className="text-amber-100">Set different working hours for each day of the week</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Quick Setup */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Quick Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="default_start_time" className="text-sm font-medium text-slate-600">Default Start Time</Label>
                  <Input
                    id="default_start_time"
                    type="time"
                    value={formData.availability_hours.start}
                    onChange={(e) => {
                      const newStart = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        availability_hours: { ...prev.availability_hours, start: newStart },
                        daily_availability: Object.keys(prev.daily_availability).reduce((acc, day) => ({
                          ...acc,
                          [day]: { ...prev.daily_availability[day], start: newStart }
                        }), {})
                      }))
                    }}
                    className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="default_end_time" className="text-sm font-medium text-slate-600">Default End Time</Label>
                  <Input
                    id="default_end_time"
                    type="time"
                    value={formData.availability_hours.end}
                    onChange={(e) => {
                      const newEnd = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        availability_hours: { ...prev.availability_hours, end: newEnd },
                        daily_availability: Object.keys(prev.daily_availability).reduce((acc, day) => ({
                          ...acc,
                          [day]: { ...prev.daily_availability[day], end: newEnd }
                        }), {})
                      }))
                    }}
                    className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <p className="text-sm text-blue-600 mt-2">This will update all enabled days with the same times</p>
            </div>

            {/* Daily Schedule */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">Daily Schedule</h3>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = formData.daily_availability[day] || { start: '09:00', end: '17:00', enabled: false }
                  return (
                    <div key={day} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`day-${day}`}
                            checked={dayData.enabled}
                            onCheckedChange={() => toggleDayEnabled(day)}
                            className="w-5 h-5"
                          />
                          <Label htmlFor={`day-${day}`} className="text-lg font-semibold text-slate-700 cursor-pointer">
                            {day}
                          </Label>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          dayData.enabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {dayData.enabled ? 'Available' : 'Unavailable'}
                        </div>
                      </div>
                      
                      {dayData.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                          <div className="space-y-2">
                            <Label htmlFor={`${day}-start`} className="text-sm font-medium text-slate-600">Start Time</Label>
                            <Input
                              id={`${day}-start`}
                              type="time"
                              value={dayData.start}
                              onChange={(e) => updateDayTime(day, 'start', e.target.value)}
                              className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${day}-end`} className="text-sm font-medium text-slate-600">End Time</Label>
                            <Input
                              id={`${day}-end`}
                              type="time"
                              value={dayData.end}
                              onChange={(e) => updateDayTime(day, 'end', e.target.value)}
                              className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Availability Summary</h3>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = formData.daily_availability[day]
                  if (dayData?.enabled) {
                    return (
                      <div key={day} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-600">{day}</span>
                        <span className="text-green-700 font-medium">
                          {dayData.start} - {dayData.end}
                        </span>
                      </div>
                    )
                  }
                  return null
                })}
                {!DAYS_OF_WEEK.some(day => formData.daily_availability[day]?.enabled) && (
                  <p className="text-gray-500 text-sm">No days selected for availability</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Award className="w-6 h-6" />
              Features & Benefits
            </CardTitle>
            <CardDescription className="text-rose-100">Highlight what makes your business special</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
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
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Star className="w-6 h-6" />
              Business Details
            </CardTitle>
            <CardDescription className="text-indigo-100">Additional information about your business</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
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
        <div className="flex justify-center pt-12">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold px-16 py-6 text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-2xl"
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-4" />
                {userRole === 'admin' ? 'Saving Changes...' : 'Submitting for Approval...'}
              </>
            ) : (
              <>
                <Save className="w-6 h-6 mr-4" />
                {userRole === 'admin' ? 'Save All Changes' : 'Submit for Admin Approval'}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Approval Dialog */}
      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={handleApprovalDialogClose}
        businessName={business?.name}
        submittedAt={submissionTime || undefined}
      />
    </div>
  </div>
)
}