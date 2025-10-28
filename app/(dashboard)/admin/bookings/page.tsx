'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  User,
  Building,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Star
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Booking {
  id: string
  consumer_id: string
  business_id: string
  status: 'requested' | 'quoted' | 'accepted' | 'scheduled' | 'completed' | 'canceled'
  move_date: string
  details: any
  quote_cents?: number
  deposit_cents?: number
  stripe_payment_intent?: string
  created_at: string
  updated_at: string
  consumer?: {
    id: string
    full_name: string
    phone?: string
  }
  business?: {
    id: string
    name: string
    owner_id: string
  }
  business_owner?: {
    id: string
    full_name: string
    phone?: string
  }
  review?: {
    id: string
    rating: number
    body?: string
  }
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter])

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user')
        return
      }

      console.log('Current user:', user.id)

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching current user profile:', profileError)
        return
      }

      console.log('Current user profile:', profile)

      if (profile?.role !== 'admin') {
        console.log('User is not admin, redirecting')
        window.location.href = '/dashboard'
        return
      }

      // Fetch all bookings with related data
      console.log('Fetching all bookings...')
      
      // First try a simple query to see if we can access bookings at all
      const { data: simpleBookings, error: simpleError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (simpleError) {
        console.error('Simple bookings query error:', simpleError)
        alert(`Error accessing bookings: ${simpleError.message}`)
        return
      }
      
      console.log('Simple bookings query successful:', simpleBookings)
      
      // Now try the full query with joins
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          consumer:profiles!consumer_id(id, full_name, phone),
          business:businesses!business_id(id, name, owner_id)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Complex bookings query error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.log('Falling back to simple query...')
        
        // Use the simple query as fallback
        const fallbackBookings = (simpleBookings || []).map(booking => ({
          ...booking,
          consumer: null,
          business: null,
          business_owner: null,
          review: null
        }))
        
        setBookings(fallbackBookings)
        return
      }

      console.log('Fetched bookings:', bookingsData)
      
      // Enrich bookings with additional data
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          // Get business owner info
          let businessOwner = null
          if (booking.business?.owner_id) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .eq('id', booking.business.owner_id)
              .single()
            businessOwner = ownerData
          }
          
          // Get review info
          let review = null
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('id, rating, body')
            .eq('booking_id', booking.id)
            .single()
          review = reviewData
          
          return {
            ...booking,
            business_owner: businessOwner,
            review: review
          }
        })
      )
      
      setBookings(enrichedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = bookings

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.consumer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.business?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.business_owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    setFilteredBookings(filtered)
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking status:', error)
        alert(`Error: ${error.message}`)
        return
      }

      alert('Booking status updated successfully')
      fetchBookings() // Refresh the list
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleDeleteBooking = async (bookingId: string, consumerName: string) => {
    if (!confirm(`Are you sure you want to permanently delete this booking for ${consumerName}? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) {
        console.error('Error deleting booking:', error)
        alert(`Error: ${error.message}`)
        return
      }

      alert('Booking deleted successfully')
      fetchBookings() // Refresh the list
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('An unexpected error occurred')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-blue-100 text-blue-800'
      case 'quoted':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <AlertCircle className="w-3 h-3" />
      case 'quoted':
        return <DollarSign className="w-3 h-3" />
      case 'accepted':
        return <CheckCircle className="w-3 h-3" />
      case 'scheduled':
        return <Calendar className="w-3 h-3" />
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'canceled':
        return <XCircle className="w-3 h-3" />
      default:
        return <AlertCircle className="w-3 h-3" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <p className="text-gray-600">View and manage all platform bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
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
            <CardTitle className="text-sm font-medium text-gray-600">Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {bookings.filter(b => b.status === 'requested').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quoted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'quoted').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {bookings.filter(b => b.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Canceled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {bookings.filter(b => b.status === 'canceled').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search bookings by customer, business, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'requested' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('requested')}
                size="sm"
              >
                Requested
              </Button>
              <Button
                variant={statusFilter === 'quoted' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('quoted')}
                size="sm"
              >
                Quoted
              </Button>
              <Button
                variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('scheduled')}
                size="sm"
              >
                Scheduled
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('completed')}
                size="sm"
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'canceled' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('canceled')}
                size="sm"
              >
                Canceled
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {booking.consumer?.full_name || `Customer ${booking.consumer_id?.substring(0, 8)}`}
                      </h3>
                      <Badge className={getStatusBadgeColor(booking.status)}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {booking.business?.name || `Business ${booking.business_id?.substring(0, 8)}`}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Move: {formatDate(booking.move_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created: {formatDate(booking.created_at)}
                      </div>
                      {booking.quote_cents && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(booking.quote_cents)}
                        </div>
                      )}
                    </div>
                    {booking.details && (
                      <div className="mt-2 text-xs text-gray-400">
                        {booking.details.size && `Size: ${booking.details.size}`}
                        {booking.details.notes && ` • Notes: ${booking.details.notes.substring(0, 50)}...`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Status Changes */}
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'requested')}>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Mark as Requested
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'quoted')}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Mark as Quoted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'accepted')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Accepted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'scheduled')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Mark as Scheduled
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'canceled')}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Mark as Canceled
                      </DropdownMenuItem>
                      
                      {/* Other Actions */}
                      <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteBooking(booking.id, booking.consumer?.full_name || 'User')}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredBookings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No bookings found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Booking Details</h2>
                <Button variant="ghost" onClick={() => setSelectedBooking(null)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Customer</label>
                    <p className="text-gray-900">{selectedBooking.consumer?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business</label>
                    <p className="text-gray-900">{selectedBooking.business?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge className={getStatusBadgeColor(selectedBooking.status)}>
                      {getStatusIcon(selectedBooking.status)}
                      <span className="ml-1 capitalize">{selectedBooking.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Move Date</label>
                    <p className="text-gray-900">{formatDate(selectedBooking.move_date)}</p>
                  </div>
                </div>

                {selectedBooking.details && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Details</label>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedBooking.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedBooking.quote_cents && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Quote</label>
                    <p className="text-gray-900 text-lg font-semibold">
                      {formatCurrency(selectedBooking.quote_cents)}
                    </p>
                  </div>
                )}

                {selectedBooking.review && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Review</label>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < selectedBooking.review!.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {selectedBooking.review.rating}/5
                      </span>
                    </div>
                    {selectedBooking.review.body && (
                      <p className="text-gray-700 mt-1">{selectedBooking.review.body}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
