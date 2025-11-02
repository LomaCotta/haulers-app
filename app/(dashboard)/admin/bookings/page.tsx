"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Building, 
  DollarSign,
  Filter,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Star
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface Booking {
  id: string
  customer_id?: string
  business_id: string
  booking_status?: 'requested' | 'quoted' | 'confirmed' | 'scheduled' | 'completed' | 'cancelled'
  service_type?: string
  requested_date?: string
  requested_time?: string
  service_address?: string
  service_city?: string
  service_state?: string
  service_postal_code?: string
  base_price_cents?: number
  total_price_cents?: number
  additional_fees_cents?: number
  hourly_rate_cents?: number
  payment_status?: string
  service_details?: any // CRITICAL: Full service details JSONB
  customer_notes?: string
  business_notes?: string
  customer_phone?: string
  customer_email?: string
  actual_start_time?: string | null
  actual_end_time?: string | null
  estimated_duration_hours?: number
  created_at: string
  updated_at: string
  business?: {
    id: string
    name: string
    owner_id: string
    phone?: string
    email?: string
    description?: string
  }
  customer?: {
    id: string
    full_name: string
    email?: string
    phone?: string
  }
  // Legacy fields for backward compatibility
  status?: string
  move_date?: string
  details?: any
  quote_cents?: number
  deposit_cents?: number
  stripe_payment_intent?: string
}

interface BookingStats {
  total_bookings: number
  pending_bookings: number
  confirmed_bookings: number
  completed_bookings: number
  total_revenue: number
  average_booking_value: number
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    dateRange: 'all'
  })
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  
  const supabase = createClient()

  // Load bookings and stats
  useEffect(() => {
    loadBookings()
    loadStats()
  }, [filters])

  const loadBookings = async () => {
    try {
      setLoading(true)
      
      // CRITICAL: Admin query should fetch ALL booking fields including service_details
      // Actual schema columns: id, customer_id, business_id, booking_status, requested_date, requested_time, 
      // service_address, service_city, service_state, service_postal_code, service_type, 
      // base_price_cents, total_price_cents, additional_fees_cents, hourly_rate_cents,
      // payment_status, service_details (JSONB), customer_notes, business_notes, customer_phone, customer_email, etc.
      console.log('[Admin] Starting bookings query with full access...')
      
      // CRITICAL: Admin needs ALL booking data including service_details
      let query = supabase
        .from('bookings')
        .select(`
          *,
          business:businesses(id, name, owner_id, phone, email, description),
          customer:profiles!bookings_customer_id_fkey(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(100) // Admin should see more

      // Apply filters - use actual booking_status column
      if (filters.status !== 'all') {
        // Map filter values to actual booking_status values
        const statusMap: Record<string, string> = {
          'requested': 'requested',
          'quoted': 'quoted',
          'accepted': 'confirmed',
          'scheduled': 'scheduled',
          'completed': 'completed',
          'canceled': 'cancelled'
        }
        const actualStatus = statusMap[filters.status] || filters.status
        query = query.eq('booking_status', actualStatus)
      }
      
      // Search filter - search in service_details JSONB and customer info
      if (filters.search) {
        // Search in multiple fields
        query = query.or(`service_details.ilike.%${filters.search}%,customer_notes.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        // Better error logging
        console.error('Error loading bookings:', error)
        console.error('Error type:', typeof error)
        console.error('Error constructor:', error?.constructor?.name)
        console.error('Error keys:', Object.keys(error || {}))
        console.error('Error stringified:', JSON.stringify(error, null, 2))
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: error
        })
        
        // Try to get error message in different ways
        const errorMessage = error?.message || error?.toString() || String(error)
        console.error('Error message extracted:', errorMessage)
        
        // Check if it's an RLS/permissions error
        if (error?.code === 'PGRST116' || errorMessage?.includes('policy') || errorMessage?.includes('permission') || errorMessage?.includes('RLS')) {
          console.error('RLS Policy Error: Admin may not have permission to view all bookings. You may need to add an admin RLS policy.')
        }
        
        // Try without joins if main query fails - but still fetch related data separately
        const { data: simpleData, error: simpleError } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (simpleError) {
          console.error('Error with simple query:', simpleError)
          setBookings([])
          return
        }
        
        console.log('Loaded bookings with simple query:', simpleData?.length || 0)
        
        // Fetch related data separately
        const bookingsWithRelations = await Promise.all((simpleData || []).map(async (booking: any) => {
          try {
            const [businessResult, customerResult] = await Promise.all([
              supabase
                .from('businesses')
                .select('id, name, owner_id')
                .eq('id', booking.business_id)
                .maybeSingle(),
              supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', booking.customer_id)
                .maybeSingle()
            ])
            
            return {
              ...booking,
              business: businessResult.data || null,
              customer: customerResult.data || null
            }
          } catch (err) {
            console.error('Error fetching related data for booking:', booking.id, err)
            return booking
          }
        }))
        
        setBookings(bookingsWithRelations)
        return
      }

      console.log('Loaded bookings:', data?.length || 0, 'bookings')
      
      // Priority filter doesn't exist in schema - skip it
      setBookings(data || [])
    } catch (error) {
      console.error('Unexpected error:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Calculate stats directly from bookings instead of using RPC
      // Use a simple query - select all columns and calculate in memory
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1000) // Reasonable limit for stats

      if (error) {
        console.error('Error loading stats:', error)
        // Create default stats
        const getStatus = (b: any) => b.booking_status || b.status || 'pending'
        const getPrice = (b: any) => b.total_price_cents || b.quote_cents || 0
        const completedBookings = bookings.filter(b => getStatus(b) === 'completed')
        setStats({
          total_bookings: bookings.length,
          pending_bookings: bookings.filter(b => ['pending', 'requested'].includes(getStatus(b))).length,
          confirmed_bookings: bookings.filter(b => getStatus(b) === 'confirmed').length,
          completed_bookings: completedBookings.length,
          total_revenue: completedBookings.reduce((sum, b) => sum + getPrice(b), 0),
          average_booking_value: completedBookings.length > 0 
            ? completedBookings.reduce((sum, b) => sum + getPrice(b), 0) / completedBookings.length
            : 0
        })
        return
      }

      if (bookingsData && bookingsData.length > 0) {
        const total = bookingsData.length
        // Actual schema: status enum('requested','quoted','accepted','scheduled','completed','canceled')
        const getStatus = (b: any) => b.status || 'requested'
        const pending = bookingsData.filter(b => ['requested', 'quoted', 'accepted', 'scheduled'].includes(getStatus(b))).length
        const confirmed = bookingsData.filter(b => ['accepted', 'scheduled'].includes(getStatus(b))).length
        const completed = bookingsData.filter(b => getStatus(b) === 'completed').length
        const completedBookings = bookingsData.filter(b => getStatus(b) === 'completed')
        // Actual schema: quote_cents
        const getPrice = (b: any) => b.quote_cents || 0
        const revenue = completedBookings.reduce((sum, b) => sum + getPrice(b), 0)
        const avgValue = completedBookings.length > 0 ? revenue / completedBookings.length : 0

        setStats({
          total_bookings: total,
          pending_bookings: pending,
          confirmed_bookings: confirmed,
          completed_bookings: completed,
          total_revenue: revenue,
          average_booking_value: avgValue
        })
      } else {
        // Set default stats if no bookings
        setStats({
          total_bookings: 0,
          pending_bookings: 0,
          confirmed_bookings: 0,
          completed_bookings: 0,
          total_revenue: 0,
          average_booking_value: 0
        })
      }
    } catch (error) {
      console.error('Unexpected error loading stats:', error)
      // Create default stats from current bookings
      const getStatus = (b: any) => b.booking_status || b.status || 'pending'
      const getPrice = (b: any) => b.total_price_cents || b.quote_cents || 0
      const completedBookings = bookings.filter(b => getStatus(b) === 'completed')
      setStats({
        total_bookings: bookings.length,
        pending_bookings: bookings.filter(b => ['pending', 'requested'].includes(getStatus(b))).length,
        confirmed_bookings: bookings.filter(b => getStatus(b) === 'confirmed').length,
        completed_bookings: completedBookings.length,
        total_revenue: completedBookings.reduce((sum, b) => sum + getPrice(b), 0),
        average_booking_value: completedBookings.length > 0 
          ? completedBookings.reduce((sum, b) => sum + getPrice(b), 0) / completedBookings.length
          : 0
      })
    }
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking:', error)
        return
      }

      // Reload bookings
      loadBookings()
      loadStats()
      
      // Close modal
      setSelectedBooking(null)
    } catch (error) {
      console.error('Unexpected error:', error)
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const safeStatus = status || 'requested'
    
    const statusConfig = {
      requested: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      quoted: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      accepted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      scheduled: { color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      canceled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const config = statusConfig[safeStatus as keyof typeof statusConfig] || statusConfig.requested
    const Icon = config.icon

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {safeStatus.toUpperCase()}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800' },
      normal: { color: 'bg-blue-100 text-blue-800' },
      high: { color: 'bg-orange-100 text-orange-800' },
      urgent: { color: 'bg-red-100 text-red-800' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal

    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600">Manage and monitor all bookings across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadBookings}>
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_bookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_bookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_bookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.total_revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <Input
                placeholder="Search bookings..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500">No bookings match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.business?.name || 'Booking'}
                      </h3>
                      {getStatusBadge(booking.status || 'requested')}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{booking.business?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{booking.customer?.full_name || booking.consumer?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(booking.move_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">{formatPrice(booking.quote_cents || 0)}</span>
                      </div>
                    </div>
                    
                    {booking.details && typeof booking.details === 'object' && Object.keys(booking.details).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Details:</strong> {JSON.stringify(booking.details, null, 2)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Booking Details
                <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                {getStatusBadge(selectedBooking.status || 'requested')}
              </div>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Booking Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Date:</strong> {formatDate(selectedBooking.move_date)}</p>
                    <p><strong>Status:</strong> {selectedBooking.status}</p>
                    <p><strong>Quote:</strong> {formatPrice(selectedBooking.quote_cents || 0)}</p>
                    {selectedBooking.deposit_cents && (
                      <p><strong>Deposit:</strong> {formatPrice(selectedBooking.deposit_cents)}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Customer:</strong> {selectedBooking.customer?.full_name || selectedBooking.consumer?.full_name || 'Unknown'}</p>
                    <p><strong>Business:</strong> {selectedBooking.business?.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Details */}
              {selectedBooking.details && typeof selectedBooking.details === 'object' && Object.keys(selectedBooking.details).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Booking Details</h4>
                  <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto">
                    {JSON.stringify(selectedBooking.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  onClick={() => updateBookingStatus(selectedBooking.id, 'accepted')}
                  disabled={!['requested', 'quoted'].includes(selectedBooking.status || '')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'canceled')}
                  disabled={(selectedBooking.status || '') === 'completed'}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                  disabled={!['accepted', 'scheduled'].includes(selectedBooking.status || '')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}