'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { SERVICE_CATEGORIES } from '@/config/service-categories'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  description: string
  phone: string
  service_type: string
  address: string
  city: string
  state: string
  postal_code: string
  service_radius_km: number
  verified: boolean
  owner_id: string
}

export default function EditBusinessPage() {
  const params = useParams()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string>('')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    service_type: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    service_radius_km: 25,
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

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('owner_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching business:', error)
        router.push('/dashboard/businesses')
        return
      }

      setBusiness(data)
      setFormData({
        name: data.name,
        description: data.description,
        phone: data.phone || '',
        service_type: data.service_type || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        service_radius_km: data.service_radius_km || 25,
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

      const updateData: any = {
        description: formData.description,
        phone: formData.phone,
        service_type: formData.service_type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        service_radius_km: formData.service_radius_km,
      }

      // Only admins can change business name
      if (userRole === 'admin') {
        updateData.name = formData.name
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
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/businesses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Business</h1>
          <p className="text-gray-600">Update your business information</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update your business details</CardDescription>
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
            <CardTitle>Location & Service Area</CardTitle>
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
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
