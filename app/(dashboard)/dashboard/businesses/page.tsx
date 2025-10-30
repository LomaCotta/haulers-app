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
  XCircle
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading businesses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Businesses</h1>
          <p className="text-gray-600">Manage your business listings and profiles</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/businesses/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Link>
        </Button>
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first business profile to start offering services
            </p>
            <Button asChild>
              <Link href="/dashboard/businesses/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <Card key={business.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{business.name}</h3>
                      {business.verification_status === 'approved' || business.verified ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : business.verification_status === 'rejected' ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{business.description}</p>
                    
                    {/* Rejection Reason Display */}
                    {business.verification_status === 'rejected' && business.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-700">
                          <strong>Rejection Reason:</strong> {business.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{business.rating_avg}</span>
                      <span>({business.rating_count})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{business.city}, {business.state}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {business.service_types.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/businesses/${business.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/businesses/${business.id}/edit`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                  {/* Movers-specific manage + book actions: force-visible for testing */}
                  <>
                    <Button size="sm" variant="default" asChild>
                      <Link href={`/dashboard/movers/settings?businessId=${business.id}`}>
                        Manage Movers
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/movers/book?providerId=${business.id}`}>
                        Book
                      </Link>
                    </Button>
                  </>
                    
                    {/* Resubmit button for rejected businesses */}
                    {business.verification_status === 'rejected' && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => handleResubmitBusiness(business.id)}
                        disabled={resubmitting === business.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {resubmitting === business.id ? (
                          <>
                            <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Resubmitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resubmit
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Only admins can delete businesses */}
                    {userRole === 'admin' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteBusiness(business.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{businesses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {businesses.filter(b => b.verified).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {businesses.length > 0 
                  ? (businesses.reduce((sum, b) => sum + b.rating_avg, 0) / businesses.length).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
