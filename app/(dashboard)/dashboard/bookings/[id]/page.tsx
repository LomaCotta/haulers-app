'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign,
  PackageSearch,
  Clock,
  Plus,
  FileText,
  CheckCircle,
  Star,
  Loader2,
  AlertCircle,
  Edit,
  TrendingUp,
  Package,
  ShoppingBag,
  Users,
  Home,
  Truck
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface Booking {
  id: string
  business_id: string
  customer_id: string
  service_type: string
  booking_status: string
  requested_date: string
  requested_time: string
  service_address: string
  service_city: string
  service_state: string
  service_postal_code: string
  base_price_cents: number
  hourly_rate_cents: number
  additional_fees_cents: number
  total_price_cents: number
  payment_status: string
  service_details: any
  customer_notes: string
  business_notes: string
  customer_phone: string
  customer_email: string
  actual_start_time: string | null
  actual_end_time: string | null
  estimated_duration_hours: number
  created_at: string
  updated_at: string
  business?: {
    id: string
    name: string
    description: string
    phone: string
    email: string
    owner_id: string
  }
}

interface BookingItem {
  id: string
  booking_id: string
  item_name: string
  item_description: string | null
  item_category: string
  item_type: string
  unit_price_cents: number
  quantity: number
  total_price_cents: number
  created_at: string
}

export default function BookingTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isProvider, setIsProvider] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])

  // Form states for adding items
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemCategory, setItemCategory] = useState('labor')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemUnitPrice, setItemUnitPrice] = useState('')

  useEffect(() => {
    loadBooking()
  }, [id])

  const loadBooking = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          business:businesses(*)
        `)
        .eq("id", id)
        .single()

      if (bookingError) {
        console.error('Booking error:', {
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          code: bookingError.code,
          error: JSON.stringify(bookingError, null, 2)
        })
        setBooking(null)
        setLoading(false)
        return
      }

      if (!bookingData) {
        console.error('No booking data found for id:', id)
        setBooking(null)
        setLoading(false)
        return
      }

      let bookingObj = bookingData as Booking
      const userIsCustomer = bookingObj.customer_id === user.id
      const userIsProvider = bookingObj.business?.owner_id === user.id

      setIsCustomer(userIsCustomer)
      setIsProvider(userIsProvider)

      if (!userIsCustomer && !userIsProvider) {
        router.push('/dashboard/bookings')
        return
      }

      setBooking(bookingObj)

      // Debug: Log service_details to understand structure
      console.log('📦 Booking service_details:', JSON.stringify(bookingObj.service_details, null, 2))
      console.log('📦 Booking service_address:', bookingObj.service_address)
      console.log('📦 Booking service_city:', bookingObj.service_city)
      console.log('📦 Booking service_state:', bookingObj.service_state)

      // Try to fetch quote data if quote_id exists in service_details
      const quoteId = (bookingObj.service_details as any)?.quote_id || (bookingObj.service_details as any)?.quoteId
      
      // First, verify service_details completeness using database function (if available)
      try {
        const { data: verification, error: verifyError } = await supabase.rpc(
          'verify_service_details_completeness',
          { p_booking_id: id }
        )
        
        if (!verifyError && verification && !verification.valid && verification.missing_fields) {
          console.log('⚠️ Service details incomplete, missing:', verification.missing_fields)
          
          // Try to auto-enrich using database function
          const { data: enriched, error: enrichError } = await supabase.rpc(
            'enrich_booking_service_details',
            { p_booking_id: id }
          )
          
          if (!enrichError && enriched) {
            console.log('✅ Service details enriched by database function')
            // Reload booking to get updated service_details
            const { data: updatedBooking } = await supabase
              .from('bookings')
              .select('*')
              .eq('id', id)
              .single()
            
            if (updatedBooking) {
              bookingObj = updatedBooking as Booking
              setBooking(bookingObj)
            }
          }
        }
      } catch (err) {
        // Function might not exist (migration not run), continue with fallback
        console.log('Verification function not available, using fallback method')
      }
      
      // ALWAYS fetch quote breakdown - ensure we have ALL service details
      if (quoteId) {
        try {
          const currentDetails = (bookingObj.service_details || {}) as any
          
          // Check if we're missing critical data
          const hasHeavyItems = currentDetails.heavy_items?.length > 0 || currentDetails.heavy_items_count > 0
          const hasStairs = currentDetails.stairs_flights > 0 || currentDetails.stairs === true
          const hasPacking = currentDetails.packing_help && currentDetails.packing_help !== 'none' || currentDetails.packing_rooms > 0
          
          const isMissingCriticalData = !hasHeavyItems && !hasStairs && !hasPacking
          const isMissingBreakdown = !currentDetails.breakdown && isProvider
          
          // ALWAYS fetch quote to ensure we have complete data
          if (isMissingCriticalData || isMissingBreakdown || true) { // Always fetch for now
            const { data: quoteData, error: quoteError } = await supabase
              .from('movers_quotes')
              .select('*, breakdown') // CRITICAL: Explicitly include breakdown JSONB field
              .eq('id', quoteId)
              .single()

            if (!quoteError && quoteData) {
              console.log('📋 Found quote data for merge:', JSON.stringify(quoteData, null, 2))
              console.log('📋 Quote breakdown:', JSON.stringify(quoteData.breakdown, null, 2))
              
              // Merge quote data into service_details - prioritize quote data
              const quoteBreakdown = quoteData.breakdown || {}
              
              // Extract heavy items from quote breakdown - check multiple formats
              let quoteHeavyItems = []
              if (quoteBreakdown.heavy_items && Array.isArray(quoteBreakdown.heavy_items)) {
                quoteHeavyItems = quoteBreakdown.heavy_items
              } else if (quoteBreakdown.heavy_items_count > 0) {
                quoteHeavyItems = [{
                  band: quoteBreakdown.heavy_item_band || quoteBreakdown.weight_band || 'N/A',
                  count: quoteBreakdown.heavy_items_count,
                  price_cents: quoteBreakdown.heavy_item_price_cents || 0
                }]
              }
              
              // Build comprehensive merged details - merge ALL quote data
              const mergedDetails = {
                ...currentDetails,
                quote_id: quoteId,
                // Always include full breakdown for providers
                breakdown: quoteBreakdown || currentDetails.breakdown || {},
                // Merge pickup/delivery addresses if missing
                pickup_address: currentDetails.pickup_address || quoteData.pickup_address || '',
                dropoff_address: currentDetails.dropoff_address || quoteData.dropoff_address || '',
                from_address: currentDetails.from_address || quoteData.pickup_address || '',
                to_address: currentDetails.to_address || quoteData.dropoff_address || '',
                // HEAVY ITEMS - use quote data if available
                heavy_items: quoteHeavyItems.length > 0 ? quoteHeavyItems : (currentDetails.heavy_items || []),
                heavy_items_count: quoteBreakdown.heavy_items_count !== undefined ? quoteBreakdown.heavy_items_count : (currentDetails.heavy_items_count || 0),
                heavy_item_band: quoteBreakdown.heavy_item_band || quoteBreakdown.weight_band || currentDetails.heavy_item_band || 'none',
                // STAIRS - use quote data if available
                stairs_flights: quoteBreakdown.stairs_flights !== undefined ? quoteBreakdown.stairs_flights : (currentDetails.stairs_flights || 0),
                stairs: quoteBreakdown.stairs_flights > 0 || quoteBreakdown.stairs === true || currentDetails.stairs === true,
                // PACKING - use quote data if available
                packing_help: quoteBreakdown.packing_help || quoteBreakdown.packing || currentDetails.packing_help || 'none',
                packing_rooms: quoteBreakdown.packing_rooms !== undefined ? quoteBreakdown.packing_rooms : (currentDetails.packing_rooms || 0),
                packing_materials: quoteBreakdown.packing_materials || currentDetails.packing_materials || [],
                packing: quoteBreakdown.packing || currentDetails.packing || {},
                // Other fields
                move_size: quoteBreakdown.move_size || currentDetails.move_size || quoteData.move_size || 'unknown',
                mover_team: quoteBreakdown.mover_team || quoteData.crew_size || currentDetails.mover_team || currentDetails.crew_size || 2,
                crew_size: quoteData.crew_size || quoteBreakdown.mover_team || currentDetails.crew_size || currentDetails.mover_team || 2,
                hourly_rate: quoteBreakdown.hourly_rate || currentDetails.hourly_rate || null,
                hourly_rate_cents: quoteBreakdown.hourly_rate_cents || (quoteBreakdown.hourly_rate ? Math.round(quoteBreakdown.hourly_rate * 100) : null) || currentDetails.hourly_rate_cents,
                storage: quoteBreakdown.storage || currentDetails.storage || 'none',
                ins_coverage: quoteBreakdown.ins_coverage || currentDetails.ins_coverage || 'basic',
                time_slot: currentDetails.time_slot || quoteBreakdown.time_slot || 'morning',
              }
              
              console.log('✅ Merged service_details with quote data:', JSON.stringify(mergedDetails, null, 2))
              
              // Update booking object with merged details (client-side only, database already has it)
              bookingObj.service_details = mergedDetails as any
              setBooking({ ...bookingObj })
            } else if (quoteError) {
              console.error('❌ Error fetching quote:', quoteError)
            }
          }
        } catch (err) {
          console.error('Error fetching quote:', err)
        }
      }

      // Load booking items
      const { data: items, error: itemsError } = await supabase
        .from('booking_items')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false })

      if (!itemsError && items) {
        setBookingItems(items as BookingItem[])
      }

      // Load invoices for this booking
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false })

      if (!invoicesError && invoicesData) {
        setInvoices(invoicesData)
      }

      // Check if payment is complete and should show review prompt
      if (bookingObj.payment_status === 'paid' && bookingObj.customer_id === user.id) {
        // Check if review already exists
        const { data: review } = await supabase
          .from('reviews')
          .select('id')
          .eq('booking_id', id)
          .single()

        if (!review) {
          setShowReviewDialog(true)
        }
      }
    } catch (error) {
      console.error('Error loading booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!itemName.trim() || !itemUnitPrice.trim()) {
      return
    }

    setAddingItem(true)
    try {
      const supabase = createClient()
      const unitPriceCents = Math.round(parseFloat(itemUnitPrice) * 100)
      const totalPriceCents = unitPriceCents * itemQuantity

      const { data: newItem, error } = await supabase
        .from('booking_items')
        .insert({
          booking_id: id,
          item_name: itemName.trim(),
          item_description: itemDescription.trim() || null,
          item_category: itemCategory,
          item_type: itemCategory,
          unit_price_cents: unitPriceCents,
          quantity: itemQuantity,
          total_price_cents: totalPriceCents
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding item:', error)
        alert('Failed to add item. Please try again.')
        return
      }

      // Update booking total
      const newAdditionalFees = (booking?.additional_fees_cents || 0) + totalPriceCents
      const newTotal = (booking?.base_price_cents || 0) + 
                      ((booking?.hourly_rate_cents || 0) * (booking?.estimated_duration_hours || 1)) + 
                      newAdditionalFees

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          additional_fees_cents: newAdditionalFees,
          total_price_cents: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating booking:', updateError)
      }

      // Refresh data
      await loadBooking()

      // Reset form
      setItemName('')
      setItemDescription('')
      setItemCategory('labor')
      setItemQuantity(1)
      setItemUnitPrice('')
      setShowAddItemDialog(false)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item. Please try again.')
    } finally {
      setAddingItem(false)
    }
  }


  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculateSubtotal = () => {
    return (booking?.base_price_cents || 0) + 
           ((booking?.hourly_rate_cents || 0) * (booking?.estimated_duration_hours || 1))
  }

  const calculateTotal = () => {
    return calculateSubtotal() + (booking?.additional_fees_cents || 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "confirmed": return "bg-green-100 text-green-800 border-green-200"
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200"
      case "cancelled": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-emerald-600 text-white"
      case "partial": return "bg-blue-600 text-white"
      case "pending": return "bg-yellow-600 text-white"
      case "refunded": return "bg-purple-600 text-white"
      case "disputed": return "bg-red-600 text-white"
      default: return "bg-gray-600 text-white"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="border-2 border-red-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This booking could not be found or you don't have access to it.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                The booking ID might be invalid, or you may not have permission to view this booking.
              </p>
              <Button 
                onClick={() => router.push('/dashboard/bookings')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Back to Bookings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Order #{booking.id.slice(0, 8)}
              </h1>
              <p className="text-muted-foreground mt-2">
                Created {format(new Date(booking.created_at), "PPP")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Badge className={`px-4 py-1.5 text-sm font-semibold uppercase tracking-wide border ${getStatusColor(booking.booking_status)}`}>
                {booking.booking_status.replace("_", " ")}
              </Badge>
              <Badge className={`px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${getPaymentStatusColor(booking.payment_status)}`}>
                {booking.payment_status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tracking Timeline */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageSearch className="w-5 h-5" />
                  Order Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                      booking.created_at ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Order Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.created_at), "PPp")}
                      </p>
                    </div>
                  </div>

                  {booking.booking_status === 'confirmed' && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5 bg-green-500" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Order Confirmed</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.business?.name} has confirmed your order
                        </p>
                      </div>
                    </div>
                  )}

                  {booking.booking_status === 'in_progress' && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5 bg-blue-500" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Service In Progress</p>
                        {booking.actual_start_time && (
                          <p className="text-sm text-muted-foreground">
                            Started: {format(new Date(booking.actual_start_time), "PPp")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {booking.payment_status === 'paid' && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5 bg-emerald-500" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Payment Received</p>
                        <p className="text-sm text-muted-foreground">Invoice has been paid</p>
                      </div>
                    </div>
                  )}

                  {booking.booking_status === 'completed' && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5 bg-gray-900" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Order Completed</p>
                        {booking.actual_end_time && (
                          <p className="text-sm text-muted-foreground">
                            Completed: {format(new Date(booking.actual_end_time), "PPp")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const serviceDetails = booking.service_details || {}
                  
                  // Debug log
                  console.log('🔍 Parsing serviceDetails:', serviceDetails)
                  
                  // Extract quote ID for organization
                  const quoteId = serviceDetails.quote_id || serviceDetails.quoteId || null
                  
                  // Handle pickup addresses - multiple formats
                  let pickupAddresses: any[] = []
                  if (serviceDetails.pickup_addresses && Array.isArray(serviceDetails.pickup_addresses)) {
                    pickupAddresses = serviceDetails.pickup_addresses
                  } else if (serviceDetails.from_address) {
                    // Single pickup address
                    const fromAddr = typeof serviceDetails.from_address === 'string' 
                      ? serviceDetails.from_address 
                      : (serviceDetails.from_address?.address || serviceDetails.from_address?.street || '')
                    pickupAddresses = [{
                      address: fromAddr,
                      aptSuite: serviceDetails.from_address?.aptSuite || serviceDetails.from_apt || '',
                      city: serviceDetails.from_city || booking.service_city || '',
                      state: serviceDetails.from_state || booking.service_state || '',
                      zip: serviceDetails.from_zip || booking.service_postal_code || ''
                    }]
                  } else if (booking.service_address) {
                    // Fallback to service_address if no pickup address in details
                    pickupAddresses = [{
                      address: booking.service_address,
                      city: booking.service_city || '',
                      state: booking.service_state || '',
                      zip: booking.service_postal_code || ''
                    }]
                  }
                  
                  // Handle delivery addresses - multiple formats
                  let deliveryAddresses: any[] = []
                  if (serviceDetails.delivery_addresses && Array.isArray(serviceDetails.delivery_addresses)) {
                    deliveryAddresses = serviceDetails.delivery_addresses
                  } else if (serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address) {
                    const toAddr = serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address
                    const addrStr = typeof toAddr === 'string' ? toAddr : (toAddr?.address || toAddr?.street || '')
                    deliveryAddresses = [{
                      address: addrStr,
                      aptSuite: serviceDetails.to_address?.aptSuite || serviceDetails.to_apt || '',
                      city: serviceDetails.to_city || serviceDetails.dropoff_city || '',
                      state: serviceDetails.to_state || serviceDetails.dropoff_state || '',
                      zip: serviceDetails.to_zip || serviceDetails.dropoff_zip || ''
                    }]
                  }
                  
                  // Fallback addresses for display
                  const fromAddress = serviceDetails.from_address || serviceDetails.pickup_address || 
                                    (pickupAddresses.length > 0 ? 
                                      `${pickupAddresses[0].address || pickupAddresses[0].street || ''}, ${pickupAddresses[0].city || ''}, ${pickupAddresses[0].state || ''}` 
                                      : booking.service_address)
                  const toAddress = serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address ||
                                  (deliveryAddresses.length > 0 ? 
                                    `${deliveryAddresses[0].address || deliveryAddresses[0].street || ''}, ${deliveryAddresses[0].city || ''}, ${deliveryAddresses[0].state || ''}` 
                                    : '')
                  
                  // Extract heavy items - handle different formats and check breakdown
                  const breakdown = serviceDetails.breakdown || {}
                  let heavyItems: any[] = []
                  
                  // Helper function to normalize heavy items to array format
                  const normalizeHeavyItems = (items: any): any[] => {
                    if (!items) return []
                    
                    // If it's already an array, filter valid items
                    if (Array.isArray(items)) {
                      return items
                        .filter((item: any) => item && typeof item === 'object' && (item.count > 0 || item.band || item.weight_band))
                        .map((item: any) => ({
                          band: item.band || item.weight_band || 'N/A',
                          count: item.count || 0,
                          price_cents: item.price_cents || item.price || 0
                        }))
                    }
                    
                    // If it's a single object, wrap it in an array
                    if (typeof items === 'object' && (items.count > 0 || items.band || items.weight_band)) {
                      return [{
                        band: items.band || items.weight_band || 'N/A',
                        count: items.count || 0,
                        price_cents: items.price_cents || items.price || 0
                      }]
                    }
                    
                    return []
                  }
                  
                  // Check service_details first
                  if (serviceDetails.heavy_items) {
                    heavyItems = normalizeHeavyItems(serviceDetails.heavy_items)
                  }
                  
                  // Fallback: create from count and band if available
                  if (heavyItems.length === 0 && serviceDetails.heavy_items_count > 0 && serviceDetails.heavy_item_band) {
                    heavyItems = [{
                      band: serviceDetails.heavy_item_band,
                      count: serviceDetails.heavy_items_count,
                      price_cents: serviceDetails.heavy_item_price_cents || 0
                    }]
                  }
                  
                  // Check breakdown if service_details doesn't have it
                  if (heavyItems.length === 0 && breakdown.heavy_items) {
                    heavyItems = normalizeHeavyItems(breakdown.heavy_items)
                  }
                  
                  // Final fallback: create from breakdown count and band
                  if (heavyItems.length === 0 && breakdown.heavy_items_count > 0) {
                    heavyItems = [{
                      band: breakdown.heavy_item_band || breakdown.weight_band || 'N/A',
                      count: breakdown.heavy_items_count,
                      price_cents: breakdown.heavy_item_price_cents || 0
                    }]
                  }
                  
                  // CRITICAL: Ensure heavyItems is always an array
                  if (!Array.isArray(heavyItems)) {
                    console.warn('heavyItems is not an array, converting:', heavyItems)
                    heavyItems = heavyItems ? [heavyItems] : []
                  }
                  
                  // Extract stairs - check both service_details and breakdown
                  let stairsFlights = serviceDetails.stairs_flights !== undefined ? serviceDetails.stairs_flights : 
                                    breakdown.stairs_flights !== undefined ? breakdown.stairs_flights : 
                                    (serviceDetails.stairs === true ? 1 : 0)
                  const hasStairs = stairsFlights > 0 || serviceDetails.stairs === true || breakdown.stairs === true
                  
                  // Extract packing info - check both service_details and breakdown
                  const packingHelp = serviceDetails.packing_help || breakdown.packing_help || serviceDetails.packing || breakdown.packing || 'none'
                  const packingRooms = serviceDetails.packing_rooms !== undefined ? serviceDetails.packing_rooms : 
                                     breakdown.packing_rooms !== undefined ? breakdown.packing_rooms : 0
                  const packingMaterials = serviceDetails.packing_materials || breakdown.packing_materials || []
                  
                  console.log('📊 Extracted service details:', {
                    heavyItems,
                    stairsFlights,
                    hasStairs,
                    packingHelp,
                    packingRooms,
                    packingMaterials,
                    breakdown: Object.keys(breakdown)
                  })

                  return (
                    <>
                      {/* Quote ID Header - Organize everything under quote */}
                      {quoteId && (
                        <div className="pb-4 border-b-2 border-gray-300 mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quote ID:</span>
                            <span className="text-sm font-mono font-medium text-gray-900">{quoteId}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Basic Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-900">Scheduled Date</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.requested_date), "PPP")} at {booking.requested_time}
                            </p>
                          </div>
                        </div>
                        
                        {(serviceDetails.mover_team || serviceDetails.crew_size) && (
                          <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900">Team Size</p>
                              <p className="text-sm text-muted-foreground">
                                {serviceDetails.mover_team || serviceDetails.crew_size} {(serviceDetails.mover_team || serviceDetails.crew_size) === 1 ? 'mover' : 'movers'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pickup Address(es) */}
                      {(pickupAddresses.length > 0 || fromAddress) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Truck className="w-4 h-4 text-gray-500" />
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Pickup Address{pickupAddresses.length > 1 ? 'es' : ''}
                            </h5>
                          </div>
                          <div className="pl-6 space-y-3">
                            {pickupAddresses.length > 0 ? (
                              pickupAddresses.map((addr: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                  {pickupAddresses.length > 1 && (
                                    <p className="text-base font-medium text-gray-900 mb-1">
                                      {idx === 0 ? 'Primary' : `Location ${idx + 1}:`}
                                    </p>
                                  )}
                                  <p className="text-base text-gray-900 leading-relaxed break-words">
                                    {addr.address || addr.street || addr}
                                    {addr.aptSuite && `, ${addr.aptSuite}`}
                                    {addr.apt_suite && `, ${addr.apt_suite}`}
                                    {(addr.city || addr.city_name) && `, ${addr.city || addr.city_name}`}
                                    {(addr.state || addr.state_name) && `, ${addr.state || addr.state_name}`}
                                    {(addr.zip || addr.zip_code || addr.postal_code) && ` ${addr.zip || addr.zip_code || addr.postal_code}`}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-base text-gray-900 leading-relaxed break-words">{fromAddress}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delivery Address(es) */}
                      {(deliveryAddresses.length > 0 || toAddress) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Home className="w-4 h-4 text-gray-500" />
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Delivery Address{deliveryAddresses.length > 1 ? 'es' : ''}
                            </h5>
                          </div>
                          <div className="pl-6 space-y-3">
                            {deliveryAddresses.length > 0 ? (
                              deliveryAddresses.map((addr: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                  {deliveryAddresses.length > 1 && (
                                    <p className="text-base font-medium text-gray-900 mb-1">
                                      {idx === 0 ? 'Primary' : `Location ${idx + 1}:`}
                                    </p>
                                  )}
                                  <p className="text-base text-gray-900 leading-relaxed break-words">
                                    {addr.address || addr.street || addr}
                                    {addr.aptSuite && `, ${addr.aptSuite}`}
                                    {addr.apt_suite && `, ${addr.apt_suite}`}
                                    {(addr.city || addr.city_name) && `, ${addr.city || addr.city_name}`}
                                    {(addr.state || addr.state_name) && `, ${addr.state || addr.state_name}`}
                                    {(addr.zip || addr.zip_code || addr.postal_code) && ` ${addr.zip || addr.zip_code || addr.postal_code}`}
                                  </p>
                                </div>
                              ))
                            ) : toAddress ? (
                              <p className="text-base text-gray-900 leading-relaxed break-words">{toAddress}</p>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Trip Distance / Mileage */}
                      {(serviceDetails.trip_distance_miles || serviceDetails.mileage || serviceDetails.trip_distances?.distance) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">Trip Distance</p>
                              <p className="text-sm text-muted-foreground">
                                {typeof (serviceDetails.trip_distance_miles || serviceDetails.mileage || serviceDetails.trip_distances?.distance) === 'number'
                                  ? `${(serviceDetails.trip_distance_miles || serviceDetails.mileage || serviceDetails.trip_distances?.distance).toFixed(1)} miles`
                                  : `${serviceDetails.trip_distance_miles || serviceDetails.mileage || serviceDetails.trip_distances?.distance} miles`}
                                {serviceDetails.trip_distance_duration && serviceDetails.trip_distances?.duration && (
                                  <span className="ml-2 text-gray-500">
                                    ({Math.round(serviceDetails.trip_distance_duration || serviceDetails.trip_distances?.duration || 0)} min)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Destination Fee */}
                      {(serviceDetails.destination_fee || serviceDetails.destination_fee_cents) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-3">
                            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">Destination Fee</p>
                              <p className="text-sm text-muted-foreground">
                                {serviceDetails.destination_fee_cents
                                  ? formatPrice(serviceDetails.destination_fee_cents)
                                  : serviceDetails.destination_fee
                                    ? `$${parseFloat(serviceDetails.destination_fee).toFixed(2)}`
                                    : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Double Drive Time */}
                      {serviceDetails.double_drive_time && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">Double Drive Time</p>
                              <p className="text-sm text-muted-foreground">Yes</p>
                              <p className="text-xs text-gray-500 mt-1 italic">
                                The distance between pickup and drop-off locations exceeds 10 miles, so drive time is doubled per standard moving industry practice.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Service Options Grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-200 mb-6">
                        {/* Move Size */}
                        {serviceDetails.move_size && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Home className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Move Size</span>
                            </div>
                            <p className="text-base font-medium text-gray-900 pl-5 capitalize">
                              {String(serviceDetails.move_size).replace('_', ' ')}
                            </p>
                          </div>
                        )}

                        {/* Time Slot */}
                        {serviceDetails.time_slot && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Time Slot</span>
                            </div>
                            <p className="text-base font-medium text-gray-900 pl-5 capitalize">
                              {String(serviceDetails.time_slot).replace('_', ' ')}
                            </p>
                          </div>
                        )}

                        {/* Hourly Rate */}
                        {booking.hourly_rate_cents > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hourly Rate</span>
                            </div>
                            <p className="text-base font-medium text-gray-900 pl-5">
                              {formatPrice(booking.hourly_rate_cents)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* STAIRS SECTION - ALWAYS SHOW */}
                      <div className="pt-4 border-t-2 border-gray-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-5 h-5 text-gray-600" />
                          <h5 className="text-sm font-bold uppercase tracking-wide text-gray-900">Stairs</h5>
                        </div>
                        <div className="pl-7">
                          {hasStairs || stairsFlights > 0 ? (
                            <p className="text-base font-semibold text-gray-900">
                              {stairsFlights > 0 
                                ? `${stairsFlights} flight${stairsFlights !== 1 ? 's' : ''}` 
                                : 'Yes - Details available'}
                            </p>
                          ) : (
                            <p className="text-base text-gray-500 italic">No stairs</p>
                          )}
                        </div>
                      </div>

                      {/* PACKING SECTION - ALWAYS SHOW */}
                      <div className="pt-4 border-t-2 border-gray-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="w-5 h-5 text-gray-600" />
                          <h5 className="text-sm font-bold uppercase tracking-wide text-gray-900">Packing</h5>
                        </div>
                        <div className="pl-7 space-y-2">
                          {(packingHelp && packingHelp !== 'none') || packingRooms > 0 || (packingMaterials && packingMaterials.length > 0) ? (
                            <>
                              {packingHelp && packingHelp !== 'none' && (
                                <p className="text-base font-semibold text-gray-900 capitalize mb-1">
                                  Type: {String(packingHelp).replace('_', ' ')}
                                </p>
                              )}
                              {packingRooms > 0 && (
                                <p className="text-base text-gray-700">
                                  {packingRooms} room{packingRooms !== 1 ? 's' : ''} to pack
                                </p>
                              )}
                              {packingMaterials && Array.isArray(packingMaterials) && packingMaterials.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Materials Included</p>
                                  <ul className="space-y-1.5">
                                    {packingMaterials.map((item: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {item.name || item} {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-base text-gray-500 italic">No packing requested</p>
                          )}
                        </div>
                      </div>

                      {/* HEAVY ITEMS SECTION - ALWAYS SHOW */}
                      <div className="pt-4 border-t-2 border-gray-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-5 h-5 text-gray-600" />
                          <h5 className="text-sm font-bold uppercase tracking-wide text-gray-900">Heavy Items</h5>
                        </div>
                        <div className="pl-7">
                          {Array.isArray(heavyItems) && heavyItems.length > 0 ? (
                            <ul className="space-y-2">
                              {heavyItems
                                .filter((item: any) => item && typeof item === 'object') // CRITICAL: Only render valid objects
                                .map((item: any, idx: number) => {
                                  // Ensure we extract values safely
                                  const band = item?.band || item?.weight_band || 'N/A'
                                  const count = item?.count || 0
                                  
                                  return (
                                    <li key={idx} className="text-base font-semibold text-gray-900">
                                      • Weight range: <span className="font-bold">{String(band)}</span> lbs 
                                      ({count} {count === 1 ? 'item' : 'items'})
                                    </li>
                                  )
                                })}
                            </ul>
                          ) : serviceDetails.heavy_items_count > 0 ? (
                            <p className="text-base font-semibold text-gray-900">
                              Weight range: <span className="font-bold">{serviceDetails.heavy_item_band || 'N/A'}</span> lbs 
                              ({serviceDetails.heavy_items_count} {serviceDetails.heavy_items_count === 1 ? 'item' : 'items'})
                            </p>
                          ) : (
                            <p className="text-base text-gray-500 italic">No heavy items specified</p>
                          )}
                        </div>
                      </div>

                      {/* Storage */}
                      {serviceDetails.storage && serviceDetails.storage !== 'none' && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Storage</h5>
                          </div>
                          <p className="text-base font-medium text-gray-900 pl-6 capitalize">
                            {String(serviceDetails.storage).replace('_', ' ')}
                          </p>
                        </div>
                      )}

                      {/* Insurance - Only show if it's meaningful (not just "basic" which is $0) */}
                      {serviceDetails.ins_coverage && 
                       serviceDetails.ins_coverage !== 'none' && 
                       serviceDetails.ins_coverage !== 'basic' && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-gray-500" />
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Insurance Coverage</h5>
                          </div>
                          <p className="text-base font-medium text-gray-900 pl-6 capitalize">
                            {String(serviceDetails.ins_coverage).replace('_', ' ')}
                          </p>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Customer Notes */}
                {booking.customer_notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Customer Notes</h5>
                    <div className="pl-6 border-l-2 border-gray-300">
                      <p className="text-base text-gray-900 leading-relaxed break-words italic whitespace-pre-wrap">
                        {booking.customer_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Business Notes (Provider Only) */}
                {isProvider && booking.business_notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Internal Notes</h5>
                    <div className="pl-6 border-l-2 border-gray-300">
                      <p className="text-base text-gray-900 leading-relaxed break-words italic whitespace-pre-wrap">
                        {booking.business_notes}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Actions - Add Items & Create Invoice */}
            {isProvider && booking.booking_status !== 'completed' && booking.booking_status !== 'cancelled' && (
              <Card className="border-2 border-orange-200 bg-orange-50/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-orange-600" />
                    Manage Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Extra Hours / Items
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Add Item to Order</DialogTitle>
                          <DialogDescription>
                            Add extra hours, materials, or other charges to this order.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="itemName">Item Name *</Label>
                            <Input
                              id="itemName"
                              value={itemName}
                              onChange={(e) => setItemName(e.target.value)}
                              placeholder="e.g., Extra Hour, Packing Materials, Fuel Surcharge"
                            />
                          </div>
                          <div>
                            <Label htmlFor="itemDescription">Description</Label>
                            <Textarea
                              id="itemDescription"
                              value={itemDescription}
                              onChange={(e) => setItemDescription(e.target.value)}
                              placeholder="Optional description..."
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="itemCategory">Category</Label>
                              <select
                                id="itemCategory"
                                value={itemCategory}
                                onChange={(e) => setItemCategory(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="labor">Labor / Hours</option>
                                <option value="material">Materials</option>
                                <option value="equipment">Equipment</option>
                                <option value="service">Other Service</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="itemQuantity">Quantity</Label>
                              <Input
                                id="itemQuantity"
                                type="number"
                                min="1"
                                value={itemQuantity}
                                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="itemUnitPrice">Unit Price ($) *</Label>
                            <Input
                              id="itemUnitPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={itemUnitPrice}
                              onChange={(e) => setItemUnitPrice(e.target.value)}
                              placeholder="0.00"
                            />
                            {itemUnitPrice && itemQuantity && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Total: {formatPrice(Math.round(parseFloat(itemUnitPrice) * 100) * itemQuantity)}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAddItem} 
                              disabled={addingItem || !itemName.trim() || !itemUnitPrice.trim()}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {addingItem ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Item
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {(booking.booking_status === 'confirmed' || booking.booking_status === 'in_progress' || booking.booking_status === 'completed') && (
                      <Button 
                        variant="outline" 
                        className="border-2 border-gray-800 hover:bg-gray-900 hover:text-white"
                        onClick={() => router.push(`/dashboard/invoices/new?bookingId=${booking.id}`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Create Invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business/Customer Info */}
            {isCustomer && booking.business && (
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle>Provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.business.name}</h3>
                    {booking.business.description && (
                      <p className="text-sm text-muted-foreground mt-1">{booking.business.description}</p>
                    )}
                  </div>
                  
                  {booking.business.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${booking.business.phone}`} className="text-sm hover:underline">
                        {booking.business.phone}
                      </a>
                    </div>
                  )}
                  
                  {booking.business.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${booking.business.email}`} className="text-sm hover:underline">
                        {booking.business.email}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isProvider && (
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booking.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${booking.customer_phone}`} className="text-sm hover:underline">
                        {booking.customer_phone}
                      </a>
                    </div>
                  )}
                  
                  {booking.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${booking.customer_email}`} className="text-sm hover:underline">
                        {booking.customer_email}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice Summary */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Invoice Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Breakdown from Quote */}
                {(() => {
                  const serviceDetails = booking.service_details || {}
                  const quoteId = serviceDetails.quote_id || serviceDetails.quoteId
                  const quoteBreakdown = serviceDetails.breakdown || {}
                  
                  // CRITICAL: Extract breakdown costs - check multiple possible keys and formats
                  // Handle both number and string formats (some might be stored as strings or numbers)
                  const getBreakdownValue = (keys: string[], defaultValue = 0) => {
                    for (const key of keys) {
                      const value = quoteBreakdown[key]
                      // CRITICAL: Skip arrays and objects - they need special handling
                      if (value !== undefined && value !== null && value !== '' && value !== 0 && !Array.isArray(value) && typeof value !== 'object') {
                        // If it's already in cents, return as is
                        if (typeof value === 'number' && value > 100) {
                          return value
                        }
                        // If it's a decimal (dollars), convert to cents
                        if (typeof value === 'number' && value < 1000) {
                          return Math.round(value * 100)
                        }
                        // If it's a string with $, parse it
                        if (typeof value === 'string' && value.includes('$')) {
                          return Math.round(parseFloat(value.replace(/[$,]/g, '')) * 100)
                        }
                        // Try parsing as float
                        if (typeof value === 'string') {
                          const parsed = parseFloat(value)
                          if (!isNaN(parsed)) {
                            return parsed < 1000 ? Math.round(parsed * 100) : parsed
                          }
                        }
                      }
                    }
                    return defaultValue
                  }
                  
                  // Calculate breakdown from quote if available - check multiple key formats
                  const baseHourly = getBreakdownValue(['base_hourly', 'baseHourly', 'base_hourly_cents', 'basePrice', 'base_price_cents']) || booking.base_price_cents || 0
                  const packingCost = getBreakdownValue(['packing', 'packingCost', 'packing_cost', 'packing_cost_cents'])
                  const stairsCost = getBreakdownValue(['stairs', 'stairsCost', 'stairs_cost', 'stairs_cost_cents', 'stairsCostCents'])
                  // CRITICAL: heavy_items is an array, not a number - calculate from array items
                  const distanceCost = getBreakdownValue(['distanceCost', 'distance_cost', 'distance_cost_cents'])
                  const destinationFee = getBreakdownValue(['destination_fee', 'destinationFee', 'destination_fee_cents']) || (serviceDetails.destination_fee ? Math.round(parseFloat(serviceDetails.destination_fee) * 100) : 0)
                  const insuranceCost = getBreakdownValue(['insurance', 'insuranceCost', 'insurance_cost', 'insurance_cost_cents'])
                  const storageCost = getBreakdownValue(['storage', 'storageCost', 'storage_cost', 'storage_cost_cents'])
                  
                  // CRITICAL: Extract heavy items cost from array - don't try to get it as a number
                  let heavyItemsCostFromItems = 0
                  if (quoteBreakdown.heavy_items) {
                    // If it's an array, sum the prices
                    if (Array.isArray(quoteBreakdown.heavy_items)) {
                      heavyItemsCostFromItems = quoteBreakdown.heavy_items.reduce((sum: number, item: any) => {
                        if (item && typeof item === 'object') {
                          return sum + (item.price_cents || item.price || (typeof item.price === 'number' ? item.price * 100 : 0))
                        }
                        return sum
                      }, 0)
                    } else if (typeof quoteBreakdown.heavy_items === 'object' && quoteBreakdown.heavy_items.price_cents) {
                      // If it's a single object
                      heavyItemsCostFromItems = quoteBreakdown.heavy_items.price_cents || 0
                    }
                  }
                  
                  // Also check for heavy_items_cost or heavyItemsCost as a direct number
                  const heavyItemsCost = getBreakdownValue(['heavyItemsCost', 'heavy_items_cost', 'heavy_items_cost_cents'])
                  
                  // Use the higher of the two heavy items costs
                  // CRITICAL: Ensure it's always a number, never an object or array
                  const finalHeavyItemsCost = (typeof heavyItemsCost === 'number' ? heavyItemsCost : 0) || (typeof heavyItemsCostFromItems === 'number' ? heavyItemsCostFromItems : 0)
                  
                  const hasBreakdown = baseHourly > 0 || packingCost > 0 || stairsCost > 0 || finalHeavyItemsCost > 0 || distanceCost > 0 || destinationFee > 0 || insuranceCost > 0 || storageCost > 0
                  
                  // Debug logging for providers to help troubleshoot
                  if (isProvider && Object.keys(quoteBreakdown).length > 0) {
                    console.log('[Booking Details] Breakdown detection:', {
                      quoteBreakdown,
                      baseHourly,
                      packingCost,
                      stairsCost,
                      finalHeavyItemsCost,
                      distanceCost,
                      hasBreakdown
                    })
                  }
                  
                  // Show breakdown if we have any costs OR if we have breakdown data (for providers to see structure)
                  const shouldShowBreakdown = hasBreakdown || (isProvider && Object.keys(quoteBreakdown).length > 0)
                  
                  return shouldShowBreakdown ? (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Price Breakdown</p>
                      <div className="space-y-2">
                        {baseHourly > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Base (Hourly Rate)</span>
                            <span className="font-medium text-gray-900">{formatPrice(baseHourly)}</span>
                          </div>
                        )}
                        {distanceCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Distance</span>
                            <span className="font-medium text-gray-900">{formatPrice(distanceCost)}</span>
                          </div>
                        )}
                        {destinationFee > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Destination Fee</span>
                            <span className="font-medium text-gray-900">{formatPrice(destinationFee)}</span>
                          </div>
                        )}
                        {packingCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Packing</span>
                            <span className="font-medium text-gray-900">{formatPrice(packingCost)}</span>
                          </div>
                        )}
                        {stairsCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Stairs</span>
                            <span className="font-medium text-gray-900">{formatPrice(stairsCost)}</span>
                          </div>
                        )}
                        {typeof finalHeavyItemsCost === 'number' && finalHeavyItemsCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Heavy Items</span>
                            <span className="font-medium text-gray-900">{formatPrice(finalHeavyItemsCost)}</span>
                          </div>
                        )}
                        {storageCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Storage</span>
                            <span className="font-medium text-gray-900">{formatPrice(storageCost)}</span>
                          </div>
                        )}
                        {insuranceCost > 0 && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">Insurance</span>
                            <span className="font-medium text-gray-900">{formatPrice(insuranceCost)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Show message if breakdown exists but no costs detected */}
                      {!hasBreakdown && isProvider && Object.keys(quoteBreakdown).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 italic">
                            Breakdown data available but no costs detected. Check console for details.
                          </p>
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                              View raw breakdown data
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                              {/* CRITICAL: Use JSON.stringify to safely render object as string */}
                              {typeof quoteBreakdown === 'object' && quoteBreakdown !== null 
                                ? JSON.stringify(quoteBreakdown, null, 2)
                                : String(quoteBreakdown)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Existing Invoices */}
                {invoices.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Invoices</p>
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <Link
                          key={invoice.id}
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</p>
                            <p className="text-xs text-gray-600">
                              Status: <span className="font-medium">{invoice.status.replace('_', ' ')}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatPrice(invoice.total_cents)}</p>
                            {invoice.balance_cents > 0 && (
                              <p className="text-xs text-orange-600 font-medium">
                                Balance: {formatPrice(invoice.balance_cents)}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pb-3 border-b border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-medium">{formatPrice(booking.base_price_cents)}</span>
                  </div>
                  {booking.hourly_rate_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Hourly Rate × {booking.estimated_duration_hours} hrs
                      </span>
                      <span className="font-medium">
                        {formatPrice(booking.hourly_rate_cents * booking.estimated_duration_hours)}
                      </span>
                    </div>
                  )}
                  {bookingItems.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {bookingItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                          <span className="truncate pr-2">{item.item_name} (×{item.quantity})</span>
                          <span className="flex-shrink-0">{formatPrice(item.total_price_cents)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {booking.additional_fees_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Additional Fees</span>
                      <span className="font-medium">{formatPrice(booking.additional_fees_cents)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-lg">Total</span>
                  <span className="font-bold text-xl text-gray-900">{formatPrice(calculateTotal())}</span>
                </div>
                {invoices.length === 0 && isProvider && booking.booking_status === 'completed' && (
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 mt-4"
                    onClick={() => router.push(`/dashboard/invoices/new?bookingId=${booking.id}`)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
                {invoices.length > 0 && invoices.some(inv => inv.balance_cents > 0 && inv.status !== 'draft') && isCustomer && (
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 mt-4"
                    onClick={() => router.push(`/dashboard/invoices/${invoices[0].id}/pay`)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay Invoice
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Review Prompt */}
            {isCustomer && booking.payment_status === 'paid' && booking.booking_status === 'completed' && (
              <Card className="border-2 border-orange-200 bg-orange-50/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-600" />
                    Leave a Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    How was your experience? Help others by leaving a review.
                  </p>
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => router.push(`/dashboard/reviews/${id}`)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Write Review
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog (shown automatically after payment) */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-600" />
              Share Your Experience
            </DialogTitle>
            <DialogDescription>
              Thank you for your business! We'd love to hear about your experience with {booking.business?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setShowReviewDialog(false)
                router.push(`/dashboard/reviews/${id}`)
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              Write Review Now
            </Button>
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={() => setShowReviewDialog(false)}
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
