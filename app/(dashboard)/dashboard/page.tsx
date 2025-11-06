"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  FileText,
  MessageSquare,
  Calendar,
  ArrowRight,
  CreditCard,
  Clock,
  MapPin,
  DollarSign,
  Building,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Send,
  Download,
  Loader2,
  Bell,
  Star
} from 'lucide-react'
import { format } from 'date-fns'

const formatDateDistance = (date: Date | string): string => {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 7) return `Due in ${diffDays} days`
  if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
  return `Due in ${Math.ceil(diffDays / 30)} months`
}

interface Profile {
  id: string
  role: 'consumer' | 'provider' | 'admin'
  full_name: string
}

interface Invoice {
  id: string
  invoice_number: string
  total_cents: number
  balance_cents: number
  due_date?: string
  status: string
  issue_date: string
  created_at?: string
  booking_id?: string | null
  business_id: string
  customer_id?: string
  business?: {
    id: string
    name: string
  }
  customer?: {
    id: string
    full_name: string
  }
  booking?: {
    review_requested_at?: string | null
  }
}

interface Booking {
  id: string
  booking_status: string
  requested_date: string
  requested_time?: string
  service_address?: string
  total_price_cents?: number
  customer?: {
    full_name: string
  }
  business?: {
    name: string
  }
}

interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  last_message?: string
  last_message_at?: string
  unread_count: number
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBusinessOwner, setIsBusinessOwner] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState({
    totalInvoices: 0,
    sentInvoices: 0,
    receivedInvoices: 0,
    unpaidInvoices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    unreadMessages: 0
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        router.push('/onboarding')
        return
      }

      setProfile(profileData)

      // Check if user owns businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      const isOwner = businesses && businesses.length > 0
      setIsBusinessOwner(!!isOwner)

      // Load dashboard data based on role
      if (isOwner) {
        // Business owner dashboard
        await Promise.all([
          loadBusinessStats(user.id, businesses.map(b => b.id)),
          loadRecentInvoices(user.id),
          loadRecentBookings(user.id, businesses.map(b => b.id)),
          loadRecentMessages(user.id)
        ])
      } else {
        // Consumer dashboard
        await Promise.all([
          loadConsumerStats(user.id),
          loadRecentInvoices(user.id),
          loadRecentBookings(user.id, []),
          loadRecentMessages(user.id)
        ])
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessStats = async (userId: string, businessIds: string[]) => {
    try {
      // Load invoices (sent and received)
      const response = await fetch(`/api/invoices`)
      const invoices = response.ok ? await response.json() : []
      
      const sentInvoices = invoices.filter((inv: Invoice) => 
        businessIds.includes(inv.business_id)
      )
      const receivedInvoices = invoices.filter((inv: Invoice) => 
        inv.customer_id === userId
      )
      const unpaidSent = sentInvoices.filter((inv: Invoice) => 
        inv.status === 'sent' && inv.balance_cents > 0
      )
      const unpaidReceived = receivedInvoices.filter((inv: Invoice) => 
        (inv.status === 'sent' || inv.status === 'overdue') && inv.balance_cents > 0
      )

      // Load bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })
        .limit(100)

      const pendingBookings = bookings?.filter((b: Booking) => 
        ['pending', 'confirmed', 'in_progress'].includes(b.booking_status)
      ) || []

      const totalRevenue = bookings?.reduce((sum: number, b: Booking) => 
        sum + (b.total_price_cents || 0), 0
      ) || 0

      setStats({
        totalInvoices: invoices.length,
        sentInvoices: sentInvoices.length,
        receivedInvoices: receivedInvoices.length,
        unpaidInvoices: unpaidSent.length + unpaidReceived.length,
        totalBookings: bookings?.length || 0,
        pendingBookings: pendingBookings.length,
        totalRevenue,
        unreadMessages: 0 // Will be set by loadRecentMessages
      })
    } catch (error) {
      console.error('Error loading business stats:', error)
    }
  }

  const loadConsumerStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/invoices`)
      const invoices = response.ok ? await response.json() : []
      
      const myInvoices = invoices.filter((inv: Invoice) => 
        inv.customer_id === userId
      )
      const unpaid = myInvoices.filter((inv: Invoice) => 
        (inv.status === 'sent' || inv.status === 'overdue') && inv.balance_cents > 0
      )

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      const pendingBookings = bookings?.filter((b: Booking) => 
        ['pending', 'confirmed', 'in_progress'].includes(b.booking_status)
      ) || []

      setStats({
        totalInvoices: myInvoices.length,
        sentInvoices: 0,
        receivedInvoices: myInvoices.length,
        unpaidInvoices: unpaid.length,
        totalBookings: bookings?.length || 0,
        pendingBookings: pendingBookings.length,
        totalRevenue: 0,
        unreadMessages: 0
      })
    } catch (error) {
      console.error('Error loading consumer stats:', error)
    }
  }

  const loadRecentInvoices = async (userId: string) => {
    try {
      const response = await fetch(`/api/invoices`)
      if (response.ok) {
        const invoices = await response.json()
        // Sort by created_at descending and take top 5
        const recent = invoices
          .sort((a: Invoice, b: Invoice) => 
            new Date(b.created_at || b.issue_date).getTime() - new Date(a.created_at || a.issue_date).getTime()
          )
          .slice(0, 5)
        setRecentInvoices(recent)
      }
    } catch (error) {
      console.error('Error loading recent invoices:', error)
    }
  }

  const loadRecentBookings = async (userId: string, businessIds: string[]) => {
    try {
      if (businessIds.length > 0) {
        // Business owner: get bookings for their businesses
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, customer:profiles(id, full_name)')
          .in('business_id', businessIds)
          .order('created_at', { ascending: false })
          .limit(5)
        setRecentBookings(bookings || [])
      } else {
        // Consumer: get their bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, business:businesses(id, name)')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
        setRecentBookings(bookings || [])
      }
    } catch (error) {
      console.error('Error loading recent bookings:', error)
    }
  }

  const loadRecentMessages = async (userId: string) => {
    try {
      // Get unread message count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      setUnreadMessages(count || 0)
      setStats(prev => ({ ...prev, unreadMessages: count || 0 }))

      // Get recent conversations
      const { data: conversations } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name)')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (conversations) {
        // Group by sender and get most recent
        const conversationMap = new Map()
        conversations.forEach((msg: any) => {
          const senderId = msg.sender_id
          if (!conversationMap.has(senderId) || 
              new Date(msg.created_at) > new Date(conversationMap.get(senderId).last_message_at || '')) {
            conversationMap.set(senderId, {
              id: senderId,
              other_user_id: senderId,
              other_user_name: msg.sender?.full_name || 'Unknown',
              last_message: msg.message_text,
              last_message_at: msg.created_at,
              unread_count: msg.is_read ? 0 : 1
            })
          }
        })
        setRecentConversations(Array.from(conversationMap.values()).slice(0, 5))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {profile.full_name}!
            </p>
          </div>
          {isBusinessOwner && (
            <Link href="/dashboard/invoices/new">
              <Button className="bg-orange-600 hover:bg-orange-700">
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Invoices */}
          <Link href="/dashboard/invoices">
            <Card className="border-2 border-gray-200 shadow-lg hover:border-blue-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.totalInvoices}</p>
                    {isBusinessOwner && (
                      <p className="text-xs text-gray-500 mt-2">
                        {stats.sentInvoices} sent • {stats.receivedInvoices} received
                      </p>
                    )}
                    <div className="mt-3 flex items-center text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View all
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Unpaid Invoices */}
          <Link href="/dashboard/invoices?status=sent">
            <Card className="border-2 border-gray-200 shadow-lg hover:border-orange-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Unpaid Invoices</p>
                    <p className="text-3xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">{stats.unpaidInvoices}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.unpaidInvoices > 0 ? 'Requires attention' : 'All paid'}
                    </p>
                    <div className="mt-3 flex items-center text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View unpaid
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Bookings */}
          <Link href="/dashboard/bookings">
            <Card className="border-2 border-gray-200 shadow-lg hover:border-green-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {isBusinessOwner ? 'Total Bookings' : 'My Bookings'}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.totalBookings}</p>
                    {stats.pendingBookings > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {stats.pendingBookings} pending
                      </p>
                    )}
                    <div className="mt-3 flex items-center text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View all
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Revenue (Business Owners) or Messages */}
          {isBusinessOwner ? (
            <Link href="/dashboard/invoices">
              <Card className="border-2 border-gray-200 shadow-lg hover:border-purple-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{formatPrice(stats.totalRevenue)}</p>
                      <p className="text-xs text-gray-500 mt-2">All time</p>
                      <div className="mt-3 flex items-center text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View invoices
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Link href="/dashboard/messages">
              <Card className="border-2 border-gray-200 shadow-lg hover:border-blue-300 hover:shadow-xl transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Messages</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.unreadMessages}</p>
                      <p className="text-xs text-gray-500 mt-2">Unread</p>
                      <div className="mt-3 flex items-center text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View messages
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Invoices */}
          <Card className="lg:col-span-2 border-2 border-gray-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Recent Invoices
                </CardTitle>
                <Link href="/dashboard/invoices">
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>
                {isBusinessOwner ? 'Invoices you sent and received' : 'Your invoices'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="space-y-2">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <div className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">{invoice.invoice_number}</p>
                                <Badge className={
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {invoice.status.replace('_', ' ')}
                                </Badge>
                                {isBusinessOwner && invoice.customer_id === profile.id && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Received
                                  </Badge>
                                )}
                                {isBusinessOwner && invoice.customer && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    Sent
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                                {isBusinessOwner && invoice.customer && (
                                  <span>To: {invoice.customer.full_name}</span>
                                )}
                                {isBusinessOwner && invoice.business && invoice.customer_id === profile.id && (
                                  <span>From: {invoice.business.name}</span>
                                )}
                                {!isBusinessOwner && invoice.business && (
                                  <span>From: {invoice.business.name}</span>
                                )}
                                {invoice.due_date && invoice.status !== 'paid' && (
                                  <span className={invoice.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                                    {formatDateDistance(invoice.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-lg text-gray-900">
                                {formatPrice(invoice.total_cents)}
                              </p>
                              {invoice.balance_cents > 0 && (
                                <p className="text-xs text-orange-600 font-medium">
                                  {formatPrice(invoice.balance_cents)} due
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                      
                      {/* Review Link for Paid Invoices */}
                      {!isBusinessOwner && invoice.status === 'paid' && invoice.booking_id && !(invoice as any).review_exists && (
                        <div className="px-4 pb-2">
                          <Link href={`/dashboard/reviews/${invoice.booking_id}`}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full border-orange-300 hover:bg-orange-50 text-orange-600 hover:text-orange-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Leave a Review
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4">No invoices yet</p>
                  {isBusinessOwner && (
                    <Link href="/dashboard/invoices/new">
                      <Button variant="outline" className="border-orange-300 hover:bg-orange-50">
                        Create First Invoice
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages & Quick Actions */}
          <div className="space-y-6">
            {/* Messages */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge className="bg-orange-500 text-white">{unreadMessages}</Badge>
                    )}
                  </CardTitle>
                  <Link href="/dashboard/messages">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Recent conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {recentConversations.length > 0 ? (
                  <div className="space-y-2">
                    {recentConversations.map((conv) => (
                      <Link key={conv.id} href={`/dashboard/messages?userId=${conv.other_user_id}`}>
                        <div className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{conv.other_user_name}</p>
                              {conv.last_message && (
                                <p className="text-xs text-gray-600 truncate mt-1">{conv.last_message}</p>
                              )}
                            </div>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-orange-500 text-white ml-2">{conv.unread_count}</Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-4">No messages yet</p>
                    <Link href="/dashboard/messages">
                      <Button variant="outline" className="border-orange-300 hover:bg-orange-50">
                        View Messages
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bookings */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Recent Bookings
                  </CardTitle>
                  <Link href="/dashboard/bookings">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  {isBusinessOwner ? 'Latest booking requests' : 'Your recent bookings'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookings.length > 0 ? (
                  <div className="space-y-2">
                    {recentBookings.map((booking) => (
                      <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                        <div className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={
                              booking.booking_status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.booking_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {booking.booking_status.replace('_', ' ')}
                            </Badge>
                            {booking.total_price_cents && (
                              <span className="font-semibold text-sm">{formatPrice(booking.total_price_cents)}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {isBusinessOwner 
                              ? booking.customer?.full_name || 'Customer'
                              : booking.business?.name || 'Service Provider'
                            }
                          </p>
                          {booking.requested_date && (
                            <p className="text-xs text-gray-600 mt-1">
                              {format(new Date(booking.requested_date), 'MMM d, yyyy')}
                              {booking.requested_time && ` at ${booking.requested_time}`}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-4">No bookings yet</p>
                    <Link href="/dashboard/bookings">
                      <Button variant="outline" className="border-orange-300 hover:bg-orange-50">
                        View Bookings
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/invoices">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">Invoices</p>
                {stats.unpaidInvoices > 0 && (
                  <Badge className="mt-2 bg-orange-500 text-white">{stats.unpaidInvoices} unpaid</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/bookings">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">
                  {isBusinessOwner ? 'Bookings' : 'My Bookings'}
                </p>
                {stats.pendingBookings > 0 && (
                  <Badge className="mt-2 bg-blue-500 text-white">{stats.pendingBookings} pending</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/messages">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">Messages</p>
                {unreadMessages > 0 && (
                  <Badge className="mt-2 bg-orange-500 text-white">{unreadMessages} unread</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
          {isBusinessOwner ? (
            <Link href="/dashboard/businesses">
              <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Building className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-semibold">My Businesses</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Link href="/find">
              <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Bell className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-semibold">Find Services</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
