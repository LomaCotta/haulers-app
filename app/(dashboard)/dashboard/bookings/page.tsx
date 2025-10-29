'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Calendar, 
  Building, 
  Star, 
  MessageSquare,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Search,
  Filter
} from 'lucide-react'

interface Booking {
  id: string
  booking_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  requested_date: string
  requested_time: string
  service_type: string
  service_details: any
  total_price_cents: number
  base_price_cents: number
  hourly_rate_cents: number
  estimated_duration_hours: number
  service_address: string
  service_city: string
  service_state: string
  customer_notes: string
  created_at: string
  business: {
    id: string
    name: string
    city: string
    state: string
    rating_avg: number
    rating_count: number
  }
}

export default function ConsumerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          business:businesses(id, name, city, state, rating_avg, rating_count)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching bookings:', error)
        return
      }

      setBookings(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'disputed': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading your bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600">Track your service requests and bookings</p>
        </div>
        <Button asChild>
          <Link href="/find">
            <Plus className="w-4 h-4 mr-2" />
            Find Services
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.booking_status)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.booking_status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(bookings.filter(b => b.booking_status === 'completed').reduce((sum, b) => sum + (b.total_price_cents || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">
              Start by finding services you need and making your first booking
            </p>
            <Button asChild>
              <Link href="/find">
                <Search className="w-4 h-4 mr-2" />
                Find Services
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{booking.business.name}</h3>
                      <Badge className={getStatusColor(booking.booking_status)}>
                        {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.requested_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.requested_time} ({booking.estimated_duration_hours}h)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.service_city}, {booking.service_state}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{booking.business.rating_avg} ({booking.business.rating_count})</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">Service Type:</span> {booking.service_type}
                    </div>

                    {booking.total_price_cents && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">Total: {formatPrice(booking.total_price_cents)}</span>
                        {booking.base_price_cents && (
                          <span>• Base: {formatPrice(booking.base_price_cents)}</span>
                        )}
                        {booking.hourly_rate_cents && (
                          <span>• Rate: {formatPrice(booking.hourly_rate_cents)}/hr</span>
                        )}
                      </div>
                    )}

                    {booking.service_details && Object.keys(booking.service_details).length > 0 && (
                      <div className="text-sm text-gray-600 mb-4">
                        <p className="font-medium">Service Details:</p>
                        <p>{JSON.stringify(booking.service_details, null, 2)}</p>
                      </div>
                    )}
                    
                    {booking.customer_notes && (
                      <div className="text-sm text-gray-600 mb-4">
                        <p className="font-medium">Your Notes:</p>
                        <p>{booking.customer_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Link>
                    </Button>
                    {booking.booking_status === 'completed' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/reviews/${booking.id}`}>
                          <Star className="w-4 h-4 mr-1" />
                          Review
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}