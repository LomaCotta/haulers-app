'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft,
  Building, 
  Star, 
  MapPin, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Calendar,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  description: string
  phone: string
  service_type: string
  verified: boolean
  rating_avg: number
  rating_count: number
  address: string
  city: string
  state: string
  postal_code: string
  service_radius_km: number
  created_at: string
}

export default function BusinessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchBusiness(params.id as string)
    }
  }, [params.id])

  const fetchBusiness = async (businessId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard/businesses')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBusiness = async () => {
    if (!business) return
    
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id)

      if (error) {
        console.error('Error deleting business:', error)
        return
      }

      router.push('/dashboard/businesses')
    } catch (error) {
      console.error('Error:', error)
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
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Business not found</h3>
        <p className="text-gray-600 mb-6">
          The business you're looking for doesn't exist or you don't have permission to view it.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/businesses">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-600">Business Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/businesses/${business.id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteBusiness}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold">{business.name}</h3>
                {business.verified ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Pending Verification
                  </Badge>
                )}
              </div>
              
              <p className="text-gray-700">{business.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Service Type</label>
                  <p className="text-lg">{business.service_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {business.phone || 'Not provided'}
                  </p>
                </div>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-lg">
                  {business.address}<br />
                  {business.city}, {business.state} {business.postal_code}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Service Radius</label>
                <p className="text-lg">{business.service_radius_km} km</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <p className="text-xl font-semibold">{business.rating_avg}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reviews</p>
                <p className="text-xl font-semibold">{business.rating_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-lg">{new Date(business.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/dashboard/businesses/${business.id}/bookings`}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View Bookings
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/dashboard/businesses/${business.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Business
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
