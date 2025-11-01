'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ModernCalendar, CalendarEvent } from '@/components/calendar/ModernCalendar'
import { EventModal } from '@/components/calendar/EventModal'
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
  Filter,
  ChevronLeft,
  ChevronRight,
  Save,
  Settings
} from 'lucide-react'

interface Booking {
  id: string
  customer_id: string // Actual column name in database
  business_id: string
  booking_status: string // 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'
  requested_date: string // Actual column name (not move_date)
  requested_time?: string
  service_type?: string
  service_address?: string
  service_city?: string
  service_state?: string
  total_price_cents?: number // Actual column (not quote_cents)
  base_price_cents?: number
  hourly_rate_cents?: number
  service_details?: any // JSONB
  customer_notes?: string
  business_notes?: string
  customer_phone?: string
  customer_email?: string
  created_at: string
  updated_at: string
  business?: {
    id: string
    name: string
    city: string
    state: string
    rating_avg: number
    rating_count: number
  }
  customer?: {
    id: string
    full_name: string
  }
}

interface AvailabilityRule {
  id?: string
  weekday: number
  start_time: string
  end_time: string
  max_concurrent_jobs: number
  morning_jobs: number
  afternoon_jobs: number
  morning_start: string
  afternoon_start: string
  afternoon_end: string
}

interface ScheduledJob {
  id: string
  scheduled_date: string
  time_slot: 'morning' | 'afternoon' | 'full_day'
  scheduled_start_time: string
  scheduled_end_time: string
  crew_size: number
  status: string
  quote?: {
    full_name: string
    phone?: string
    pickup_address: string
    dropoff_address?: string
    price_total_cents: number
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isProvider, setIsProvider] = useState(false)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([])
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])
  const [providerBookings, setProviderBookings] = useState<Booking[]>([]) // Bookings from bookings table for providers
  const [saving, setSaving] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUserType()
  }, [])

  useEffect(() => {
    console.log('useEffect triggered - isProvider:', isProvider, 'providerId:', providerId, 'businessId:', businessId)
    if (isProvider && (providerId || businessId)) {
      fetchAvailabilityRules()
      fetchScheduledJobs()
      // Also fetch bookings for this provider's business
      if (businessId) {
        console.log('Calling fetchProviderBookings for businessId:', businessId)
        fetchProviderBookings()
      } else {
        console.warn('isProvider is true but businessId is not set!')
      }
    } else {
      console.log('User is not a provider, fetching consumer bookings')
      fetchBookings()
    }
  }, [isProvider, providerId, businessId, currentMonth])

  // Fetch bookings for provider's business (in case they're not in movers_scheduled_jobs)
  const fetchProviderBookings = async () => {
    if (!businessId) {
      console.log('No businessId set, cannot fetch provider bookings')
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Fetching bookings for provider business:', businessId)
      console.log('Current user:', user?.id)
      console.log('Provider ID:', providerId)
      
      // First, let's check if we can see ANY bookings at all (for debugging)
      // This might be blocked by RLS if user doesn't own businesses with bookings
      const { data: allBookings, error: allError } = await supabase
        .from('bookings')
        .select('id, business_id, booking_status, requested_date, created_at, customer_id')
        .limit(5)
      
      if (allError) {
        console.error('Error fetching ANY bookings (for debug):', allError)
        console.error('RLS may be blocking - user can only see bookings they own or their businesses have')
      } else {
        console.log('Sample of all bookings visible to this user:', allBookings)
        console.log('Note: RLS filters - user can only see bookings they created or for their businesses')
      }
      
      // First, get all businesses this user owns
      const { data: userBusinesses, error: businessesError } = await supabase
        .from('businesses')
        .select('id, name, owner_id')
        .eq('owner_id', user?.id || '')
      
      if (businessesError) {
        console.error('Error fetching user businesses:', businessesError)
      }
      
      console.log('User ID:', user?.id)
      console.log('User owns businesses:', userBusinesses)
      console.log('Current businessId:', businessId)
      
      // Fetch bookings for ALL businesses this user owns (not just one)
      let businessIds = [businessId]
      if (userBusinesses && userBusinesses.length > 0) {
        businessIds = userBusinesses.map(b => b.id)
        console.log('✅ Fetching bookings for ALL businesses:', businessIds)
        console.log('Including bookings for:', userBusinesses.map(b => `${b.name} (${b.id})`).join(', '))
        
        // Check if the business with bookings is in the list
        const hasBookingBusiness = businessIds.includes('f4527f20-6aa0-4efb-9dce-73a7751daf95')
        console.log('Does user own business f4527f20-6aa0-4efb-9dce-73a7751daf95?', hasBookingBusiness)
        if (!hasBookingBusiness) {
          console.warn('⚠️ User does NOT own the business with bookings!')
          console.warn('Bookings are for business: f4527f20-6aa0-4efb-9dce-73a7751daf95')
          console.warn('User owns:', businessIds)
        }
      } else {
        console.warn('⚠️ User owns NO businesses!')
      }
      
      // Now try to fetch bookings for this business (or all businesses)
      console.log('Querying bookings for business_ids:', businessIds)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching provider bookings:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        console.error('Error stringified:', JSON.stringify(error, null, 2))
        console.error('Business ID:', businessId)
        console.error('User ID:', user?.id)
        
        // Also verify the business exists and we own it
        const { data: businessCheck, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, owner_id')
          .eq('id', businessId)
          .maybeSingle()
        
        if (businessError) {
          console.error('Error checking business:', businessError)
        } else {
          console.log('Business check:', businessCheck)
          console.log('Business owner matches current user?', businessCheck?.owner_id === user?.id)
        }
        
        return
      }
      
      console.log('Loaded provider bookings:', data?.length || 0)
      console.log('Bookings data:', data)
      
      if (data && data.length === 0) {
        console.warn('No bookings found for business:', businessId)
        console.log('Checking if bookings exist in database...')
        
        // Try a direct query to see if bookings exist for this business
        const { data: directCheck, error: directError } = await supabase
          .from('bookings')
          .select('id, business_id, booking_status, requested_date')
          .eq('business_id', businessId)
        
        if (directError) {
          console.error('Direct check error:', directError)
        } else {
          console.log('Direct query result - bookings found:', directCheck?.length || 0)
          console.log('Direct query bookings:', directCheck)
        }
        
        // Also check what businesses this user owns and if any have bookings
        const { data: userBusinesses } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user?.id || '')
        
        console.log('User owns these businesses:', userBusinesses)
        
        if (userBusinesses && userBusinesses.length > 0) {
          // Check bookings for ALL businesses this user owns
          const businessIds = userBusinesses.map(b => b.id)
          console.log('Checking bookings for all businesses:', businessIds)
          
          const { data: allBusinessBookings, error: allBookingsError } = await supabase
            .from('bookings')
            .select('id, business_id, booking_status, requested_date')
            .in('business_id', businessIds)
          
          if (allBookingsError) {
            console.error('Error fetching all business bookings:', allBookingsError)
          } else {
            console.log('Bookings found across ALL user businesses:', allBusinessBookings?.length || 0)
            console.log('All business bookings:', allBusinessBookings)
            
            if (allBusinessBookings && allBusinessBookings.length > 0) {
              console.warn('⚠️ BOOKINGS EXIST but for different business_id!')
              console.warn('Bookings are for:', allBusinessBookings.map(b => b.business_id))
              console.warn('But we are querying:', businessId)
              console.warn('Consider fetching bookings for ALL businesses this user owns')
            }
          }
        }
        
        console.log('This could mean:')
        console.log('1. No bookings exist for this business')
        console.log('2. RLS is blocking access (check policies)')
        console.log('3. business_id mismatch - looking for:', businessId)
        console.log('   Expected business_id from query: f4527f20-6aa0-4efb-9dce-73a7751daf95')
      } else if (data && data.length > 0) {
        console.log('Successfully fetched', data.length, 'bookings for provider!')
      }
      
      // Fetch business and customer info for each booking
      const bookingsWithRelations = await Promise.all((data || []).map(async (booking: any) => {
        try {
          const [businessResult, customerResult] = await Promise.all([
            supabase
              .from('businesses')
              .select('id, name, city, state, rating_avg, rating_count')
              .eq('id', booking.business_id)
              .maybeSingle(),
            booking.customer_id ? supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', booking.customer_id)
              .maybeSingle() : Promise.resolve({ data: null })
          ])
          
          return {
            ...booking,
            business: businessResult.data || null,
            customer: customerResult.data || null
          }
        } catch (err) {
          console.error('Error fetching relations for booking:', booking.id, err)
          return booking
        }
      }))
      
      setProviderBookings(bookingsWithRelations)
      
      // Also convert bookings to scheduled jobs format for calendar display
      if (data && data.length > 0) {
        const bookingsAsJobs = await Promise.all(data.map(async (booking: any) => {
          // Fetch customer info
          let customerName = 'Customer'
          if (booking.customer_id) {
            const { data: customer } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', booking.customer_id)
              .maybeSingle()
            customerName = customer?.full_name || 'Customer'
          }
          
          // Get address from service_address or service_details JSONB
          const serviceDetails = booking.service_details || {}
          const pickupAddress = booking.service_address || 
                                serviceDetails.from_address || 
                                serviceDetails.to_address || 
                                serviceDetails.address || 
                                serviceDetails.addresses || 
                                ''
          
          return {
            id: `booking-${booking.id}`,
            scheduled_date: booking.requested_date || (booking as any).move_date,
            scheduled_start_time: booking.requested_time || '08:00:00',
            scheduled_end_time: booking.requested_time || '17:00:00',
            time_slot: 'full_day' as const,
            status: booking.booking_status || (booking as any).status || 'pending',
            crew_size: 2,
            quote: {
              full_name: customerName,
              pickup_address: pickupAddress,
              price_total_cents: booking.total_price_cents || booking.base_price_cents || (booking as any).quote_cents || 0
            }
          }
        }))
        
        console.log('Converted bookings to jobs:', bookingsAsJobs.length)
        console.log('Sample converted job:', bookingsAsJobs[0])
        // Merge with existing scheduled jobs (avoid duplicates)
        setScheduledJobs(prev => {
          const existingIds = new Set((prev || []).map(j => j.id))
          const newJobs = bookingsAsJobs.filter(j => !existingIds.has(j.id))
          const merged = [...(prev || []), ...newJobs]
          console.log('Merged scheduled jobs. Total:', merged.length)
          return merged
        })
      }
    } catch (error) {
      console.error('Error in fetchProviderBookings:', error)
    }
  }

  // Convert scheduledJobs AND providerBookings to calendar events for providers
  useEffect(() => {
    if (isProvider) {
      const allEvents: CalendarEvent[] = []
      
      // Convert scheduledJobs to calendar events
      if (scheduledJobs && scheduledJobs.length > 0) {
        console.log('Converting scheduled jobs to calendar events:', scheduledJobs.length, 'jobs')
        const jobEvents: CalendarEvent[] = scheduledJobs
          .filter(job => {
            const hasDate = job.scheduled_date
            if (!hasDate) {
              console.warn('Scheduled job missing date:', job.id)
            }
            return hasDate
          })
          .map((job) => {
            // Ensure date is in YYYY-MM-DD format
            let date: string = job.scheduled_date
            if (typeof date === 'string') {
              // If it's already a string, make sure it's YYYY-MM-DD
              const dateObj = new Date(date)
              if (!isNaN(dateObj.getTime())) {
                date = dateObj.toISOString().split('T')[0]
              }
            } else {
              // Convert Date to string if needed
              date = String(date)
            }
            
            // Map job status to CalendarEvent status type
            let status: 'scheduled' | 'completed' | 'confirmed' | 'in_progress' | 'cancelled' | undefined = 'scheduled'
            if (job.status === 'completed') status = 'completed'
            else if (job.status === 'confirmed') status = 'confirmed'
            else if (job.status === 'in_progress') status = 'in_progress'
            else if (job.status === 'cancelled') status = 'cancelled'
            
            console.log('Converting scheduled job:', job.id, 'date:', date, 'status:', job.status)
            
            return {
              id: job.id,
              date: date,
              title: job.quote?.full_name || 'Scheduled Job',
              time: `${job.scheduled_start_time} - ${job.scheduled_end_time}`,
              type: 'reservation' as const,
              status: status,
              metadata: {
                customer: job.quote?.full_name,
                address: job.quote?.pickup_address,
                price: job.quote?.price_total_cents || 0,
                crewSize: job.crew_size,
                timeSlot: job.time_slot,
              },
            }
          })
        allEvents.push(...jobEvents)
        console.log('Created calendar events from scheduled jobs:', jobEvents.length)
      }
      
      // Also convert providerBookings directly to calendar events (in addition to scheduledJobs)
      if (providerBookings && providerBookings.length > 0) {
        console.log('Converting provider bookings to calendar events:', providerBookings.length, 'bookings')
        const bookingEvents: CalendarEvent[] = providerBookings
          .filter(booking => {
            const hasDate = booking.requested_date || (booking as any).move_date
            if (!hasDate) {
              console.warn('Provider booking missing requested_date:', booking.id)
            }
            return hasDate
          })
          .map((booking: any) => {
            // Ensure date is in YYYY-MM-DD format
            let date = booking.requested_date || (booking as any).move_date
            if (date && typeof date === 'object' && date instanceof Date) {
              date = date.toISOString().split('T')[0]
            } else if (typeof date === 'string') {
              const dateObj = new Date(date)
              if (!isNaN(dateObj.getTime())) {
                date = dateObj.toISOString().split('T')[0]
              }
            }
            
            // Map booking_status to CalendarEvent status type
            const bookingStatus = booking.booking_status || (booking as any).status || 'pending'
            let status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | undefined
            if (bookingStatus === 'confirmed' || bookingStatus === 'accepted') status = 'confirmed'
            else if (bookingStatus === 'in_progress') status = 'in_progress'
            else if (bookingStatus === 'completed') status = 'completed'
            else if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') status = 'cancelled'
            else if (bookingStatus === 'pending' || bookingStatus === 'requested') status = 'scheduled'
            else status = 'scheduled'
            
            // Get address
            const address = booking.service_address || 
                          (booking.service_details?.from_address) ||
                          (booking.service_details?.address) ||
                          ''
            
            const customerName = booking.customer?.full_name || 
                                booking.customer_email || 
                                booking.customer_phone ||
                                'Customer'
            
            console.log('Converting provider booking:', booking.id, 'date:', date, 'status:', status, 'customer:', customerName)
            
            return {
              id: `provider-booking-${booking.id}`,
              date: date,
              title: customerName,
              time: booking.requested_time || '',
              type: 'booking' as const,
              status: status,
              metadata: {
                customer: customerName,
                address: address,
                city: booking.service_city || '',
                state: booking.service_state || '',
                price: booking.total_price_cents || booking.base_price_cents || 0,
                serviceType: booking.service_type || '',
                business: booking.business?.name,
              },
            }
          })
        
        // Merge with existing events, avoiding duplicates
        const existingIds = new Set(allEvents.map(e => e.id))
        const newBookingEvents = bookingEvents.filter(e => !existingIds.has(e.id))
        allEvents.push(...newBookingEvents)
        console.log('Created calendar events from provider bookings:', bookingEvents.length, '(new:', newBookingEvents.length, ')')
      }
      
      console.log('Total calendar events for provider:', allEvents.length)
      if (allEvents.length > 0) {
        console.log('Sample provider calendar events:', allEvents.slice(0, 3))
        console.log('All provider event dates:', allEvents.map(e => e.date))
      }
      setCalendarEvents(allEvents)
    } else if (isProvider && (!scheduledJobs || scheduledJobs.length === 0) && (!providerBookings || providerBookings.length === 0)) {
      console.log('No scheduled jobs or provider bookings to convert to calendar events')
      setCalendarEvents([])
    }
  }, [isProvider, scheduledJobs, providerBookings])

      // Convert bookings to calendar events for consumers
  useEffect(() => {
    if (!isProvider && bookings && bookings.length > 0) {
      console.log('Converting bookings to calendar events:', bookings.length, 'bookings')
      const events: CalendarEvent[] = bookings
        .filter(booking => {
          const hasDate = booking.requested_date || (booking as any).move_date
          if (!hasDate) {
            console.warn('Booking missing requested_date:', booking.id)
          }
          return hasDate
        })
        .map((booking: any) => {
          // Actual schema: requested_date, booking_status, total_price_cents, service_address, etc.
          // Ensure date is in YYYY-MM-DD format
          let date = booking.requested_date || (booking as any).move_date
          if (date && typeof date === 'object' && date instanceof Date) {
            date = date.toISOString().split('T')[0]
          } else if (typeof date === 'string') {
            // If it's already a string, make sure it's YYYY-MM-DD
            const dateObj = new Date(date)
            if (!isNaN(dateObj.getTime())) {
              date = dateObj.toISOString().split('T')[0]
            }
          }
          
          // Map booking_status to CalendarEvent status type
          const bookingStatus = booking.booking_status || (booking as any).status || 'pending'
          let status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | undefined
          if (bookingStatus === 'confirmed' || bookingStatus === 'accepted') status = 'confirmed'
          else if (bookingStatus === 'in_progress') status = 'in_progress'
          else if (bookingStatus === 'completed') status = 'completed'
          else if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') status = 'cancelled'
          else if (bookingStatus === 'pending' || bookingStatus === 'requested') status = 'scheduled' // Treat pending/requested as scheduled for calendar
          else status = 'scheduled'
          
          // Get address from service_address or service_details
          const address = booking.service_address || 
                          (booking.service_details?.from_address) ||
                          (booking.service_details?.address) ||
                          ''
          
          console.log('Converting booking:', booking.id, 'date:', date, 'status:', status, 'address:', address)
          
          return {
            id: booking.id,
            date: date,
            title: booking.business?.name || 'Booking',
            time: booking.requested_time || '',
            type: 'booking' as const,
            status: status,
            metadata: {
              business: booking.business?.name,
              address: address,
              city: booking.service_city || booking.business?.city || '',
              state: booking.service_state || booking.business?.state || '',
              price: booking.total_price_cents || booking.base_price_cents || 0,
              serviceType: booking.service_type || '',
            },
          }
        })
      
      console.log('Created calendar events from bookings:', events.length, 'events')
      if (events.length > 0) {
        console.log('Sample booking events:', events.slice(0, 3))
        console.log('All booking event dates:', events.map(e => e.date))
      }
      setCalendarEvents(events)
    } else if (!isProvider && (!bookings || bookings.length === 0)) {
      console.log('No bookings to convert to calendar events')
      setCalendarEvents([])
    }
  }, [isProvider, bookings])

  const checkUserType = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      console.log('Checking user type for user:', user.id)

      // Check if user is a movers provider
      const { data: provider, error: providerError } = await supabase
        .from('movers_providers')
        .select('id, business_id')
        .eq('owner_user_id', user.id)
        .maybeSingle()

      if (providerError) {
        console.error('Error fetching provider:', providerError)
      }

      if (provider) {
        console.log('User is a provider:', provider.id, 'Business ID:', provider.business_id)
        setIsProvider(true)
        setProviderId(provider.id)
        setBusinessId(provider.business_id)
        return
      }

      // Also check if user owns any business directly
      const { data: businesses, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)

      if (businessError) {
        console.error('Error fetching businesses:', businessError)
      }

      if (businesses && businesses.length > 0) {
        console.log('User owns', businesses.length, 'businesses:', businesses)
        // Use the first business (or we could check which one has bookings)
        const primaryBusiness = businesses[0]
        console.log('Using primary business:', primaryBusiness.id, primaryBusiness.name)
        setIsProvider(true)
        setProviderId(null)
        setBusinessId(primaryBusiness.id)
        
        // Also log all business IDs for debugging
        console.log('All businesses owned by user:', businesses.map(b => ({ id: b.id, name: b.name })))
        return
      }

      // Otherwise, they're a consumer
      console.log('User is a consumer')
      setIsProvider(false)
    } catch (error) {
      console.error('Error checking user type:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found')
        setLoading(false)
        return
      }

      console.log('Fetching bookings for user:', user.id)
      console.log('Looking for bookings where customer_id =', user.id)

      // Actual schema: customer_id (not consumer_id!), business_id, booking_status, requested_date, etc.
      // Try simpler query first without join
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Better error logging
        console.error('Error fetching bookings:', error)
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
        
        const errorMessage = error?.message || error?.toString() || String(error)
        console.error('Error message extracted:', errorMessage)
        
        setBookings([])
        setLoading(false)
        return
      }

      console.log('Loaded bookings:', data?.length || 0, 'bookings')
      
      // Now fetch business data separately for each booking
      const bookingsWithBusiness = await Promise.all((data || []).map(async (booking: any) => {
        try {
          const [businessResult, customerResult] = await Promise.all([
            booking.business_id ? supabase
              .from('businesses')
              .select('id, name, city, state, rating_avg, rating_count')
              .eq('id', booking.business_id)
              .maybeSingle() : Promise.resolve({ data: null, error: null }),
            booking.customer_id ? supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', booking.customer_id)
              .maybeSingle() : Promise.resolve({ data: null, error: null })
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

      console.log('Bookings with business data:', bookingsWithBusiness.length)
      console.log('Sample booking with business:', bookingsWithBusiness[0])
      setBookings(bookingsWithBusiness)
    } catch (error) {
      console.error('Unexpected error:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailabilityRules = async () => {
    if (!providerId && !businessId) return

    try {
      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)

      const res = await fetch(`/api/movers/availability/rules?${params}`)
      const data = await res.json()

      if (data.rules) {
        setAvailabilityRules(data.rules)
      } else {
        // Initialize with default rules for all weekdays
        const defaultRules: AvailabilityRule[] = []
        for (let i = 0; i < 7; i++) {
          defaultRules.push({
            weekday: i,
            start_time: '08:00:00',
            end_time: '17:00:00',
            max_concurrent_jobs: 1,
            morning_jobs: 3,
            afternoon_jobs: 2,
            morning_start: '08:00:00',
            afternoon_start: '12:00:00',
            afternoon_end: '17:00:00',
          })
        }
        setAvailabilityRules(defaultRules)
      }
    } catch (error) {
      console.error('Error fetching availability rules:', error)
    }
  }

  const fetchScheduledJobs = async () => {
    if (!providerId && !businessId) {
      console.log('No providerId or businessId for fetchScheduledJobs')
      return
    }

    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]

      console.log('Fetching scheduled jobs for provider:', providerId || businessId, 'from', startOfMonth, 'to', endOfMonth)

      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)
      params.set('startDate', startOfMonth)
      params.set('endDate', endOfMonth)

      const res = await fetch(`/api/movers/availability/scheduled?${params}`)
      const data = await res.json()

      console.log('Scheduled jobs API response:', data)

      if (data.error) {
        console.error('Error from scheduled jobs API:', data.error)
        setScheduledJobs([])
        return
      }

      if (data.scheduled) {
        console.log('Loaded scheduled jobs:', data.scheduled.length)
        console.log('Sample scheduled job:', data.scheduled[0])
        setScheduledJobs(data.scheduled)
      } else {
        console.log('No scheduled jobs in response')
        setScheduledJobs([])
      }
    } catch (error) {
      console.error('Error fetching scheduled jobs:', error)
      setScheduledJobs([])
    }
  }

  const saveAvailabilityRules = async () => {
    if (!providerId && !businessId) return

    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)

      const res = await fetch('/api/movers/availability/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          businessId,
          rules: availabilityRules,
        }),
      })

      const data = await res.json()

      if (data.success) {
        alert('Availability rules saved successfully!')
      } else {
        alert('Error saving availability rules: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving availability rules:', error)
      alert('Error saving availability rules')
    } finally {
      setSaving(false)
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

  // Provider Calendar View
  if (isProvider) {
    const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Calendar</h1>
            <p className="text-gray-600">Set your availability and view scheduled jobs</p>
          </div>
          <div className="flex gap-2 rounded-lg border border-gray-300 p-1 bg-white">
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              <Filter className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="space-y-6">
            {/* Availability Rules Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Weekly Availability Settings
                </CardTitle>
                <CardDescription>Set how many jobs you can take per day for morning and afternoon slots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                    const rule = availabilityRules.find(r => r.weekday === weekday) || {
                      weekday,
                      start_time: '08:00:00',
                      end_time: '17:00:00',
                      max_concurrent_jobs: 1,
                      morning_jobs: 3,
                      afternoon_jobs: 2,
                      morning_start: '08:00:00',
                      afternoon_start: '12:00:00',
                      afternoon_end: '17:00:00',
                    }
                    const ruleIndex = availabilityRules.findIndex(r => r.weekday === weekday)

                    return (
                      <div key={weekday} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900">{fullDayNames[weekday]}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Morning Jobs</label>
                            <Input
                              type="number"
                              min="0"
                              value={rule.morning_jobs}
                              onChange={(e) => {
                                const newRules = [...availabilityRules]
                                if (ruleIndex >= 0) {
                                  newRules[ruleIndex] = { ...newRules[ruleIndex], morning_jobs: parseInt(e.target.value) || 0 }
                                } else {
                                  newRules.push({ ...rule, morning_jobs: parseInt(e.target.value) || 0 })
                                }
                                setAvailabilityRules(newRules)
                              }}
                            />
                            <p className="text-xs text-gray-500">Max jobs: 8:00 AM - 12:00 PM</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Afternoon Jobs</label>
                            <Input
                              type="number"
                              min="0"
                              value={rule.afternoon_jobs}
                              onChange={(e) => {
                                const newRules = [...availabilityRules]
                                if (ruleIndex >= 0) {
                                  newRules[ruleIndex] = { ...newRules[ruleIndex], afternoon_jobs: parseInt(e.target.value) || 0 }
                                } else {
                                  newRules.push({ ...rule, afternoon_jobs: parseInt(e.target.value) || 0 })
                                }
                                setAvailabilityRules(newRules)
                              }}
                            />
                            <p className="text-xs text-gray-500">Max jobs: 12:00 PM - 5:00 PM</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={saveAvailabilityRules} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Availability Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Modern Calendar with Events */}
            <ModernCalendar
              events={calendarEvents}
              onDateClick={(date) => {
                const dateStr = date.toISOString().split('T')[0]
                const dayEvents = calendarEvents.filter(e => e.date === dateStr)
                if (dayEvents.length > 0) {
                  setSelectedEvent(dayEvents[0])
                }
              }}
              onEventClick={(event) => setSelectedEvent(event)}
            />
            {selectedEvent && (
              <EventModal
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{scheduledJobs.length + providerBookings.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Scheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {scheduledJobs.filter(j => j.status === 'scheduled' || j.status === 'confirmed').length + 
                     providerBookings.filter(b => {
                       const status = b.booking_status || (b as any).status
                       return status === 'confirmed' || status === 'in_progress'
                     }).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {providerBookings.filter(b => {
                      const status = b.booking_status || (b as any).status
                      return status === 'pending' || status === 'requested'
                    }).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {scheduledJobs.filter(j => j.status === 'completed').length + 
                     providerBookings.filter(b => {
                       const status = b.booking_status || (b as any).status
                       return status === 'completed'
                     }).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs List - Scheduled Jobs from movers_scheduled_jobs */}
            {scheduledJobs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Scheduled Jobs</h2>
                <div className="space-y-4">
                  {scheduledJobs.map((job) => (
                    <Card key={job.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={
                                job.status === 'scheduled' || job.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : job.status === 'completed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : job.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }>
                                {job.status}
                              </Badge>
                              <span className="font-semibold capitalize">{job.time_slot}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(job.scheduled_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {job.scheduled_start_time} - {job.scheduled_end_time}
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                Crew: {job.crew_size}
                              </div>
                            </div>
                            {job.quote && (
                              <div className="space-y-1 text-sm mt-3">
                                <div><strong>Customer:</strong> {job.quote.full_name}</div>
                                {job.quote.phone && <div><strong>Phone:</strong> {job.quote.phone}</div>}
                                {job.quote.pickup_address && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span><strong>Address:</strong> {job.quote.pickup_address}</span>
                                  </div>
                                )}
                                <div><strong>Price:</strong> ${((job.quote.price_total_cents || 0) / 100).toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings List - Bookings from bookings table */}
            {providerBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking Requests</h2>
                <div className="space-y-4">
                  {providerBookings.map((booking) => {
                    // Use actual schema columns
                    const serviceDetails = booking.service_details || {}
                    const fromAddress = serviceDetails.from_address || booking.service_address || ''
                    const toAddress = serviceDetails.to_address || serviceDetails.delivery_address || ''
                    const notes = booking.customer_notes || booking.business_notes || ''
                    
                    // Get customer name from booking relations
                    const customerName = booking.customer?.full_name || 
                                       booking.customer_phone || 
                                       booking.customer_email ||
                                       'Customer'
                    
                    // Map booking_status to display
                    const bookingStatus = booking.booking_status || 'pending'
                    
                    return (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className={
                                  bookingStatus === 'pending' || bookingStatus === 'requested'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : bookingStatus === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : bookingStatus === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : bookingStatus === 'completed'
                                    ? 'bg-gray-100 text-gray-800'
                                    : bookingStatus === 'cancelled' || bookingStatus === 'canceled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }>
                                  {bookingStatus.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm mb-3">
                                <div><strong>Customer:</strong> {customerName}</div>
                                {booking.customer_phone && (
                                  <div><strong>Phone:</strong> {booking.customer_phone}</div>
                                )}
                                {booking.customer_email && (
                                  <div><strong>Email:</strong> {booking.customer_email}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {booking.requested_date ? new Date(booking.requested_date).toLocaleDateString() : 'Date TBD'}
                                </div>
                                {booking.requested_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {booking.requested_time}
                                  </div>
                                )}
                                {booking.created_at && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Created: {new Date(booking.created_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1 text-sm mt-3">
                                {fromAddress && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                                    <span><strong>Address:</strong> {fromAddress}</span>
                                  </div>
                                )}
                                {booking.service_city && (
                                  <div><strong>City:</strong> {booking.service_city}, {booking.service_state}</div>
                                )}
                                {booking.service_type && (
                                  <div><strong>Service Type:</strong> {booking.service_type}</div>
                                )}
                                {booking.total_price_cents && booking.total_price_cents > 0 && (
                                  <div><strong>Price:</strong> ${(booking.total_price_cents / 100).toFixed(2)}</div>
                                )}
                                {notes && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded">
                                    <strong>Notes:</strong> {notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {scheduledJobs.length === 0 && providerBookings.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs or bookings</h3>
                  <p className="text-gray-600 mb-4">Your scheduled jobs and booking requests will appear here</p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Note:</strong> If you're expecting to see bookings, check:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Are you logged in as the business owner?</li>
                      <li>Do bookings exist for your business(es)?</li>
                      <li>Check the browser console for detailed logs</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    )
  }

  // Consumer Bookings View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600">Track your service requests and bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 rounded-lg border border-gray-300 p-1 bg-white">
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              <Filter className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
          <Button asChild>
            <Link href="/find">
              <Plus className="w-4 h-4 mr-2" />
              Find Services
            </Link>
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          <ModernCalendar
            events={calendarEvents}
            onDateClick={(date) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayEvents = calendarEvents.filter(e => e.date === dateStr)
              if (dayEvents.length > 0) {
                setSelectedEvent(dayEvents[0])
              }
            }}
            onEventClick={(event) => setSelectedEvent(event)}
          />
          {selectedEvent && (
            <EventModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
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
              {bookings.filter(b => {
                const status = b.booking_status || (b as any).status
                return ['pending', 'requested', 'confirmed', 'in_progress'].includes(status)
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bookings.filter(b => {
                const status = b.booking_status || (b as any).status
                return status === 'completed'
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(bookings.filter(b => {
                const status = b.booking_status || (b as any).status
                return status === 'completed'
              }).reduce((sum, b) => sum + (b.total_price_cents || b.base_price_cents || 0), 0))}
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
                      <h3 className="text-lg font-semibold">{booking.business?.name || 'Booking'}</h3>
                      <Badge className={getStatusColor(booking.booking_status || (booking as any).status || 'pending')}>
                        {(booking.booking_status || (booking as any).status || 'pending').charAt(0).toUpperCase() + (booking.booking_status || (booking as any).status || 'pending').slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{booking.requested_date ? new Date(booking.requested_date).toLocaleDateString() : 'Date TBD'}</span>
                      </div>
                      {booking.requested_time && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{booking.requested_time}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.service_city || booking.business?.city || ''}, {booking.service_state || booking.business?.state || ''}</span>
                      </div>
                      {booking.business && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{booking.business.rating_avg || 0} ({booking.business.rating_count || 0})</span>
                        </div>
                      )}
                    </div>
                    
                    {booking.service_address && (
                      <div className="text-sm text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        <span className="font-medium">Address:</span> {booking.service_address}
                      </div>
                    )}

                    {(booking.total_price_cents || booking.base_price_cents) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">Price: {formatPrice(booking.total_price_cents || booking.base_price_cents || 0)}</span>
                      </div>
                    )}

                    {booking.service_details && typeof booking.service_details === 'object' && Object.keys(booking.service_details).length > 0 && (
                      <div className="text-sm text-gray-600 mb-4">
                        <p className="font-medium">Service Details:</p>
                        <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(booking.service_details, null, 2)}</pre>
                      </div>
                    )}
                    
                    {booking.customer_notes && (
                      <div className="text-sm text-gray-600 mb-4">
                        <p className="font-medium">Notes:</p>
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
                    {((booking.booking_status || (booking as any).status) === 'completed') && (
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
        </>
      )}
    </div>
  )
}