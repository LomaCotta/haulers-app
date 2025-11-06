'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Users, 
  Building, 
  DollarSign, 
  TrendingUp,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  Eye,
  Star,
  Calendar,
  ArrowRight
} from 'lucide-react'

interface Business {
  id: string
  name: string
  verified: boolean
  rating_avg: number
  rating_count: number
  created_at: string
  owner: {
    full_name: string
  }
}

interface Booking {
  id: string
  status: string
  created_at: string
  quote_cents: number
  requested_date?: string
  total_price_cents?: number
  customer?: {
    id: string
    full_name: string
  }
  business?: {
    id: string
    name: string
  }
}

interface User {
  id: string
  role: string
  full_name: string
  created_at: string
}

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    verifiedBusinesses: 0,
    totalBookings: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }

      // Fetch total counts
      const [
        { count: totalUsersCount },
        { count: totalBusinessesCount },
        { count: verifiedBusinessesCount },
        { count: totalBookingsCount },
        { data: bookingsForRevenue }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('quote_cents')
      ])

      const totalRevenue = bookingsForRevenue?.reduce((sum, b) => sum + (b.quote_cents || 0), 0) || 0

      setStats({
        totalUsers: totalUsersCount || 0,
        totalBusinesses: totalBusinessesCount || 0,
        verifiedBusinesses: verifiedBusinessesCount || 0,
        totalBookings: totalBookingsCount || 0,
        totalRevenue
      })

      // Fetch limited data for lists
      const { data: businessesData } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(id, full_name),
          business:businesses!bookings_business_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setBusinesses(businessesData || [])
      setBookings(bookingsData || [])
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyBusiness = async (businessId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ verified })
        .eq('id', businessId)

      if (error) {
        console.error('Error updating business:', error)
        return
      }

      // Refresh data
      await fetchAdminData()
    } catch (error) {
      console.error('Error:', error)
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
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage the platform and oversee operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/ledger">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ledger
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/admin/users">
          <Card className="border-2 border-gray-200 shadow-lg hover:border-blue-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-2">+12% from last month</p>
                  <div className="mt-3 flex items-center text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View all
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/verify">
          <Card className="border-2 border-gray-200 shadow-lg hover:border-green-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.totalBusinesses}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.verifiedBusinesses} verified
                  </p>
                  <div className="mt-3 flex items-center text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View all
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/bookings">
          <Card className="border-2 border-gray-200 shadow-lg hover:border-purple-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.totalBookings}</div>
                  <p className="text-xs text-muted-foreground mt-2">+8% from last month</p>
                  <div className="mt-3 flex items-center text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View all
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/ledger">
          <Card className="border-2 border-gray-200 shadow-lg hover:border-orange-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {formatPrice(stats.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Total platform value</p>
                  <div className="mt-3 flex items-center text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View ledger
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Pending Verifications
            </CardTitle>
            <CardDescription>Businesses waiting for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businesses.filter(b => !b.verified).slice(0, 5).map((business) => (
                <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{business.name}</p>
                    <p className="text-sm text-gray-500">Owner: {business.owner.full_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleVerifyBusiness(business.id, true)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/businesses/${business.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {businesses.filter(b => !b.verified).length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending verifications</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/admin/verify">View All Verifications</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.length > 0 ? (
                bookings.slice(0, 5).map((booking) => {
                  const customerName = booking.customer?.full_name || 'Unknown Customer'
                  const businessName = booking.business?.name || 'Unknown Business'
                  const bookingDate = booking.requested_date 
                    ? new Date(booking.requested_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const totalAmount = booking.total_price_cents || booking.quote_cents || 0
                  
                  return (
                    <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {customerName} • {businessName} • {bookingDate} • {formatPrice(totalAmount)}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <Badge variant="outline" className="group-hover:border-blue-300">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/admin/bookings">View All Activity</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="w-full justify-start" asChild>
              <Link href="/admin/verify">
                <Shield className="w-4 h-4 mr-2" />
                Verify Businesses
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/ledger">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Ledger
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}