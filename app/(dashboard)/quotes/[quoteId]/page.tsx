'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, CheckCircle2, Calendar, MapPin, User, Phone, Mail,
  Building, Clock, FileText, Download, ArrowLeft, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface MoversQuote {
  id: string
  provider_id: string | null
  customer_id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  pickup_address: string | null
  dropoff_address: string | null
  move_date: string | null
  crew_size: number | null
  price_total_cents: number | null
  status: string
  created_at: string
}

interface ScheduledJob {
  id: string
  scheduled_date: string
  time_slot: string
  scheduled_start_time: string
  scheduled_end_time: string
  status: string
}

interface Business {
  id: string
  name: string
  city: string
  state: string
}

export default function QuoteReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.quoteId as string
  const [quote, setQuote] = useState<MoversQuote | null>(null)
  const [scheduledJob, setScheduledJob] = useState<ScheduledJob | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadQuote()
  }, [quoteId])

  const loadQuote = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Fetch movers quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('movers_quotes')
        .select('*')
        .eq('id', quoteId)
        .single()

      if (quoteError) {
        console.error('Quote error:', quoteError)
        console.error('Quote error details:', {
          message: quoteError.message,
          code: quoteError.code,
          details: quoteError.details,
          hint: quoteError.hint
        })
        
        // Check if it's an RLS error
        if (quoteError.code === '42501' || quoteError.message?.includes('permission') || quoteError.message?.includes('policy')) {
          setError('You do not have permission to view this quote. If this is your quote, please ensure you are logged in with the correct account.')
        } else if (quoteError.code === 'PGRST116') {
          setError(`Quote not found. Please check your Quote ID: ${quoteId.slice(0, 8)}...`)
        } else {
          setError(`Error loading quote: ${quoteError.message || 'Unknown error'}. Please check your Quote ID.`)
        }
        return
      }

      if (!quoteData) {
        console.error('Quote not found:', quoteId)
        setError(`Quote not found. Please check your Quote ID: ${quoteId.slice(0, 8)}...`)
        return
      }

      setQuote(quoteData)

      // Fetch related scheduled job
      if (quoteData.id) {
        const { data: jobs } = await supabase
          .from('movers_scheduled_jobs')
          .select('*')
          .eq('quote_id', quoteData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (jobs) {
          setScheduledJob(jobs)
        }
      }

      // Fetch business/provider info
      if (quoteData.provider_id) {
        const { data: provider } = await supabase
          .from('movers_providers')
          .select('business_id, businesses!movers_providers_business_id_fkey(id, name, city, state)')
          .eq('id', quoteData.provider_id)
          .single()

        if (provider?.businesses) {
          // Handle both single object and array responses
          const businessData = Array.isArray(provider.businesses) 
            ? provider.businesses[0] 
            : provider.businesses
          if (businessData) {
            setBusiness(businessData as Business)
          }
        }
      }

    } catch (err) {
      console.error('Error loading quote:', err)
      setError('Failed to load quote details')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading quote...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !quote) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Link href="/dashboard/bookings">
                <Button>Back to Bookings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quote & Receipt</h1>
            <p className="text-muted-foreground">Quote ID: {quoteId}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Download className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Link href="/dashboard/bookings">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Quote Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Quote Details</CardTitle>
              <Badge className={getStatusColor(quote.status)}>
                {quote.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quote Amount */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center border-2 border-blue-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <span className="text-sm text-gray-600">Total Amount</span>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                ${((quote.price_total_cents || 0) / 100).toFixed(2)}
              </p>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer Name</p>
                    <p className="text-sm text-gray-600">{quote.full_name || 'N/A'}</p>
                  </div>
                </div>
                
                {quote.email && (
                  <div className="flex items-start space-x-2">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-600">{quote.email}</p>
                    </div>
                  </div>
                )}
                
                {quote.phone && (
                  <div className="flex items-start space-x-2">
                    <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-sm text-gray-600">{quote.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="space-y-3">
                {business && (
                  <>
                    <div className="flex items-start space-x-2">
                    <Building className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Moving Company</p>
                      <p className="text-sm text-gray-600">{business.name}</p>
                      {business.city && business.state && (
                        <p className="text-xs text-gray-500">{business.city}, {business.state}</p>
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              {quote.pickup_address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pickup Address</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.pickup_address}</p>
                  </div>
                </div>
              )}
              
              {quote.dropoff_address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.dropoff_address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Move Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
              {quote.move_date && (
                <div className="flex items-start space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Move Date</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(quote.move_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}

              {scheduledJob && scheduledJob.time_slot && (
                <div className="flex items-start space-x-2">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Time Slot</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {scheduledJob.time_slot.replace('_', ' ')}
                    </p>
                    {scheduledJob.scheduled_start_time && scheduledJob.scheduled_end_time && (
                      <p className="text-xs text-gray-500">
                        {scheduledJob.scheduled_start_time} - {scheduledJob.scheduled_end_time}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {quote.crew_size && (
                <div className="flex items-start space-x-2">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Crew Size</p>
                    <p className="text-sm text-gray-600">{quote.crew_size} movers</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quote Metadata */}
            <div className="pt-4 border-t text-sm text-gray-500 space-y-1">
              <div className="flex items-center justify-between">
                <p>Quote created on {format(new Date(quote.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  ID: {quoteId.slice(0, 8)}...
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

