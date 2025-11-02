'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  Building, 
  Star, 
  MapPin, 
  Edit, 
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Award
} from 'lucide-react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  description: string
  verified: boolean
  verification_status?: string
  rejection_reason?: string
  rating_avg: number
  rating_count: number
  service_types: string[]
  city: string
  state: string
  created_at: string
  logo_url?: string
  cover_photo_url?: string
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [resubmitting, setResubmitting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
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
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching businesses:', error)
        return
      }

      setBusinesses(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBusiness = async (businessId: string) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)

      if (error) {
        console.error('Error deleting business:', error)
        return
      }

      setBusinesses(businesses.filter(b => b.id !== businessId))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleResubmitBusiness = async (businessId: string) => {
    try {
      setResubmitting(businessId)
      
      const { error } = await supabase.rpc('resubmit_business_verification', {
        business_uuid: businessId
      })

      if (error) {
        console.error('Error resubmitting business:', error)
        alert(`Error resubmitting business: ${error.message}`)
        return
      }

      alert('Business resubmitted successfully! Our team will review it shortly.')
      await fetchBusinesses()
    } catch (error) {
      console.error('Error:', error)
      alert('Error resubmitting business')
    } finally {
      setResubmitting(null)
    }
  }

  const verifiedCount = businesses.filter(b => b.verified || b.verification_status === 'approved').length
  const averageRating = businesses.length > 0 
    ? (businesses.reduce((sum, b) => sum + b.rating_avg, 0) / businesses.length).toFixed(1)
    : '0.0'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading businesses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-2 tracking-tight">My Businesses</h1>
          <p className="text-gray-600 text-lg">Manage your business listings and profiles</p>
        </div>
        <Button 
          asChild
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-12 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Link href="/dashboard/businesses/new">
            <Plus className="w-5 h-5 mr-2" />
            Add Business
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Businesses</p>
                  <p className="text-3xl font-semibold text-gray-900">{businesses.length}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Verified</p>
                  <p className="text-3xl font-semibold text-green-600">{verifiedCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-semibold text-gray-900">{averageRating}</p>
                    <Star className="w-5 h-5 text-orange-400 fill-current" />
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-600 fill-current" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Businesses Grid */}
      {businesses.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No businesses yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first business profile to start offering services and connect with customers
            </p>
            <Button 
              asChild
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-12 px-8 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Link href="/dashboard/businesses/new">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {businesses.map((business) => {
            const isVerified = business.verification_status === 'approved' || business.verified
            const isRejected = business.verification_status === 'rejected'
            const isPending = !isVerified && !isRejected

            return (
              <Card 
                key={business.id} 
                className={`group border-2 transition-all duration-200 overflow-hidden ${
                  isVerified 
                    ? 'border-green-200 bg-white hover:border-green-300 hover:shadow-lg' 
                    : isRejected
                    ? 'border-red-200 bg-white hover:border-red-300 hover:shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {/* Business Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {business.cover_photo_url || business.logo_url ? (
                    <img 
                      src={business.cover_photo_url || business.logo_url} 
                      alt={business.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    {isVerified && (
                      <Badge className="bg-green-500 text-white border-0 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge className="bg-red-500 text-white border-0 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        Rejected
                      </Badge>
                    )}
                    {isPending && (
                      <Badge className="bg-amber-500 text-white border-0 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors truncate">
                        {business.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {business.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  {isRejected && business.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{business.rejection_reason}</p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Stats Row */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-orange-400 fill-current" />
                        <span className="font-semibold text-gray-900">{business.rating_avg.toFixed(1)}</span>
                        <span className="text-gray-500">({business.rating_count} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{business.city}, {business.state}</span>
                      </div>
                    </div>

                    {/* Service Types */}
                    {business.service_types && business.service_types.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {business.service_types.slice(0, 3).map((type) => (
                          <Badge 
                            key={type} 
                            variant="outline" 
                            className="text-xs border-gray-200 text-gray-600 bg-gray-50"
                          >
                            {type.replace('_', ' ')}
                          </Badge>
                        ))}
                        {business.service_types.length > 3 && (
                          <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 bg-gray-50">
                            +{business.service_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        asChild
                        className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Link href={`/dashboard/businesses/${business.id}`}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          View
                        </Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        asChild
                        className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Link href={`/dashboard/businesses/${business.id}/edit`}>
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="default"
                        asChild
                        className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                      >
                        <Link href={`/dashboard/movers/settings?businessId=${business.id}`}>
                          <TrendingUp className="w-4 h-4 mr-1.5" />
                          Manage Movers
                        </Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const makeSlug = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                          const citySlug = makeSlug(business.city)
                          const companySlug = makeSlug(business.name)
                          window.location.href = `/movers/${citySlug}/${companySlug}/book`
                        }}
                        className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Users className="w-4 h-4 mr-1.5" />
                        Book
                      </Button>
                      
                      {/* Resubmit button for rejected businesses */}
                      {isRejected && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleResubmitBusiness(business.id)}
                          disabled={resubmitting === business.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                        >
                          {resubmitting === business.id ? (
                            <>
                              <div className="w-4 h-4 mr-1.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Resubmitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Resubmit
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Admin delete button */}
                      {userRole === 'admin' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteBusiness(business.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
