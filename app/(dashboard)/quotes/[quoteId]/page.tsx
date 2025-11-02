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
  breakdown?: any // JSONB breakdown with stairs, heavy_items, packing, destination_fee, double_drive_time, trip_distances, etc.
  distance_miles?: number | null // Trip distance in miles
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

      // Fetch movers quote - CRITICAL: Include breakdown JSONB field and distance_miles column
      const { data: quoteData, error: quoteError } = await supabase
        .from('movers_quotes')
        .select('*, breakdown, distance_miles') // Explicitly include breakdown and distance_miles
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

            {/* Service Details Breakdown */}
            {quote.breakdown && typeof quote.breakdown === 'object' && Object.keys(quote.breakdown).length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stairs */}
                  {(quote.breakdown.stairs_flights !== undefined && quote.breakdown.stairs_flights > 0) || quote.breakdown.stairs === true ? (
                    <div className="flex items-start space-x-2">
                      <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Stairs</p>
                        <p className="text-sm text-gray-600">
                          {quote.breakdown.stairs_flights > 0 
                            ? `${quote.breakdown.stairs_flights} flight${quote.breakdown.stairs_flights !== 1 ? 's' : ''}`
                            : 'Yes - Details available'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Heavy Items */}
                  {quote.breakdown.heavy_items && (
                    Array.isArray(quote.breakdown.heavy_items) && quote.breakdown.heavy_items.length > 0 ? (
                      <div className="flex items-start space-x-2">
                        <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Heavy Items</p>
                          <p className="text-sm text-gray-600">
                            {quote.breakdown.heavy_items_count || quote.breakdown.heavy_items.length} item{quote.breakdown.heavy_items_count !== 1 || quote.breakdown.heavy_items.length !== 1 ? 's' : ''}
                          </p>
                          {quote.breakdown.heavy_item_band && quote.breakdown.heavy_item_band !== 'none' && (
                            <p className="text-xs text-gray-500">Weight band: {quote.breakdown.heavy_item_band}</p>
                          )}
                        </div>
                      </div>
                    ) : quote.breakdown.heavy_items_count > 0 ? (
                      <div className="flex items-start space-x-2">
                        <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Heavy Items</p>
                          <p className="text-sm text-gray-600">
                            {quote.breakdown.heavy_items_count} item{quote.breakdown.heavy_items_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ) : null
                  )}

                  {/* Packing */}
                  {quote.breakdown.packing_help && quote.breakdown.packing_help !== 'none' ? (
                    <div className="flex items-start space-x-2">
                      <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Packing Help</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {quote.breakdown.packing_help}
                          {quote.breakdown.packing_rooms > 0 && ` - ${quote.breakdown.packing_rooms} room${quote.breakdown.packing_rooms !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Trip Distance & Mileage */}
                {(quote.distance_miles || quote.breakdown?.trip_distance_miles || quote.breakdown?.mileage || quote.breakdown?.trip_distances?.distance) && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Trip Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Distance</span>
                        <span className="font-medium text-gray-900">
                          {typeof (quote.distance_miles || quote.breakdown?.trip_distance_miles || quote.breakdown?.mileage || quote.breakdown?.trip_distances?.distance) === 'number'
                            ? `${(quote.distance_miles || quote.breakdown?.trip_distance_miles || quote.breakdown?.mileage || quote.breakdown?.trip_distances?.distance).toFixed(1)} miles`
                            : `${quote.distance_miles || quote.breakdown?.trip_distance_miles || quote.breakdown?.mileage || quote.breakdown?.trip_distances?.distance} miles`}
                          {quote.breakdown?.trip_distance_duration || quote.breakdown?.trip_distances?.duration ? (
                            <span className="ml-2 text-gray-500">
                              ({Math.round(quote.breakdown?.trip_distance_duration || quote.breakdown?.trip_distances?.duration || 0)} min)
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Destination Fee & Double Drive Time */}
                {(quote.breakdown?.destination_fee || quote.breakdown?.destination_fee_cents || quote.breakdown?.double_drive_time) && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Fees & Services</h4>
                    <div className="space-y-2 text-sm">
                      {(quote.breakdown?.destination_fee || quote.breakdown?.destination_fee_cents) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Destination Fee</span>
                          <span className="font-medium text-gray-900">
                            {quote.breakdown?.destination_fee_cents
                              ? `$${((quote.breakdown.destination_fee_cents || 0) / 100).toFixed(2)}`
                              : quote.breakdown?.destination_fee
                                ? `$${parseFloat(quote.breakdown.destination_fee).toFixed(2)}`
                                : 'N/A'}
                          </span>
                        </div>
                      )}
                      {quote.breakdown?.double_drive_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Double Drive Time</span>
                          <span className="font-medium text-gray-900">Yes</span>
                        </div>
                      )}
                    </div>
                    {quote.breakdown?.double_drive_time && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>What's Double Drive Time?</strong> If the distance between your pick up and drop-off locations is more than 10 miles, drive time is doubled per standard moving industry practice. For example, if it takes 30 minutes to drive from pick up to drop off, we record 1 hour of drive time.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                {quote.breakdown && typeof quote.breakdown === 'object' && Object.keys(quote.breakdown).length > 0 ? (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Price Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      {/* Helper function to normalize values (handle both cents and dollars) */}
                      {(() => {
                        // CRITICAL: All breakdown values from quoteCalculator are in DOLLARS (not cents)
                        // Only price_total_cents in the database is in cents
                        const normalizeValue = (value: any): number => {
                          if (value === null || value === undefined) return 0
                          const numValue = typeof value === 'string' ? parseFloat(value) : value
                          if (isNaN(numValue)) return 0
                          
                          // CRITICAL: Breakdown values are stored in DOLLARS in the JSON
                          // The only exception is if we explicitly have _cents suffix (like destination_fee_cents)
                          // Values > 10000 are likely in cents, values < 10000 are likely in dollars
                          // But since quoteCalculator stores everything in dollars, assume dollars unless > 10000
                          if (numValue > 10000) {
                            // Very large number, likely in cents (e.g., 83800 cents = $838)
                            return numValue / 100
                          }
                          // Otherwise assume it's already in dollars
                          return numValue
                        }
                        
                        // Base Hourly - this is the main base price
                        // CRITICAL: breakdown has base_hourly (from price.breakdown) or basePrice (from separate breakdown)
                        // Check both camelCase and snake_case variants
                        const baseHourly = quote.breakdown?.base_hourly || quote.breakdown?.baseHourly || quote.breakdown?.basePrice || 0
                        const baseHourlyNormalized = normalizeValue(baseHourly)

                        // Destination Fee - can be stored as string "$61" or number 61 (dollars) or 6100 (cents)
                        const destinationFeeCents = quote.breakdown?.destination_fee_cents
                        const destinationFee = quote.breakdown?.destination_fee
                        let destinationFeeNormalized = 0
                        
                        if (destinationFeeCents !== undefined && destinationFeeCents !== null) {
                          // Explicitly in cents, convert to dollars
                          destinationFeeNormalized = typeof destinationFeeCents === 'number' && destinationFeeCents > 1000 
                            ? destinationFeeCents / 100 
                            : destinationFeeCents
                        } else if (destinationFee !== undefined && destinationFee !== null) {
                          // Could be string "$61" or number 61 (dollars)
                          if (typeof destinationFee === 'string') {
                            destinationFeeNormalized = parseFloat(destinationFee.replace(/[$,]/g, '')) || 0
                          } else {
                            // If > 1000, likely in cents, otherwise dollars
                            destinationFeeNormalized = destinationFee > 1000 ? destinationFee / 100 : destinationFee
                          }
                        }

                        // Packing - check both camelCase and snake_case variants
                        const packing = quote.breakdown?.packing || quote.breakdown?.packingCost || quote.breakdown?.packing_cost || 0
                        const packingNormalized = normalizeValue(packing)

                        // Stairs - check both camelCase and snake_case variants
                        const stairs = quote.breakdown?.stairs || quote.breakdown?.stairsCost || quote.breakdown?.stairs_cost || 0
                        const stairsNormalized = normalizeValue(stairs)

                        // Heavy Items - handle array or single value
                        // CRITICAL: Check if heavy items exist even if cost is 0
                        // Also check if heavy_items exists as a number (total cost)
                        const hasHeavyItems = (
                          (Array.isArray(quote.breakdown?.heavy_items) && quote.breakdown.heavy_items.length > 0) ||
                          (quote.breakdown?.heavy_items_count && quote.breakdown.heavy_items_count > 0) ||
                          (typeof quote.breakdown?.heavy_items === 'number' && quote.breakdown.heavy_items !== 0) ||
                          (quote.breakdown?.heavyItemsCost !== undefined && quote.breakdown?.heavyItemsCost !== null && quote.breakdown?.heavyItemsCost !== 0) ||
                          (quote.breakdown?.heavy_items_cost !== undefined && quote.breakdown?.heavy_items_cost !== null && quote.breakdown?.heavy_items_cost !== 0) ||
                          (quote.breakdown?.heavy_items_cost_cents !== undefined && quote.breakdown?.heavy_items_cost_cents !== null && quote.breakdown?.heavy_items_cost_cents !== 0)
                        )
                        
                        // CRITICAL: Read heavy_items from breakdown - quoteCalculator stores it as heavy_items: <number>
                        // The breakdown from quoteCalculator has: { base_hourly: 690, packing: 297, stairs: 108, heavy_items: 450, ... }
                        let heavyItemsNormalized = 0
                        
                        // Check ALL possible locations for heavy items cost
                        // Priority order: heavy_items_cost > heavyItemsCost > heavy_items (number) > heavyItems > heavy_items (array)
                        
                        if (quote.breakdown) {
                          // Method 1: heavy_items_cost (explicitly saved in SQL)
                          if (quote.breakdown.heavy_items_cost != null) {
                            heavyItemsNormalized = normalizeValue(quote.breakdown.heavy_items_cost)
                            if (heavyItemsNormalized > 0) {
                              console.log('[Quote Breakdown] Heavy Items from heavy_items_cost:', heavyItemsNormalized)
                            }
                          }
                          // Method 2: heavyItemsCost (camelCase)
                          if (heavyItemsNormalized === 0 && quote.breakdown.heavyItemsCost != null) {
                            heavyItemsNormalized = normalizeValue(quote.breakdown.heavyItemsCost)
                            if (heavyItemsNormalized > 0) {
                              console.log('[Quote Breakdown] Heavy Items from heavyItemsCost:', heavyItemsNormalized)
                            }
                          }
                          // Method 3: heavy_items as number (FROM QUOTECALCULATOR - THIS IS THE KEY!)
                          // CRITICAL: quoteCalculator now returns breakdown with heavy_items: <number>
                          if (heavyItemsNormalized === 0 && quote.breakdown.heavy_items != null) {
                            const heavyItemsValue = quote.breakdown.heavy_items
                            if (typeof heavyItemsValue === 'number' && heavyItemsValue > 0) {
                              heavyItemsNormalized = normalizeValue(heavyItemsValue)
                              console.log('[Quote Breakdown] ✅ Heavy Items from heavy_items (number):', heavyItemsValue, '→', heavyItemsNormalized)
                            } else if (typeof heavyItemsValue === 'string') {
                              const parsed = parseFloat(heavyItemsValue)
                              if (!isNaN(parsed) && parsed > 0) {
                                heavyItemsNormalized = normalizeValue(parsed)
                                console.log('[Quote Breakdown] ✅ Heavy Items from heavy_items (string):', parsed, '→', heavyItemsNormalized)
                              }
                            } else if (Array.isArray(heavyItemsValue) && heavyItemsValue.length > 0) {
                              heavyItemsNormalized = heavyItemsValue.reduce((sum: number, item: any) => {
                                if (item && typeof item === 'object') {
                                  const priceCents = item.price_cents || 0
                                  const count = item.count || 1
                                  return sum + ((priceCents * count) / 100)
                                }
                                return sum
                              }, 0)
                              console.log('[Quote Breakdown] ✅ Heavy Items from heavy_items (array):', heavyItemsNormalized)
                            }
                          }
                          // Method 4: heavyItems (camelCase variant)
                          if (heavyItemsNormalized === 0 && quote.breakdown.heavyItems != null) {
                            const heavyItemsValue = quote.breakdown.heavyItems
                            if (typeof heavyItemsValue === 'number' && heavyItemsValue > 0) {
                              heavyItemsNormalized = normalizeValue(heavyItemsValue)
                              console.log('[Quote Breakdown] ✅ Heavy Items from heavyItems (number):', heavyItemsNormalized)
                            } else if (typeof heavyItemsValue === 'string') {
                              const parsed = parseFloat(heavyItemsValue)
                              if (!isNaN(parsed) && parsed > 0) {
                                heavyItemsNormalized = normalizeValue(parsed)
                                console.log('[Quote Breakdown] ✅ Heavy Items from heavyItems (string):', heavyItemsNormalized)
                              }
                            }
                          }
                        }
                        
                        // CRITICAL: Final check - if heavyItemsNormalized is still 0, search ALL fields in breakdown
                        if (heavyItemsNormalized === 0 && quote.breakdown && typeof quote.breakdown === 'object') {
                          console.log('[Quote Breakdown] FINAL CHECK: heavyItemsNormalized is 0, searching all fields...')
                          console.log('[Quote Breakdown] Breakdown keys:', Object.keys(quote.breakdown))
                          console.log('[Quote Breakdown] heavy_items value:', quote.breakdown.heavy_items, 'type:', typeof quote.breakdown.heavy_items)
                          
                          // Search all fields containing "heavy"
                          for (const [key, value] of Object.entries(quote.breakdown)) {
                            if (key.toLowerCase().includes('heavy')) {
                              console.log('[Quote Breakdown] Found field with "heavy":', key, '=', value, 'type:', typeof value)
                              const normalized = normalizeValue(value)
                              if (normalized > 0) {
                                heavyItemsNormalized = normalized
                                console.log('[Quote Breakdown] ✅ FOUND HEAVY ITEMS in field:', key, 'value:', normalized)
                                break
                              }
                            }
                          }
                        }
                        
                        // Debug log final result
                        console.log('[Quote Breakdown] FINAL RESULT:', {
                          heavyItemsNormalized,
                          heavy_items_in_breakdown: quote.breakdown?.heavy_items,
                          heavy_items_type: typeof quote.breakdown?.heavy_items,
                          heavy_items_cost_in_breakdown: quote.breakdown?.heavy_items_cost,
                          all_breakdown_keys: quote.breakdown ? Object.keys(quote.breakdown) : [],
                          full_breakdown_json: JSON.stringify(quote.breakdown, null, 2)
                        })

                        // Storage
                        const storage = quote.breakdown?.storage || quote.breakdown?.storageCost || 0
                        const storageNormalized = normalizeValue(storage)

                        // Insurance
                        const insurance = quote.breakdown?.insurance || quote.breakdown?.insuranceCost || 0
                        const insuranceNormalized = normalizeValue(insurance)

                        return (
                          <>
                            {baseHourlyNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base (Hourly Rate)</span>
                                <span className="font-medium text-gray-900">
                                  ${baseHourlyNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {destinationFeeNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Destination Fee</span>
                                <span className="font-medium text-gray-900">
                                  ${destinationFeeNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {packingNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Packing</span>
                                <span className="font-medium text-gray-900">
                                  ${packingNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {stairsNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Stairs</span>
                                <span className="font-medium text-gray-900">
                                  ${stairsNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {/* Heavy Items - ONLY show if found in breakdown JSON from database */}
                            {heavyItemsNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Heavy Items
                                  {quote.breakdown?.heavy_items_count > 0 && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({quote.breakdown.heavy_items_count} item{quote.breakdown.heavy_items_count !== 1 ? 's' : ''})
                                    </span>
                                  )}
                                  {quote.breakdown?.heavy_item_band && quote.breakdown.heavy_item_band !== 'none' && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      - {quote.breakdown.heavy_item_band} lbs
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium text-gray-900">
                                  ${heavyItemsNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {storageNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Storage</span>
                                <span className="font-medium text-gray-900">
                                  ${storageNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {insuranceNormalized > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Insurance</span>
                                <span className="font-medium text-gray-900">
                                  ${insuranceNormalized.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {/* Debug: Show subtotal calculation */}
                            {(() => {
                              // Calculate subtotal from all normalized values (ONLY items found in breakdown)
                              let calculatedSubtotal = 0
                              calculatedSubtotal += baseHourlyNormalized
                              calculatedSubtotal += destinationFeeNormalized
                              calculatedSubtotal += packingNormalized
                              calculatedSubtotal += stairsNormalized
                              calculatedSubtotal += heavyItemsNormalized // CRITICAL: Only use actual value from breakdown
                              calculatedSubtotal += storageNormalized
                              calculatedSubtotal += insuranceNormalized
                              
                              const actualTotal = (quote.price_total_cents || 0) / 100
                              
                              return (
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Subtotal (items shown):</span>
                                    <span>${calculatedSubtotal.toFixed(2)}</span>
                                  </div>
                                  {Math.abs(calculatedSubtotal - actualTotal) > 1 && (
                                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                      ⚠️ Subtotal doesn't match total. Missing items or calculation issue.
                                      <br />
                                      Calculated: ${calculatedSubtotal.toFixed(2)} | Actual: ${actualTotal.toFixed(2)}
                                      <br />
                                      Difference: ${Math.abs(calculatedSubtotal - actualTotal).toFixed(2)}
                                    </div>
                                  )}
                                  {/* Debug: Show raw breakdown if it exists */}
                                  <details>
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                      View Raw Breakdown JSON (for debugging)
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                                      {JSON.stringify(quote.breakdown, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )
                            })()}
                            <div className="pt-2 mt-2 border-t border-gray-200">
                              <div className="flex justify-between font-bold text-base">
                                <span className="text-gray-900">Total</span>
                                <span className="text-gray-900">
                                  ${((quote.price_total_cents || 0) / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

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

