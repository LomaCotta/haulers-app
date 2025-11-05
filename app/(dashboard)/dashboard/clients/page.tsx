'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Star,
  TrendingUp,
  MapPin,
  MessageSquare,
  FileText,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  full_name: string
  email?: string
  phone?: string
  totalBookings: number
  totalSpent: number
  lastBookingDate?: string
  averageRating?: number
  bookingHistory: Array<{
    id: string
    date: string
    status: string
    amount: number
  }>
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      
      // Get current user and ALL businesses they own
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Get ALL businesses this provider owns (not just one)
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)

      if (businessesError) {
        console.error('Error fetching businesses:', businessesError)
        setLoading(false)
        return
      }

      if (!businesses || businesses.length === 0) {
        console.log('Provider has no businesses')
        setClients([])
        setLoading(false)
        return
      }

      const businessIds = businesses.map(b => b.id)
      if (businessIds.length > 0) {
        setBusinessId(businessIds[0]) // Set first business ID for reference
      }

      console.log('Fetching bookings for businesses:', businessIds)

      // Fetch all bookings for ALL businesses this provider owns
      // Use simple query first (like bookings page does), then fetch customer profiles separately
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        console.error('Error message:', bookingsError?.message)
        console.error('Error code:', bookingsError?.code)
        console.error('Error details:', bookingsError?.details)
        console.error('Error hint:', bookingsError?.hint)
        console.error('Business IDs:', businessIds)
        
        const errorMsg = bookingsError?.message || 'Failed to load bookings. Please try refreshing the page.'
        setError(errorMsg)
        setClients([])
        setLoading(false)
        return
      }

      if (!bookings || bookings.length === 0) {
        console.log('No bookings found for provider businesses')
        setClients([])
        setLoading(false)
        return
      }

      console.log('Found', bookings.length, 'bookings for provider businesses')

      // Fetch customer profiles separately
      const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))]
      let customerMap = new Map()

      if (customerIds.length > 0) {
        console.log('Fetching customer profiles for', customerIds.length, 'customers...')
        const { data: customers, error: customersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', customerIds)

        if (customersError) {
          console.warn('Error fetching customer profiles:', customersError)
        } else if (customers) {
          customers.forEach(c => {
            customerMap.set(c.id, c)
          })
          console.log('Loaded', customers.length, 'customer profiles')
        }
      }

      // Group bookings by customer
      // IMPORTANT: Only include bookings where customer_id is NOT the provider's user ID
      // (exclude bookings where provider ordered from other providers)
      const clientMap = new Map<string, Client>()

      for (const booking of bookings) {
        // Skip bookings where provider is the customer (they ordered from someone else)
        if (booking.customer_id === user.id) {
          continue
        }

        const customerId = booking.customer_id
        if (!customerId || customerId === 'unknown') {
          continue
        }

        // Get customer info from map
        const customerProfile = customerMap.get(customerId)
        const customerName = customerProfile?.full_name || booking.customer_email || 'Unknown Customer'
        const customerEmail = booking.customer_email || customerProfile?.email || ''
        const customerPhone = booking.customer_phone || customerProfile?.phone || ''

        if (!clientMap.has(customerId)) {
          clientMap.set(customerId, {
            id: customerId,
            full_name: customerName,
            email: customerEmail,
            phone: customerPhone,
            totalBookings: 0,
            totalSpent: 0,
            bookingHistory: []
          })
        }

        const client = clientMap.get(customerId)!
        client.totalBookings++
        const amount = booking.total_price_cents || booking.base_price_cents || 0
        client.totalSpent += amount

        client.bookingHistory.push({
          id: booking.id,
          date: booking.requested_date || '',
          status: booking.booking_status || 'pending',
          amount
        })

        // Update last booking date
        if (booking.requested_date) {
          if (!client.lastBookingDate || booking.requested_date > client.lastBookingDate) {
            client.lastBookingDate = booking.requested_date
          }
        }
      }

      // Convert to array and sort by total spent (best clients first)
      const clientsArray = Array.from(clientMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)

      console.log('Grouped into', clientsArray.length, 'clients')
      setClients(clientsArray)
      setError(null) // Clear any previous errors
    } catch (error) {
      console.error('Error loading clients:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients

    const searchLower = searchTerm.toLowerCase()
    return clients.filter(client => 
      client.full_name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchTerm)
    )
  }, [clients, searchTerm])

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    }

    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalClients = clients.length
    const repeatClients = clients.filter(c => c.totalBookings > 1).length
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0)
    const totalBookings = clients.reduce((sum, c) => sum + c.totalBookings, 0)
    const averageOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
    const averageClientValue = totalClients > 0 ? totalRevenue / totalClients : 0
    const repeatRate = totalClients > 0 ? (repeatClients / totalClients * 100) : 0
    
    // Calculate client lifetime value stats
    const topClients = [...clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)
    const recentClients = [...clients]
      .filter(c => c.lastBookingDate)
      .sort((a, b) => (b.lastBookingDate || '').localeCompare(a.lastBookingDate || ''))
      .slice(0, 5)

    return {
      totalClients,
      repeatClients,
      repeatRate: repeatRate.toFixed(1),
      totalRevenue,
      averageOrderValue,
      averageClientValue,
      totalBookings,
      topClients,
      recentClients
    }
  }, [clients])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-600">Manage your clients and build lasting relationships</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600">Manage your clients and build lasting relationships</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Repeat Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.repeatClients} ({stats.repeatRate}%)
                </p>
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
                <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.averageOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Insights */}
      {stats.totalClients > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Clients */}
          {stats.topClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-600" />
                  Top Clients by Value
                </CardTitle>
                <CardDescription>Your most valuable clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topClients.map((client, index) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-orange-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{client.full_name}</p>
                          <p className="text-sm text-gray-600">{client.totalBookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatPrice(client.totalSpent)}</p>
                        <p className="text-xs text-gray-500">Lifetime value</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Success Metrics
              </CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Repeat Rate</span>
                    <span className="text-lg font-bold text-green-700">{stats.repeatRate}%</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {stats.repeatClients} of {stats.totalClients} clients have booked multiple times
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Avg Order Value</span>
                    <span className="text-lg font-bold text-blue-700">{formatPrice(stats.averageOrderValue)}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Average booking value across {stats.totalBookings} bookings
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Bookings per Client</span>
                    <span className="text-lg font-bold text-purple-700">
                      {(stats.totalBookings / stats.totalClients).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Average number of bookings per client
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search clients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Badge className="bg-gray-100 text-gray-700 px-3 py-1">
              {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {loading ? 'Loading clients...' : 'No clients found'}
            </h3>
            <p className="text-gray-500 mb-2">
              {searchTerm ? 'Try adjusting your search.' : 'Start accepting bookings to see your clients here.'}
            </p>
            {!loading && clients.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Make sure customers are booking through your business listings.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xl font-semibold text-orange-600">
                          {client.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{client.full_name}</h3>
                        {client.totalBookings > 1 && (
                          <Badge className="bg-green-100 text-green-800 mt-1">
                            <Award className="w-3 h-3 mr-1" />
                            Repeat Client
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span><strong>{client.totalBookings}</strong> {client.totalBookings === 1 ? 'booking' : 'bookings'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span><strong>{formatPrice(client.totalSpent)}</strong> total spent</span>
                        </div>
                        {client.lastBookingDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Last booking: {new Date(client.lastBookingDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Bookings */}
                    {client.bookingHistory.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Bookings</h4>
                        <div className="space-y-2">
                          {client.bookingHistory.slice(0, 3).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(booking.status)}
                                <span className="text-gray-600">
                                  {booking.date ? new Date(booking.date).toLocaleDateString() : 'Date TBD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{formatPrice(booking.amount)}</span>
                                <Link href={`/dashboard/bookings/${booking.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <MessageSquare className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                          {client.bookingHistory.length > 3 && (
                            <p className="text-xs text-gray-500 mt-2">
                              +{client.bookingHistory.length - 3} more bookings
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/dashboard/bookings?search=${encodeURIComponent(client.full_name)}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        View Bookings
                      </Button>
                    </Link>
                    {client.email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.location.href = `mailto:${client.email}`}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    )}
                    {client.phone && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.location.href = `tel:${client.phone}`}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
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

