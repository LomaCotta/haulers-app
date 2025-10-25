'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Building, MapPin, DollarSign } from 'lucide-react'
import Link from 'next/link'

const serviceTypes = [
  { id: 'moving', label: 'Moving Services' },
  { id: 'junk_haul', label: 'Junk Haul' },
  { id: 'packing', label: 'Packing Services' },
  { id: 'piano', label: 'Piano Moving' },
  { id: 'storage', label: 'Storage Solutions' },
  { id: 'cleaning', label: 'Cleaning Services' },
]

export default function NewBusinessPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_rate_cents: '',
    hourly_rate_cents: '',
    service_types: [] as string[],
    address: '',
    city: '',
    state: '',
    postal_code: '',
    service_radius_km: 25,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Create business
      const { data, error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: formData.name,
          description: formData.description,
          base_rate_cents: formData.base_rate_cents ? parseInt(formData.base_rate_cents) * 100 : null,
          hourly_rate_cents: formData.hourly_rate_cents ? parseInt(formData.hourly_rate_cents) * 100 : null,
          service_types: formData.service_types,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          service_radius_km: formData.service_radius_km,
        })
        .select()
        .single()

      if (businessError) {
        setError('Failed to create business: ' + businessError.message)
        return
      }

      // Redirect to business details
      router.push(`/dashboard/businesses/${data.id}`)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceTypeChange = (serviceId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        service_types: [...formData.service_types, serviceId]
      })
    } else {
      setFormData({
        ...formData,
        service_types: formData.service_types.filter(id => id !== serviceId)
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to businesses
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Create New Business
          </CardTitle>
          <CardDescription>
            Add your business to start offering services on Haulers.app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Reliable Movers LA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your services and experience..."
                  rows={3}
                />
              </div>
            </div>

            {/* Service Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Types</h3>
              <div className="grid grid-cols-2 gap-3">
                {serviceTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={formData.service_types.includes(type.id)}
                      onCheckedChange={(checked) => handleServiceTypeChange(type.id, !!checked)}
                    />
                    <Label htmlFor={type.id} className="text-sm">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_rate">Base Rate ($)</Label>
                  <Input
                    id="base_rate"
                    type="number"
                    value={formData.base_rate_cents}
                    onChange={(e) => setFormData({ ...formData, base_rate_cents: e.target.value })}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={formData.hourly_rate_cents}
                    onChange={(e) => setFormData({ ...formData, hourly_rate_cents: e.target.value })}
                    placeholder="75"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="90210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_radius">Service Radius (km)</Label>
                  <Input
                    id="service_radius"
                    type="number"
                    value={formData.service_radius_km}
                    onChange={(e) => setFormData({ ...formData, service_radius_km: parseInt(e.target.value) || 25 })}
                    placeholder="25"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Business'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/businesses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
