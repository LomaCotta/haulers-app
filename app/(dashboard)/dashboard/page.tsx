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
  Bell,
  ArrowRight,
  CreditCard,
  Clock,
  MapPin
} from 'lucide-react'
// Simple date formatting helper
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

interface UpcomingEvent {
  id: string
  title: string
  date: string
  time?: string
  address?: string
  status: string
  type: 'booking' | 'job'
}

interface Invoice {
  id: string
  invoice_number: string
  total_cents: number
  balance_cents: number
  due_date?: string
  status: string
  business?: {
    name: string
  }
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            router.push('/onboarding')
            return
          }
        }

        if (profileData) {
          setProfile(profileData)

          // Redirect providers and admins to their specific pages
          if (profileData.role === 'provider') {
            router.push('/dashboard/businesses')
            return
          } else if (profileData.role === 'admin') {
            router.push('/admin')
            return
          }

          // For consumers, load dashboard data
          await Promise.all([
            loadUpcomingEvents(user.id),
            loadUnreadMessages(user.id),
            loadUnpaidInvoices(user.id)
          ])
        } else {
          router.push('/onboarding')
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router, supabase])

  const loadUpcomingEvents = async (userId: string) => {
    try {
      // Get upcoming bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, requested_date, requested_time, service_address, booking_status, service_details, business:businesses(name)')
        .eq('customer_id', userId)
        .in('booking_status', ['confirmed', 'accepted', 'scheduled', 'in_progress'])
        .gte('requested_date', new Date().toISOString().split('T')[0])
        .order('requested_date', { ascending: true })
        .order('requested_time', { ascending: true })
        .limit(3)

      // Get upcoming scheduled jobs from movers_scheduled_jobs (if they're a customer)
      // First get quotes for this customer, then get scheduled jobs for those quotes
      const { data: customerQuotes } = await supabase
        .from('movers_quotes')
        .select('id')
        .eq('customer_id', userId)
      
      const quoteIds = customerQuotes?.map(q => q.id) || []
      
      let scheduledJobs: any[] = []
      if (quoteIds.length > 0) {
        const { data: jobs } = await supabase
          .from('movers_scheduled_jobs')
          .select(`
            id,
            scheduled_date,
            scheduled_start_time,
            status,
            quote_id,
            quote:movers_quotes!quote_id(pickup_address, full_name)
          `)
          .in('quote_id', quoteIds)
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .in('status', ['scheduled', 'confirmed', 'in_progress'])
          .order('scheduled_date', { ascending: true })
          .order('scheduled_start_time', { ascending: true })
          .limit(3)
        
        scheduledJobs = jobs || []
      }

      const events: UpcomingEvent[] = []

      // Add bookings
      if (bookings) {
        bookings.forEach((booking: any) => {
          events.push({
            id: booking.id,
            title: booking.business?.name || 'Service',
            date: booking.requested_date,
            time: booking.requested_time,
            address: booking.service_address || booking.service_details?.from_address,
            status: booking.booking_status,
            type: 'booking'
          })
        })
      }

      // Add scheduled jobs
      if (scheduledJobs) {
        scheduledJobs.forEach((job: any) => {
          events.push({
            id: job.id,
            title: job.quote?.full_name || 'Scheduled Service',
            date: job.scheduled_date,
            time: job.scheduled_start_time,
            address: job.quote?.pickup_address,
            status: job.status,
            type: 'job'
          })
        })
      }

      // Sort by date and time, take top 3
      events.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`)
        const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`)
        return dateA.getTime() - dateB.getTime()
      })

      setUpcomingEvents(events.slice(0, 3))
    } catch (error) {
      console.error('Error loading upcoming events:', error)
    }
  }

  const loadUnreadMessages = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      setUnreadMessages(count || 0)
    } catch (error) {
      console.error('Error loading unread messages:', error)
    }
  }

  const loadUnpaidInvoices = async (userId: string) => {
    try {
      const response = await fetch(`/api/invoices?customerId=${userId}&status=sent`)
      const data = await response.json()

      if (response.ok && data) {
        const unpaid = data.filter((inv: Invoice) => 
          inv.status === 'sent' || inv.status === 'overdue' || inv.balance_cents > 0
        )
        setUnpaidInvoices(unpaid)
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'consumer') {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {profile.full_name}!</p>
        </div>

        {/* Notifications Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unpaid Invoices */}
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  Invoices
                </CardTitle>
                {unpaidInvoices.length > 0 && (
                  <Badge className="bg-orange-500 text-white">{unpaidInvoices.length}</Badge>
                )}
              </div>
              <CardDescription>Outstanding invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length > 0 ? (
                <div className="space-y-3">
                  {unpaidInvoices.slice(0, 3).map((invoice) => (
                    <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`}>
                      <div className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{invoice.invoice_number}</p>
                            <p className="text-xs text-gray-600">{invoice.business?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-gray-900">
                              ${(invoice.balance_cents / 100).toFixed(2)}
                            </p>
                            {invoice.due_date && (
                              <p className="text-xs text-gray-500">
                                {formatDateDistance(invoice.due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {unpaidInvoices.length > 3 && (
                    <Link href="/dashboard/invoices">
                      <Button variant="ghost" className="w-full text-sm text-orange-600 hover:text-orange-700">
                        View All ({unpaidInvoices.length})
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No outstanding invoices</p>
              )}
              <Link href="/dashboard/invoices">
                <Button variant="outline" className="w-full mt-3 border-orange-300 hover:bg-orange-50">
                  View All Invoices
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Unread Messages */}
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  Messages
                </CardTitle>
                {unreadMessages > 0 && (
                  <Badge className="bg-orange-500 text-white">{unreadMessages}</Badge>
                )}
              </div>
              <CardDescription>Unread messages</CardDescription>
            </CardHeader>
            <CardContent>
              {unreadMessages > 0 ? (
                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-orange-600 mb-2">{unreadMessages}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    {unreadMessages === 1 ? 'unread message' : 'unread messages'}
                  </p>
                  <Link href="/dashboard/messages">
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                      View Messages
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">No unread messages</p>
                  <Link href="/dashboard/messages">
                    <Button variant="outline" className="w-full border-orange-300 hover:bg-orange-50">
                      View Messages
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Upcoming Events
                </CardTitle>
                {upcomingEvents.length > 0 && (
                  <Badge className="bg-orange-500 text-white">{upcomingEvents.length}</Badge>
                )}
              </div>
              <CardDescription>Next 1-3 scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const eventDate = new Date(`${event.date}T${event.time || '00:00:00'}`)
                    return (
                      <Link key={event.id} href={`/dashboard/bookings/${event.id}`}>
                        <div className="p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{event.title}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>{eventDate.toLocaleDateString()} {event.time}</span>
                              </div>
                              {event.address && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{event.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  <Link href="/dashboard/bookings">
                    <Button variant="ghost" className="w-full text-sm text-orange-600 hover:text-orange-700">
                      View All Bookings
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">No upcoming events</p>
                  <Link href="/dashboard/bookings">
                    <Button variant="outline" className="w-full border-orange-300 hover:bg-orange-50">
                      View Bookings
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/bookings">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">My Bookings</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/invoices">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">Invoices</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/messages">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">Messages</p>
                {unreadMessages > 0 && (
                  <Badge className="mt-2 bg-orange-500 text-white">{unreadMessages}</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/find">
            <Card className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 text-center">
                <Bell className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold">Find Services</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
