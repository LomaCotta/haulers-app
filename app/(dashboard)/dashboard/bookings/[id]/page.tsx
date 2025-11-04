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
  Truck,
  X,
  User,
  PhoneCall,
  MessageSquare
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import MessageModal from "@/components/message-modal"

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
  customer?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    phone: string | null
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Form states for adding items
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemCategory, setItemCategory] = useState('labor')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemUnitPrice, setItemUnitPrice] = useState('')

  // Form states for editing booking
  const [editRequestedDate, setEditRequestedDate] = useState('')
  const [editRequestedTime, setEditRequestedTime] = useState('')
  const [editServiceAddress, setEditServiceAddress] = useState('')
  const [editServiceCity, setEditServiceCity] = useState('')
  const [editServiceState, setEditServiceState] = useState('')
  const [editServicePostalCode, setEditServicePostalCode] = useState('')
  const [editCustomerNotes, setEditCustomerNotes] = useState('')
  const [editBusinessNotes, setEditBusinessNotes] = useState('')
  
  // Service details edit states
  const [editPickupAddresses, setEditPickupAddresses] = useState<Array<{address: string; city: string; state: string; zip: string; aptSuite?: string}>>([])
  const [editDeliveryAddresses, setEditDeliveryAddresses] = useState<Array<{address: string; city: string; state: string; zip: string; aptSuite?: string}>>([])
  
  // Address autocomplete states
  const [autocompleteQueries, setAutocompleteQueries] = useState<{[key: string]: string}>({})
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<{[key: string]: any[]}>({})
  const [showAutocomplete, setShowAutocomplete] = useState<{[key: string]: boolean}>({})
  const [editMoveSize, setEditMoveSize] = useState('')
  const [editMoverTeam, setEditMoverTeam] = useState(2)
  const [editHourlyRateCents, setEditHourlyRateCents] = useState(0)
  const [editEstimatedDuration, setEditEstimatedDuration] = useState(3)
  const [editHeavyItems, setEditHeavyItems] = useState<Array<{band: string; count: number; price_cents: number}>>([])
  const [editStairsFlights, setEditStairsFlights] = useState(0)
  const [editPackingHelp, setEditPackingHelp] = useState<'none' | 'kit' | 'paygo'>('none')
  const [editPackingRooms, setEditPackingRooms] = useState(0)
  const [editPackingMaterials, setEditPackingMaterials] = useState<Array<{name: string; price_cents: number; quantity?: number; included?: boolean}>>([])
  const [editPackingConfig, setEditPackingConfig] = useState<{per_room_cents?: number; materials?: Array<{name: string; price_cents: number; included?: boolean}>} | null>(null)
  const [editHeavyItemTiers, setEditHeavyItemTiers] = useState<Array<{min_weight_lbs: number; max_weight_lbs: number; price_cents: number}>>([])
  const [editTimeSlot, setEditTimeSlot] = useState('')

  useEffect(() => {
    loadBooking()
  }, [id])

  // Sync hourly rate from provider settings when Team Size changes in Edit dialog
  useEffect(() => {
    const run = async () => {
      if (!showEditDialog || !booking?.business_id || !editMoverTeam) return
      try {
        const teamSize = Number(editMoverTeam)
        const tier = await fetchTierForTeam(booking.business_id, teamSize)
        if (tier) {
          // tier.hourly_rate_cents IS the team rate (not per mover), use it directly
          if (typeof tier.hourly_rate_cents === 'number' && tier.hourly_rate_cents > 0) {
            setEditHourlyRateCents(tier.hourly_rate_cents)
          } else if ((booking.hourly_rate_cents || 0) > 0) {
            setEditHourlyRateCents(booking.hourly_rate_cents)
          }
          if (tier.min_hours != null && tier.min_hours > 0 && editEstimatedDuration < tier.min_hours) {
            setEditEstimatedDuration(tier.min_hours)
          }
        } else if ((booking.hourly_rate_cents || 0) > 0) {
          setEditHourlyRateCents(booking.hourly_rate_cents)
        }
      } catch (_) {}
    }
    run()
  }, [showEditDialog, editMoverTeam, booking?.business_id])

  // Poll for updates if customer (to see changes made by provider/admin)
  useEffect(() => {
    if (!isCustomer || !booking?.id || !booking.updated_at) return
    
    const currentUpdatedAt = booking.updated_at
    setLastUpdated(currentUpdatedAt)
    
    const interval = setInterval(async () => {
      try {
        // Fetch fresh booking data
        const supabase = createClient()
        const { data: freshBooking } = await supabase
          .from("bookings")
          .select("updated_at")
          .eq("id", booking.id)
          .single()
        
        if (freshBooking?.updated_at) {
          // Get current lastUpdated from state
          const currentLastUpdated = lastUpdated || currentUpdatedAt
          
          // Compare timestamps
          const freshTime = new Date(freshBooking.updated_at).getTime()
          const lastTime = new Date(currentLastUpdated).getTime()
          
          if (freshTime > lastTime) {
            // Booking was updated - reload full data and notify
            await loadBooking()
            setToast({
              show: true,
              message: 'Booking has been updated! Refreshing to show latest changes...',
              type: 'success'
            })
            setLastUpdated(freshBooking.updated_at)
            
            // Auto-hide toast after 5 seconds
            setTimeout(() => {
              setToast({ show: false, message: '', type: 'success' })
            }, 5000)
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error)
      }
    }, 10000) // Check every 10 seconds for updates
    
    return () => clearInterval(interval)
  }, [isCustomer, booking?.id, booking?.updated_at])

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
      
      // Fetch customer profile separately
      let customerData = null
      if (bookingData?.customer_id) {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, phone")
          .eq("id", bookingData.customer_id)
          .single()
        customerData = customerProfile
      }

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

      let bookingObj = {
        ...bookingData,
        customer: customerData
      } as Booking
      const userIsCustomer = bookingObj.customer_id === user.id
      const userIsProvider = bookingObj.business?.owner_id === user.id

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userIsAdmin = profile?.role === 'admin'

      setIsCustomer(userIsCustomer)
      setIsProvider(userIsProvider)
      setIsAdmin(userIsAdmin || false)

      if (!userIsCustomer && !userIsProvider && !userIsAdmin) {
        router.push('/dashboard/bookings')
        return
      }

      setBooking(bookingObj)
      
      // Store updated_at timestamp for change detection
      if (bookingObj.updated_at) {
        setLastUpdated(bookingObj.updated_at)
      }

      // Debug: Log service_details to understand structure
      console.log('📦 Booking loaded from DB:', {
        mover_team: bookingObj.service_details?.mover_team,
        crew_size: bookingObj.service_details?.crew_size,
        hourly_rate_cents: bookingObj.hourly_rate_cents,
        breakdown_mover_team: bookingObj.service_details?.breakdown?.mover_team,
        breakdown_crew_size: bookingObj.service_details?.breakdown?.crew_size
      })
      console.log('📦 Full service_details:', JSON.stringify(bookingObj.service_details, null, 2))
      console.log('📦 Booking service_address:', bookingObj.service_address)
      console.log('📦 Booking service_city:', bookingObj.service_city)
      console.log('📦 Booking service_state:', bookingObj.service_state)

      // Try to fetch quote data if quote_id exists in service_details
      const quoteId = (bookingObj.service_details as any)?.quote_id || (bookingObj.service_details as any)?.quoteId
      
      // CRITICAL: Only enrich if mover_team/crew_size don't exist (user hasn't set team size yet)
      // If team size is already set, skip enrichment to preserve user edits
      const hasTeamSize = bookingObj.service_details?.mover_team || bookingObj.service_details?.crew_size
      
      // First, verify service_details completeness using database function (if available)
      // BUT ONLY if team size hasn't been manually set
      if (!hasTeamSize) {
        try {
          const { data: verification, error: verifyError } = await supabase.rpc(
            'verify_service_details_completeness',
            { p_booking_id: id }
          )
          
          if (!verifyError && verification && !verification.valid && verification.missing_fields) {
            console.log('⚠️ Service details incomplete, missing:', verification.missing_fields)
            
            // Try to auto-enrich using database function (only if team size not set)
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
      } else {
        console.log('🔒 Skipping enrichment - team size already set (preserving user edits)')
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
                move_size: currentDetails.move_size || quoteBreakdown.move_size || quoteData.move_size || 'unknown',
                // CRITICAL: Prioritize saved booking data over quote data - quote is old, booking is current
                mover_team: currentDetails.mover_team || currentDetails.crew_size || quoteBreakdown.mover_team || quoteData.crew_size || 2,
                crew_size: currentDetails.crew_size || currentDetails.mover_team || quoteData.crew_size || quoteBreakdown.mover_team || 2,
                hourly_rate: currentDetails.hourly_rate || quoteBreakdown.hourly_rate || null,
                hourly_rate_cents: currentDetails.hourly_rate_cents || bookingObj.hourly_rate_cents || (quoteBreakdown.hourly_rate_cents || (quoteBreakdown.hourly_rate ? Math.round(quoteBreakdown.hourly_rate * 100) : null)),
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

  // Helper: fetch provider config via API and pick the right tier
  const fetchTierForTeam = async (businessId: string, teamSize: number) => {
    try {
      const res = await fetch(`/api/movers/provider-config?businessId=${encodeURIComponent(businessId)}`, { cache: 'no-store' })
      const json = await res.json()
      console.log('[Edit Booking] provider-config response', json)
      if (!res.ok) return null
      const tiers = (json?.config?.tiers || []) as Array<{ crew_size: number; hourly_rate_cents?: number; min_hours?: number }>
      // local, client-safe pickTier
      const exact = tiers.find(t => t.crew_size === teamSize)
      if (exact) return exact
      if (!tiers.length) return null
      return tiers.reduce((best, t) => (Math.abs(t.crew_size - teamSize) < Math.abs((best?.crew_size ?? Infinity) - teamSize) ? t : best), tiers[0])
    } catch (_) {
      return null
    }
  }

  // Helper: fetch provider heavy item tiers
  const fetchHeavyItemTiers = async (businessId: string) => {
    try {
      const res = await fetch(`/api/movers/provider-config?businessId=${encodeURIComponent(businessId)}`, { cache: 'no-store' })
      const json = await res.json()
      console.log('[Edit Booking] fetchHeavyItemTiers response:', json)
      if (!res.ok) return []
      const tiers = json?.config?.heavy_item_tiers || []
      console.log('[Edit Booking] Heavy item tiers:', tiers)
      return Array.isArray(tiers) ? tiers : []
    } catch (err) {
      console.error('[Edit Booking] Error fetching heavy item tiers:', err)
      return []
    }
  }

  // Helper: fetch provider packing config
  const fetchPackingConfig = async (businessId: string) => {
    try {
      const res = await fetch(`/api/movers/provider-config?businessId=${encodeURIComponent(businessId)}`, { cache: 'no-store' })
      const json = await res.json()
      console.log('[Edit Booking] fetchPackingConfig full response:', JSON.stringify(json, null, 2))
      if (!res.ok) {
        console.error('[Edit Booking] fetchPackingConfig error:', json)
        return null
      }
      const packing = json?.config?.packing
      console.log('[Edit Booking] Packing object:', packing)
      // CRITICAL: Materials are in config.packing.materials (not config.materials)
      const materials = packing?.materials || []
      console.log('[Edit Booking] Packing materials array:', materials, 'length:', materials?.length)
      return {
        per_room_cents: packing?.per_room_cents,
        materials: Array.isArray(materials) ? materials : []
      }
    } catch (err) {
      console.error('[Edit Booking] Error fetching packing config:', err)
      return null
    }
  }

  const handleEditBooking = () => {
    if (!booking) return
    
    const serviceDetails = booking.service_details || {}
    
    // Populate edit form with current booking data
    setEditRequestedDate(booking.requested_date || '')
    setEditRequestedTime(booking.requested_time || '')
    setEditServiceAddress(booking.service_address || '')
    setEditServiceCity(booking.service_city || '')
    setEditServiceState(booking.service_state || '')
    setEditServicePostalCode(booking.service_postal_code || '')
    setEditCustomerNotes(booking.customer_notes || '')
    setEditBusinessNotes(booking.business_notes || '')
    
    // Service details
    setEditMoveSize(serviceDetails.move_size || '')
    // CRITICAL: Read team size from multiple sources, prioritizing most recently saved
    const teamSize = serviceDetails.mover_team || 
                     serviceDetails.crew_size || 
                     serviceDetails.breakdown?.mover_team || 
                     serviceDetails.breakdown?.crew_size ||
                     booking.service_details?.mover_team ||
                     booking.service_details?.crew_size ||
                     2
    console.log('🔍 Edit Dialog: Reading team size:', {
      serviceDetails_mover_team: serviceDetails.mover_team,
      serviceDetails_crew_size: serviceDetails.crew_size,
      breakdown_mover_team: serviceDetails.breakdown?.mover_team,
      breakdown_crew_size: serviceDetails.breakdown?.crew_size,
      booking_mover_team: booking.service_details?.mover_team,
      booking_crew_size: booking.service_details?.crew_size,
      final_team_size: teamSize,
      full_service_details: JSON.stringify(serviceDetails, null, 2)
    })
    setEditMoverTeam(teamSize)
    setEditHourlyRateCents(booking.hourly_rate_cents || serviceDetails.hourly_rate_cents || 0)
    setEditEstimatedDuration(booking.estimated_duration_hours || serviceDetails.estimated_duration_hours || 3)
    setEditStairsFlights(serviceDetails.stairs_flights || 0)
    setEditPackingHelp(serviceDetails.packing_help || serviceDetails.packing || 'none')
    setEditPackingRooms(serviceDetails.packing_rooms || 0)
    setEditPackingMaterials(serviceDetails.packing_materials || [])
    setEditTimeSlot(serviceDetails.time_slot || '')

    // Immediately pull tier pricing for current team size so UI shows real rate (not 0)
    if (booking.business_id) {
      fetchTierForTeam(booking.business_id, teamSize).then((tier) => {
        if (tier?.hourly_rate_cents != null) {
          setEditHourlyRateCents(tier.hourly_rate_cents)
        }
        if (tier?.min_hours != null && tier.min_hours > 0) {
          setEditEstimatedDuration((prev) => Math.max(tier.min_hours!, prev))
        }
      })
    }
    
    // Helper function to parse full address string into components
    const parseAddressString = (addrString: string): {address: string; city: string; state: string; zip: string} => {
      if (!addrString || typeof addrString !== 'string') {
        return { address: '', city: '', state: '', zip: '' }
      }
      
      // Common US address formats:
      // "Street Address, City, State ZIP, Country"
      // "Street Address, City, State ZIP"
      // "Street Address, City, State"
      
      // Split by comma
      const parts = addrString.split(',').map(p => p.trim())
      
      if (parts.length >= 3) {
        // Format: "Street, City, State ZIP, Country" or "Street, City, State ZIP"
        const street = parts[0]
        const city = parts[1]
        
        // Last part might be country, second-to-last might have state and zip
        let statePart = parts.length > 3 ? parts[parts.length - 2] : parts[2]
        
        // Extract state and ZIP from the state part
        // Format: "State ZIP" or just "State"
        const stateZipMatch = statePart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/)
        let state = ''
        let zip = ''
        
        if (stateZipMatch) {
          // Has ZIP
          state = stateZipMatch[1].trim()
          zip = stateZipMatch[2].trim()
        } else {
          // No ZIP, might be just state or might be country
          // If it's likely a state name (2 words or less, no digits), use it as state
          if (statePart && !statePart.match(/\d/)) {
            state = statePart
          }
        }
        
        return {
          address: street,
          city: city,
          state: state,
          zip: zip
        }
      } else if (parts.length === 2) {
        // Format: "Street, City" or "Street City State ZIP"
        return {
          address: parts[0],
          city: parts[1],
          state: '',
          zip: ''
        }
      }
      
      // If no pattern matches, use the whole string as address
      return { address: addrString.trim(), city: '', state: '', zip: '' }
    }
    
    // Pickup addresses - match the display logic exactly
    let pickupAddrs: Array<{address: string; city: string; state: string; zip: string; aptSuite?: string}> = []
    if (serviceDetails.pickup_addresses && Array.isArray(serviceDetails.pickup_addresses) && serviceDetails.pickup_addresses.length > 0) {
      // If it's already an array of objects
      pickupAddrs = serviceDetails.pickup_addresses.map((addr: any) => {
        if (typeof addr === 'string') {
          // If it's a string, parse it
          return parseAddressString(addr)
        } else if (typeof addr === 'object' && addr !== null) {
          // If it's an object, extract fields
          return {
            address: addr.address || addr.street || '',
            city: addr.city || '',
            state: addr.state || '',
            zip: addr.zip || addr.postal_code || '',
            aptSuite: addr.aptSuite || addr.apt || ''
          }
        }
        return { address: '', city: '', state: '', zip: '' }
      })
    } else if (serviceDetails.from_address) {
      // Single pickup address
      if (typeof serviceDetails.from_address === 'string') {
        // Full string - parse it
        const parsed = parseAddressString(serviceDetails.from_address)
        pickupAddrs = [{
          address: parsed.address,
          city: parsed.city || serviceDetails.from_city || booking.service_city || '',
          state: parsed.state || serviceDetails.from_state || booking.service_state || '',
          zip: parsed.zip || serviceDetails.from_zip || booking.service_postal_code || '',
          aptSuite: serviceDetails.from_apt || ''
        }]
      } else if (typeof serviceDetails.from_address === 'object') {
        // Object with fields
        pickupAddrs = [{
          address: serviceDetails.from_address.address || serviceDetails.from_address.street || '',
          city: serviceDetails.from_city || booking.service_city || '',
          state: serviceDetails.from_state || booking.service_state || '',
          zip: serviceDetails.from_zip || booking.service_postal_code || '',
          aptSuite: serviceDetails.from_address.aptSuite || serviceDetails.from_apt || ''
        }]
      }
    } else if (booking.service_address) {
      // Fallback to service_address - check if it's a full string or just street
      if (booking.service_address.includes(',')) {
        // Looks like a full address string, parse it
        const parsed = parseAddressString(booking.service_address)
        pickupAddrs = [{
          address: parsed.address,
          city: parsed.city || booking.service_city || '',
          state: parsed.state || booking.service_state || '',
          zip: parsed.zip || booking.service_postal_code || ''
        }]
      } else {
        // Just street address
        pickupAddrs = [{
          address: booking.service_address,
          city: booking.service_city || '',
          state: booking.service_state || '',
          zip: booking.service_postal_code || ''
        }]
      }
    }
    
    if (pickupAddrs.length === 0) {
      pickupAddrs = [{address: '', city: '', state: '', zip: ''}]
    }
    setEditPickupAddresses(pickupAddrs)
    
    // Delivery addresses - match the display logic exactly
    let deliveryAddrs: Array<{address: string; city: string; state: string; zip: string; aptSuite?: string}> = []
    if (serviceDetails.delivery_addresses && Array.isArray(serviceDetails.delivery_addresses) && serviceDetails.delivery_addresses.length > 0) {
      // If it's already an array of objects
      deliveryAddrs = serviceDetails.delivery_addresses.map((addr: any) => {
        if (typeof addr === 'string') {
          // If it's a string, parse it
          return parseAddressString(addr)
        } else if (typeof addr === 'object' && addr !== null) {
          // If it's an object, extract fields
          return {
            address: addr.address || addr.street || '',
            city: addr.city || '',
            state: addr.state || '',
            zip: addr.zip || addr.postal_code || '',
            aptSuite: addr.aptSuite || addr.apt || ''
          }
        }
        return { address: '', city: '', state: '', zip: '' }
      })
    } else if (serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address) {
      const toAddr = serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address
      
      if (typeof toAddr === 'string') {
        // Full string - parse it
        const parsed = parseAddressString(toAddr)
        deliveryAddrs = [{
          address: parsed.address,
          city: parsed.city || serviceDetails.to_city || serviceDetails.dropoff_city || '',
          state: parsed.state || serviceDetails.to_state || serviceDetails.dropoff_state || '',
          zip: parsed.zip || serviceDetails.to_zip || serviceDetails.dropoff_zip || '',
          aptSuite: serviceDetails.to_apt || ''
        }]
      } else if (typeof toAddr === 'object' && toAddr !== null) {
        // Object with fields
        deliveryAddrs = [{
          address: toAddr.address || toAddr.street || '',
          city: serviceDetails.to_city || serviceDetails.dropoff_city || '',
          state: serviceDetails.to_state || serviceDetails.dropoff_state || '',
          zip: serviceDetails.to_zip || serviceDetails.dropoff_zip || '',
          aptSuite: toAddr.aptSuite || serviceDetails.to_apt || ''
        }]
      }
    }
    
    if (deliveryAddrs.length === 0) {
      deliveryAddrs = [{address: '', city: '', state: '', zip: ''}]
    }
    setEditDeliveryAddresses(deliveryAddrs)
    
    // Heavy items
    let initialHeavyItems: Array<{band: string; count: number; price_cents: number}> = []
    if (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items)) {
      initialHeavyItems = serviceDetails.heavy_items.map((item: any) => ({
        band: item.band || item.weight_range || item.weight_band || 'N/A',
        count: item.count || 1,
        price_cents: item.price_cents || (item.price ? Math.round(item.price * 100) : 0)
      }))
    } else if (serviceDetails.heavy_items_count > 0) {
      initialHeavyItems = [{
        band: serviceDetails.heavy_item_band || serviceDetails.weight_band || 'N/A',
        count: serviceDetails.heavy_items_count,
        price_cents: serviceDetails.heavy_item_price_cents || 0
      }]
    }
    setEditHeavyItems(initialHeavyItems.length > 0 ? initialHeavyItems : [])
    
    setShowEditDialog(true)
    
    // Fetch heavy item tiers and packing config after dialog opens
    if (booking.business_id) {
      // Fetch heavy item tiers
      fetchHeavyItemTiers(booking.business_id).then((tiers) => {
        if (tiers && tiers.length > 0) {
          setEditHeavyItemTiers(tiers)
          // Auto-update prices for existing heavy items based on provider config
          setEditHeavyItems(prev => {
            if (prev.length === 0) return prev
            return prev.map(item => {
              const bandParts = item.band.split('-')
              const min = parseInt(bandParts[0])
              const max = bandParts[1] ? parseInt(bandParts[1].replace(/\D/g, '')) : Infinity
              const tier = tiers.find(t => t.min_weight_lbs === min && t.max_weight_lbs === max)
              if (tier) {
                return { ...item, price_cents: tier.price_cents }
              }
              return item
            })
          })
        }
      })
      
      // Fetch packing config
      fetchPackingConfig(booking.business_id).then((config) => {
        if (config) {
          setEditPackingConfig(config)
        }
      })
    }
  }
  
  const addPickupAddress = () => {
    setEditPickupAddresses([...editPickupAddresses, {address: '', city: '', state: '', zip: ''}])
  }
  
  const removePickupAddress = (index: number) => {
    setEditPickupAddresses(editPickupAddresses.filter((_, i) => i !== index))
  }
  
  const addDeliveryAddress = () => {
    setEditDeliveryAddresses([...editDeliveryAddresses, {address: '', city: '', state: '', zip: ''}])
  }
  
  const removeDeliveryAddress = (index: number) => {
    setEditDeliveryAddresses(editDeliveryAddresses.filter((_, i) => i !== index))
  }
  
  // Address autocomplete handlers
  const handleAddressAutocomplete = async (query: string, fieldKey: string) => {
    if (!query || query.length < 3) {
      setAutocompleteSuggestions(prev => ({ ...prev, [fieldKey]: [] }))
      setShowAutocomplete(prev => ({ ...prev, [fieldKey]: false }))
      return
    }
    
    setAutocompleteQueries(prev => ({ ...prev, [fieldKey]: query }))
    
    try {
      const res = await fetch(`/api/movers/autocomplete-address?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAutocompleteSuggestions(prev => ({ ...prev, [fieldKey]: data.suggestions }))
        setShowAutocomplete(prev => ({ ...prev, [fieldKey]: data.suggestions.length > 0 }))
      } else {
        setAutocompleteSuggestions(prev => ({ ...prev, [fieldKey]: [] }))
        setShowAutocomplete(prev => ({ ...prev, [fieldKey]: false }))
      }
    } catch (e) {
      console.error('Autocomplete error:', e)
      setAutocompleteSuggestions(prev => ({ ...prev, [fieldKey]: [] }))
      setShowAutocomplete(prev => ({ ...prev, [fieldKey]: false }))
    }
  }
  
  const selectAutocompleteAddress = (suggestion: any, type: 'pickup' | 'delivery', idx: number) => {
    const addressKey = `${type}-${idx}`
    
    // Extract apt/suite if present in address
    let streetAddress = suggestion.address
    let aptSuite = ''
    const aptMatch = streetAddress.match(/\s+(?:apt|apartment|suite|unit|#)\s*([\w\d-]+)$/i)
    if (aptMatch) {
      streetAddress = streetAddress.replace(/\s+(?:apt|apartment|suite|unit|#)\s*[\w\d-]+$/i, '').trim()
      aptSuite = aptMatch[1]
    }
    
    if (type === 'pickup') {
      const updated = [...editPickupAddresses]
      if (updated[idx]) {
        updated[idx] = {
          address: streetAddress.trim(),
          city: suggestion.city || '',
          state: suggestion.state || '',
          zip: suggestion.zip || '',
          aptSuite: aptSuite.trim()
        }
        setEditPickupAddresses(updated)
      }
    } else {
      const updated = [...editDeliveryAddresses]
      if (updated[idx]) {
        updated[idx] = {
          address: streetAddress.trim(),
          city: suggestion.city || '',
          state: suggestion.state || '',
          zip: suggestion.zip || '',
          aptSuite: aptSuite.trim()
        }
        setEditDeliveryAddresses(updated)
      }
    }
    
    // Clear autocomplete
    setAutocompleteSuggestions(prev => ({ ...prev, [addressKey]: [] }))
    setShowAutocomplete(prev => ({ ...prev, [addressKey]: false }))
    setAutocompleteQueries(prev => ({ ...prev, [addressKey]: '' }))
  }
  
  const addHeavyItem = () => {
    // Use first available tier or default
    const defaultTier = editHeavyItemTiers.length > 0 ? editHeavyItemTiers[0] : null
    const defaultBand = defaultTier 
      ? `${defaultTier.min_weight_lbs}-${defaultTier.max_weight_lbs}`
      : '201-400'
    const defaultPrice = defaultTier?.price_cents || 0
    setEditHeavyItems([...editHeavyItems, {band: defaultBand, count: 0, price_cents: defaultPrice}])
  }
  
  const removeHeavyItem = (index: number) => {
    setEditHeavyItems(editHeavyItems.filter((_, i) => i !== index))
  }

  const handleSaveBooking = async () => {
    if (!booking) return

    // Check if editing is allowed (not after payment)
    if (booking.payment_status === 'paid') {
      alert('Cannot edit booking after payment has been completed.')
      return
    }

    setSaving(true)
    try {
      // CRITICAL: Validate all addresses before saving
      // Filter addresses that have at least street address
      const validPickupAddresses = editPickupAddresses.filter(addr => addr && addr.address && typeof addr.address === 'string' && addr.address.trim() !== '')
      const validDeliveryAddresses = editDeliveryAddresses.filter(addr => addr && addr.address && typeof addr.address === 'string' && addr.address.trim() !== '')
      
      if (validPickupAddresses.length === 0) {
        throw new Error('At least one pickup address with street address is required. Please add and complete the address.')
      }
      if (validDeliveryAddresses.length === 0) {
        throw new Error('At least one delivery address with street address is required. Please add and complete the address.')
      }
      
      // Validate that required fields are present (city, state, zip will be auto-filled or can be added)
      const incompletePickup = validPickupAddresses.find(addr => !addr.city || !addr.state || !addr.zip)
      const incompleteDelivery = validDeliveryAddresses.find(addr => !addr.city || !addr.state || !addr.zip)
      
      if (incompletePickup) {
        // Try to validate and auto-fill missing fields
        console.log('Incomplete pickup address found, attempting to validate:', incompletePickup)
      }
      if (incompleteDelivery) {
        // Try to validate and auto-fill missing fields
        console.log('Incomplete delivery address found, attempting to validate:', incompleteDelivery)
      }
      
      // Validate each address with Mapbox
      setToast({
        show: true,
        message: 'Validating addresses and recalculating fees...',
        type: 'success'
      })
      
      // Get business config for validation
      const supabase = createClient()
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, base_zip, service_radius_miles, max_travel_distance_miles')
        .eq('id', booking.business_id)
        .single()
      
      const providerBaseZip = businessData?.base_zip || '91605'
      const serviceRadiusMiles = businessData?.service_radius_miles || 25
      const maxTravelDistanceMiles = businessData?.max_travel_distance_miles || 100
      
      // Validate all addresses
      const addressValidationErrors: string[] = []
      const addressDistances: Array<{address: string; distanceMiles: number}> = []
      
      for (const addr of validPickupAddresses) {
        const addressString = `${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`
        try {
          const validateRes = await fetch('/api/movers/validate-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: addressString,
              providerBaseZip,
              serviceRadiusMiles,
              maxTravelDistanceMiles
            })
          })
          const validateData = await validateRes.json()
          
          if (!validateData.valid) {
            addressValidationErrors.push(`Pickup address: ${validateData.error || 'Invalid address'}`)
          } else {
            addressDistances.push({
              address: addressString,
              distanceMiles: validateData.distanceMiles || 0
            })
          }
        } catch (e) {
          addressValidationErrors.push(`Pickup address validation failed: ${addressString}`)
        }
      }
      
      // Auto-fill missing fields for delivery addresses
      for (let i = 0; i < validDeliveryAddresses.length; i++) {
        const addr = validDeliveryAddresses[i]
        let addressString = addr.address
        
        // Build address string - try to complete missing fields by validating
        if (!addr.city || !addr.state || !addr.zip) {
          // Try to validate and get missing fields
          try {
            const validateRes = await fetch('/api/movers/validate-address', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: addr.address,
                providerBaseZip,
                serviceRadiusMiles,
                maxTravelDistanceMiles
              })
            })
            const validateData = await validateRes.json()
            
            if (validateData.valid && validateData.addressZip) {
              // Auto-fill missing fields
              const updated = [...validDeliveryAddresses]
              if (updated[i]) {
                if (!updated[i].city && validateData.formattedAddress) {
                  // Try to extract city from formatted address
                  const parts = validateData.formattedAddress.split(',')
                  if (parts.length >= 2) {
                    updated[i].city = parts[parts.length - 2]?.trim() || updated[i].city
                  }
                }
                if (!updated[i].state && validateData.formattedAddress) {
                  // Try to extract state from formatted address
                  const parts = validateData.formattedAddress.split(',')
                  if (parts.length >= 2) {
                    const stateZipPart = parts[parts.length - 1]?.trim() || ''
                    const stateMatch = stateZipPart.match(/^(.+?)\s+\d{5}/)
                    if (stateMatch) {
                      updated[i].state = stateMatch[1].trim()
                    }
                  }
                }
                if (!updated[i].zip) {
                  updated[i].zip = validateData.addressZip
                }
              }
              validDeliveryAddresses[i] = updated[i]
            }
          } catch (e) {
            console.error('Auto-fill failed for delivery address:', e)
          }
        }
        
        // Now validate complete address
        addressString = `${addr.address}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`.trim()
        
        try {
          const validateRes = await fetch('/api/movers/validate-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: addressString || addr.address,
              providerBaseZip,
              serviceRadiusMiles,
              maxTravelDistanceMiles
            })
          })
          const validateData = await validateRes.json()
          
          if (!validateData.valid) {
            addressValidationErrors.push(`Delivery address ${i + 1}: ${validateData.error || 'Invalid address'}`)
          } else {
            // Update address with validated data if needed
            if (validateData.addressZip && !addr.zip) {
              validDeliveryAddresses[i].zip = validateData.addressZip
            }
            addressDistances.push({
              address: addressString,
              distanceMiles: validateData.distanceMiles || 0
            })
          }
        } catch (e) {
          addressValidationErrors.push(`Delivery address ${i + 1} validation failed: ${addr.address}`)
        }
      }
      
      if (addressValidationErrors.length > 0) {
        throw new Error(addressValidationErrors.join('; '))
      }
      
      // Calculate furthest distance from base for destination fee
      const furthestDistance = addressDistances.length > 0 
        ? Math.max(...addressDistances.map(a => a.distanceMiles))
        : 0
      
      // Recalculate destination fee based on furthest address
      // Default: $2.30/mile for distances > 25 miles
      const destinationFeePerMile = 2.3
      const newDestinationFee = furthestDistance > 25 
        ? Math.round(furthestDistance * destinationFeePerMile) 
        : 0
      
      // Recalculate trip distance between first pickup and delivery
      let tripDistanceMiles = 0
      let tripDurationMinutes = 0
      
      if (validPickupAddresses[0] && validDeliveryAddresses[0]) {
        const pickupString = `${validPickupAddresses[0].address}, ${validPickupAddresses[0].city}, ${validPickupAddresses[0].state} ${validPickupAddresses[0].zip}`
        const deliveryString = `${validDeliveryAddresses[0].address}, ${validDeliveryAddresses[0].city}, ${validDeliveryAddresses[0].state} ${validDeliveryAddresses[0].zip}`
        
        try {
          const distanceRes = await fetch('/api/movers/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pickup: pickupString,
              dropoff: deliveryString
            })
          })
          const distanceData = await distanceRes.json()
          if (distanceData.miles) {
            tripDistanceMiles = distanceData.miles
            // Estimate duration: ~40-50 mph average, plus time for loading/unloading
            tripDurationMinutes = Math.round((tripDistanceMiles / 45) * 60)
          }
        } catch (e) {
          console.error('Failed to calculate trip distance:', e)
        }
      }
      
      // Build updated service_details
      const currentServiceDetails = booking.service_details || {}
      
      // Get existing breakdown or create new one
      const existingBreakdown = currentServiceDetails.breakdown || {}
      
      // Heavy items - filter out items with count 0 or missing data
      // If all items are removed, explicitly set to empty array
      // CRITICAL: Use provider tier prices if available
      const validHeavyItems = editHeavyItems
        .filter(item => item && item.count > 0 && item.band)
        .map(item => {
          // Match band to provider tier and use tier price if available
          const bandParts = item.band.split('-')
          const min = parseInt(bandParts[0])
          const max = bandParts[1] ? parseInt(bandParts[1].replace(/\D/g, '')) : Infinity
          const tier = editHeavyItemTiers.find(t => t.min_weight_lbs === min && t.max_weight_lbs === max)
          
          return {
            band: item.band,
            count: item.count,
            price_cents: tier?.price_cents || item.price_cents || 0
          }
        })
      
      const updatedServiceDetails = {
        ...currentServiceDetails,
        // Addresses - use validated addresses
        pickup_addresses: validPickupAddresses,
        delivery_addresses: validDeliveryAddresses,
        // Set single address fields for backward compatibility
        from_address: validPickupAddresses[0] ? {
          address: validPickupAddresses[0].address,
          city: validPickupAddresses[0].city,
          state: validPickupAddresses[0].state,
          zip: validPickupAddresses[0].zip,
          aptSuite: validPickupAddresses[0].aptSuite
        } : (currentServiceDetails.from_address),
        to_address: validDeliveryAddresses[0] ? {
          address: validDeliveryAddresses[0].address,
          city: validDeliveryAddresses[0].city,
          state: validDeliveryAddresses[0].state,
          zip: validDeliveryAddresses[0].zip,
          aptSuite: validDeliveryAddresses[0].aptSuite
        } : (currentServiceDetails.to_address),
        // Also set string versions for compatibility
        from_city: validPickupAddresses[0]?.city || currentServiceDetails.from_city,
        from_state: validPickupAddresses[0]?.state || currentServiceDetails.from_state,
        from_zip: validPickupAddresses[0]?.zip || currentServiceDetails.from_zip,
        to_city: validDeliveryAddresses[0]?.city || currentServiceDetails.to_city,
        to_state: validDeliveryAddresses[0]?.state || currentServiceDetails.to_state,
        to_zip: validDeliveryAddresses[0]?.zip || currentServiceDetails.to_zip,
        // Update trip distance and destination fee based on new addresses
        trip_distance_miles: tripDistanceMiles || currentServiceDetails.trip_distance_miles || 0,
        trip_distance_duration: tripDurationMinutes || currentServiceDetails.trip_distance_duration || 0,
        destination_fee: newDestinationFee > 0 ? String(newDestinationFee) : (currentServiceDetails.destination_fee || '0'),
        double_drive_time: tripDistanceMiles > 10 || newDestinationFee > 0,
        // Update breakdown with new destination fee
        breakdown: {
          ...existingBreakdown,
          destination_fee: newDestinationFee / 100, // Store in dollars for consistency with quoteCalculator
          destinationFee: newDestinationFee / 100,
          trip_distance_miles: tripDistanceMiles,
          trip_distance_duration: tripDurationMinutes
        },
        // Service details
        move_size: editMoveSize || currentServiceDetails.move_size,
        mover_team: Number(editMoverTeam) || 2,
        crew_size: Number(editMoverTeam) || 2,
        hourly_rate_cents: editHourlyRateCents,
        hourly_rate: editHourlyRateCents / 100,
        estimated_duration_hours: editEstimatedDuration,
        time_slot: editTimeSlot || currentServiceDetails.time_slot,
        // Heavy items - use pre-filtered valid items
        heavy_items: validHeavyItems.length > 0 ? validHeavyItems : [],
        heavy_items_count: validHeavyItems.reduce((sum, item) => sum + (item.count || 0), 0),
        heavy_item_band: validHeavyItems.length > 0 ? validHeavyItems[0].band : null,
        heavy_item_price_cents: validHeavyItems.length > 0 
          ? validHeavyItems[0].price_cents || 0
          : 0,
        // Stairs - ensure this is always set, even when removed (0)
        stairs_flights: editStairsFlights || 0,
        stairs: (editStairsFlights || 0) > 0,
        // Packing - only set packing_rooms for Full Packing Kit (kit option)
        // Pay as You Go (paygo) and I will pack myself (none) don't use room count - set to 0
        packing_help: editPackingHelp,
        packing: editPackingHelp,
        packing_rooms: (editPackingHelp === 'kit' && editPackingRooms > 0) ? editPackingRooms : 0,
        // CRITICAL: Include packing_materials for Pay as You Go (filter out materials with quantity 0)
        packing_materials: editPackingHelp === 'paygo' ? editPackingMaterials.filter(m => (m.quantity || 0) > 0) : [],
      }

      // Debug: Log what we're sending
      console.log('💾 Saving booking:', {
        editMoverTeam: editMoverTeam,
        editMoverTeamType: typeof editMoverTeam,
        service_details: {
          mover_team: updatedServiceDetails.mover_team,
          crew_size: updatedServiceDetails.crew_size,
          hourly_rate_cents: updatedServiceDetails.hourly_rate_cents,
          stairs_flights: updatedServiceDetails.stairs_flights,
          heavy_items: updatedServiceDetails.heavy_items,
        }
      })

      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_date: editRequestedDate || booking.requested_date,
          requested_time: editRequestedTime || booking.requested_time,
          service_address: editServiceAddress || booking.service_address,
          service_city: editServiceCity || booking.service_city,
          service_state: editServiceState || booking.service_state,
          service_postal_code: editServicePostalCode || booking.service_postal_code,
          customer_notes: editCustomerNotes || booking.customer_notes,
          business_notes: editBusinessNotes || booking.business_notes,
          hourly_rate_cents: editHourlyRateCents || booking.hourly_rate_cents,
          estimated_duration_hours: editEstimatedDuration || booking.estimated_duration_hours,
          service_details: updatedServiceDetails,
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to update booking')
      }

      // Update booking state immediately with API response (includes all updates)
      // CRITICAL: Create a new object to ensure React detects the change
      if (result.booking) {
        const updatedBooking = {
          ...result.booking,
          service_details: result.booking.service_details ? { ...result.booking.service_details } : {}
        } as Booking
        setBooking(updatedBooking)
        console.log('✅ Booking updated from API response:', {
          mover_team: updatedBooking.service_details?.mover_team,
          crew_size: updatedBooking.service_details?.crew_size,
          breakdown_mover_team: updatedBooking.service_details?.breakdown?.mover_team,
          breakdown_crew_size: updatedBooking.service_details?.breakdown?.crew_size,
          hourly_rate_cents: updatedBooking.hourly_rate_cents,
          total_price_cents: updatedBooking.total_price_cents
        })
      } else {
        console.error('❌ No booking in API response:', result)
      }
      
      setShowEditDialog(false)
      
      // Show nice toast notification
      setToast({
        show: true,
        message: 'Booking updated successfully! Team size and all changes have been saved.',
        type: 'success'
      })
      
      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' })
      }, 4000)
      
      // CRITICAL: Refresh from DB immediately to ensure display is updated
      // Use a short delay to ensure DB write has propagated
      setTimeout(async () => {
        console.log('🔄 Refreshing booking from database...')
        await loadBooking()
        // Force a full page refresh to ensure all displays update correctly
        // This ensures React re-renders with fresh data from DB
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }, 500)
      }, 800)
    } catch (error) {
      console.error('Error updating booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to update booking. Please try again.')
    } finally {
      setSaving(false)
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
                  console.log('🔍 Parsing serviceDetails:', {
                    mover_team: serviceDetails.mover_team,
                    crew_size: serviceDetails.crew_size,
                    breakdown_mover_team: serviceDetails.breakdown?.mover_team,
                    breakdown_crew_size: serviceDetails.breakdown?.crew_size,
                    full_service_details: serviceDetails
                  })
                  
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
                  
                  // Fallback addresses for display (ensure strings, never objects)
                  const formatAddress = (addr: any): string => {
                    if (!addr) return ''
                    if (typeof addr === 'string') return addr
                    if (typeof addr === 'object') {
                      const street = addr.address || addr.street || ''
                      const city = addr.city || ''
                      const state = addr.state || ''
                      const zip = addr.zip || addr.postal_code || ''
                      const parts = [street, [city, state].filter(Boolean).join(', '), zip].filter(Boolean)
                      return parts.join(', ').replace(/,\s*,/g, ', ').trim()
                    }
                    return String(addr)
                  }
                  
                  const fromAddress = formatAddress(serviceDetails.from_address || serviceDetails.pickup_address) || 
                                    (pickupAddresses.length > 0 ? 
                                      `${pickupAddresses[0].address || pickupAddresses[0].street || ''}, ${pickupAddresses[0].city || ''}, ${pickupAddresses[0].state || ''}` 
                                      : (booking.service_address || ''))
                  const toAddress = formatAddress(serviceDetails.to_address || serviceDetails.dropoff_address || serviceDetails.delivery_address) ||
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
                        
                        {(() => {
                          // CRITICAL: Get team size from multiple sources, prioritizing current saved data
                          const teamSize = serviceDetails.mover_team || 
                                         serviceDetails.crew_size || 
                                         serviceDetails.breakdown?.mover_team || 
                                         serviceDetails.breakdown?.crew_size ||
                                         booking.service_details?.mover_team ||
                                         booking.service_details?.crew_size ||
                                         null
                          
                          return teamSize ? (
                            <div className="flex items-start gap-3">
                              <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-gray-900">Team Size</p>
                                <p className="text-sm text-muted-foreground">
                                  {teamSize} {teamSize === 1 ? 'mover' : 'movers'}
                                </p>
                              </div>
                            </div>
                          ) : null
                        })()}
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
                                  {(() => {
                                    const street = addr.address || addr.street || ''
                                    const apt = addr.aptSuite || addr.apt_suite || ''
                                    const city = addr.city || addr.city_name || ''
                                    const state = addr.state || addr.state_name || ''
                                    const zip = addr.zip || addr.zip_code || addr.postal_code || ''
                                    const parts = [street, apt, city, state, zip].filter(Boolean)
                                    const display = parts.length > 0 ? parts.join(', ').replace(/,\s*,/g, ', ') : ''
                                    return (
                                      <p className="text-base text-gray-900 leading-relaxed break-words">{display}</p>
                                    )
                                  })()}
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
                                  {(() => {
                                    const street = addr.address || addr.street || ''
                                    const apt = addr.aptSuite || addr.apt_suite || ''
                                    const city = addr.city || addr.city_name || ''
                                    const state = addr.state || addr.state_name || ''
                                    const zip = addr.zip || addr.zip_code || addr.postal_code || ''
                                    const parts = [street, apt, city, state, zip].filter(Boolean)
                                    const display = parts.length > 0 ? parts.join(', ').replace(/,\s*,/g, ', ') : ''
                                    return (
                                      <p className="text-base text-gray-900 leading-relaxed break-words">{display}</p>
                                    )
                                  })()}
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
                          {/* CRITICAL: Prioritize serviceDetails (current saved data) */}
                          {(() => {
                            const currentStairsFlights = serviceDetails.stairs_flights !== undefined ? serviceDetails.stairs_flights : stairsFlights
                            const currentHasStairs = serviceDetails.stairs !== undefined ? serviceDetails.stairs : (hasStairs || currentStairsFlights > 0)
                            
                            if (currentHasStairs || currentStairsFlights > 0) {
                              return (
                                <p className="text-base font-semibold text-gray-900">
                                  {currentStairsFlights > 0 
                                    ? `${currentStairsFlights} flight${currentStairsFlights !== 1 ? 's' : ''}` 
                                    : 'Yes - Details available'}
                                </p>
                              )
                            } else {
                              return <p className="text-base text-gray-500 italic">No stairs</p>
                            }
                          })()}
                        </div>
                      </div>

                      {/* PACKING SECTION - ALWAYS SHOW */}
                      <div className="pt-4 border-t-2 border-gray-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="w-5 h-5 text-gray-600" />
                          <h5 className="text-sm font-bold uppercase tracking-wide text-gray-900">Packing</h5>
                        </div>
                        <div className="pl-7 space-y-2">
                          {/* CRITICAL: Use serviceDetails first (current saved data) */}
                          {(() => {
                            const currentPackingHelp = serviceDetails.packing_help || serviceDetails.packing || packingHelp
                            const currentPackingRooms = (currentPackingHelp === 'none') ? 0 : (serviceDetails.packing_rooms !== undefined ? serviceDetails.packing_rooms : packingRooms)
                            
                            if ((currentPackingHelp && currentPackingHelp !== 'none') || currentPackingRooms > 0 || (packingMaterials && packingMaterials.length > 0)) {
                              return (
                                <>
                                  {currentPackingHelp && currentPackingHelp !== 'none' && (
                                    <p className="text-base font-semibold text-gray-900 capitalize mb-1">
                                      Type: {String(currentPackingHelp).replace('_', ' ')}
                                    </p>
                                  )}
                                  {currentPackingRooms > 0 && (
                                    <p className="text-base text-gray-700">
                                      {currentPackingRooms} room{currentPackingRooms !== 1 ? 's' : ''} to pack
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
                              )
                            } else {
                              return <p className="text-base text-gray-500 italic">No packing requested</p>
                            }
                          })()}
                        </div>
                      </div>

                      {/* HEAVY ITEMS SECTION - ALWAYS SHOW */}
                      <div className="pt-4 border-t-2 border-gray-300 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-5 h-5 text-gray-600" />
                          <h5 className="text-sm font-bold uppercase tracking-wide text-gray-900">Heavy Items</h5>
                        </div>
                        <div className="pl-7">
                          {/* CRITICAL: Prioritize serviceDetails (current saved data) */}
                          {(() => {
                            // Check if serviceDetails explicitly has empty array (items were removed)
                            if (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items) && serviceDetails.heavy_items.length === 0) {
                              return <p className="text-base text-gray-500 italic">No heavy items specified</p>
                            }
                            
                            // Check if serviceDetails has heavy_items_count explicitly set to 0 (removed)
                            if (serviceDetails.heavy_items_count === 0) {
                              return <p className="text-base text-gray-500 italic">No heavy items specified</p>
                            }
                            
                            // Use serviceDetails heavy items if available
                            if (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items) && serviceDetails.heavy_items.length > 0) {
                              return (
                                <ul className="space-y-2">
                                  {serviceDetails.heavy_items
                                    .filter((item: any) => item && typeof item === 'object' && item.count > 0)
                                    .map((item: any, idx: number) => {
                                      const band = item?.band || item?.weight_band || item?.weight_range || 'N/A'
                                      const count = item?.count || 0
                                      
                                      return (
                                        <li key={idx} className="text-base font-semibold text-gray-900">
                                          • Weight range: <span className="font-bold">{String(band)}</span> lbs 
                                          ({count} {count === 1 ? 'item' : 'items'})
                                        </li>
                                      )
                                    })}
                                </ul>
                              )
                            }
                            
                            // Fallback to heavyItems array (from quoteBreakdown) only if serviceDetails doesn't have it
                            if (Array.isArray(heavyItems) && heavyItems.length > 0) {
                              return (
                                <ul className="space-y-2">
                                  {heavyItems
                                    .filter((item: any) => item && typeof item === 'object' && item.count > 0)
                                    .map((item: any, idx: number) => {
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
                              )
                            }
                            
                            // Final fallback to count/band if available
                            if (serviceDetails.heavy_items_count > 0) {
                              return (
                                <p className="text-base font-semibold text-gray-900">
                                  Weight range: <span className="font-bold">{serviceDetails.heavy_item_band || 'N/A'}</span> lbs 
                                  ({serviceDetails.heavy_items_count} {serviceDetails.heavy_items_count === 1 ? 'item' : 'items'})
                                </p>
                              )
                            }
                            
                            return <p className="text-base text-gray-500 italic">No heavy items specified</p>
                          })()}
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

            {/* Provider/Admin Actions - Edit, Add Items & Create Invoice */}
            {(isProvider || isAdmin) && booking.booking_status !== 'completed' && booking.booking_status !== 'cancelled' && (
              <Card className="border-2 border-orange-200 bg-orange-50/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-orange-600" />
                    Manage Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Edit Booking Button - Only show if payment not completed */}
                    {booking.payment_status !== 'paid' && (
                      <Button 
                        onClick={handleEditBooking}
                        variant="outline"
                        className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Booking
                      </Button>
                    )}
                    {/* Add Extra Hours / Items removed: all edits happen via Edit Booking */}

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

            {/* Edit Booking Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Booking</DialogTitle>
                  <DialogDescription>
                    Update all booking details. Changes will be visible to the customer.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editRequestedDate">Requested Date *</Label>
                        <Input
                          id="editRequestedDate"
                          type="date"
                          value={editRequestedDate}
                          onChange={(e) => setEditRequestedDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="editRequestedTime">Requested Time *</Label>
                        <Input
                          id="editRequestedTime"
                          type="time"
                          value={editRequestedTime}
                          onChange={(e) => setEditRequestedTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {/* Move Size Selection - Card-based UI */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editMoveSize">Move Size</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {[
                            {label:'Studio', movers:2, value:'studio'},
                            {label:'1 Bedroom', movers:2, value:'1-bedroom'},
                            {label:'2 Bedroom', movers:3, value:'2-bedroom'},
                            {label:'3 Bedroom', movers:4, value:'3-bedroom'},
                            {label:'4+ Bedroom', movers:5, value:'4-bedroom'},
                            {label:'Custom Size', movers:3, value:'custom'},
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setEditMoveSize(opt.value)
                                setEditMoverTeam(opt.movers)
                              }}
                              className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                                editMoveSize === opt.value || opt.movers === editMoverTeam
                                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                                  : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50/50'
                              }`}
                            >
                              <div className="text-base font-semibold text-gray-900">{opt.label}</div>
                              <div className="text-orange-600 mt-1 text-sm font-medium">{opt.movers} Movers</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Team Size Adjuster & Hourly Rate */}
                      <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50/50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-700">Team Size</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="px-3 py-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                              onClick={() => setEditMoverTeam(m => Math.max(1, (parseInt(String(m)) || 2) - 1))}
                            >
                              −
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={editMoverTeam}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                if (!isNaN(val)) setEditMoverTeam(Math.min(10, Math.max(1, val)))
                              }}
                              className="w-16 text-center border-gray-300"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="px-3 py-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                              onClick={() => setEditMoverTeam(m => Math.min(10, (parseInt(String(m)) || 2) + 1))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            {formatPrice(editHourlyRateCents || 0)}/hr
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Rate for {editMoverTeam} {editMoverTeam === 1 ? 'mover' : 'movers'} team
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="editEstimatedDuration">Estimated Duration (Hours)</Label>
                        <Input
                          id="editEstimatedDuration"
                          type="number"
                          min="1"
                          value={editEstimatedDuration}
                          onChange={(e) => setEditEstimatedDuration(parseInt(e.target.value) || 3)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editTimeSlot">Time Slot</Label>
                        <select
                          id="editTimeSlot"
                          value={editTimeSlot}
                          onChange={(e) => setEditTimeSlot(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select time</option>
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Addresses */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Pickup Addresses</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addPickupAddress}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Address
                      </Button>
                    </div>
                    {editPickupAddresses.map((addr, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Address {idx + 1}</span>
                          {editPickupAddresses.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removePickupAddress(idx)}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Label>Street Address *</Label>
                          <Input
                            value={addr.address || ''}
                            onChange={(e) => {
                              const updated = [...editPickupAddresses]
                              if (updated[idx]) {
                                updated[idx].address = e.target.value || ''
                              }
                              setEditPickupAddresses(updated)
                              
                              // Trigger autocomplete
                              const addressKey = `pickup-${idx}`
                              handleAddressAutocomplete(e.target.value, addressKey)
                            }}
                            onFocus={(e) => {
                              if (e.target.value.length >= 3) {
                                const addressKey = `pickup-${idx}`
                                handleAddressAutocomplete(e.target.value, addressKey)
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding autocomplete to allow click selection
                              setTimeout(() => {
                                const addressKey = `pickup-${idx}`
                                setShowAutocomplete(prev => ({ ...prev, [addressKey]: false }))
                              }, 200)
                            }}
                            placeholder="Start typing address..."
                          />
                          {showAutocomplete[`pickup-${idx}`] && autocompleteSuggestions[`pickup-${idx}`]?.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {autocompleteSuggestions[`pickup-${idx}`].map((suggestion, sugIdx) => (
                                <button
                                  key={suggestion.id || sugIdx}
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                                  onClick={() => selectAutocompleteAddress(suggestion, 'pickup', idx)}
                                >
                                  <div className="font-medium text-sm text-gray-900">{suggestion.address}</div>
                                  <div className="text-xs text-gray-500">{suggestion.city}, {suggestion.state} {suggestion.zip}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label>City *</Label>
                            <Input
                              value={addr.city || ''}
                              onChange={(e) => {
                                const updated = [...editPickupAddresses]
                                if (updated[idx]) {
                                  updated[idx].city = e.target.value || ''
                                }
                                setEditPickupAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>State *</Label>
                            <Input
                              value={addr.state || ''}
                              onChange={(e) => {
                                const updated = [...editPickupAddresses]
                                if (updated[idx]) {
                                  updated[idx].state = e.target.value || ''
                                }
                                setEditPickupAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>ZIP *</Label>
                            <Input
                              value={addr.zip || ''}
                              onChange={(e) => {
                                const updated = [...editPickupAddresses]
                                if (updated[idx]) {
                                  updated[idx].zip = e.target.value || ''
                                }
                                setEditPickupAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>Apt/Suite</Label>
                            <Input
                              value={addr.aptSuite || ''}
                              onChange={(e) => {
                                const updated = [...editPickupAddresses]
                                if (updated[idx]) {
                                  updated[idx].aptSuite = e.target.value || ''
                                }
                                setEditPickupAddresses(updated)
                              }}
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Addresses */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Delivery Addresses</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addDeliveryAddress}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Address
                      </Button>
                    </div>
                    {editDeliveryAddresses.map((addr, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Address {idx + 1}</span>
                          {editDeliveryAddresses.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeDeliveryAddress(idx)}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Label>Street Address *</Label>
                          <Input
                            value={addr.address || ''}
                            onChange={(e) => {
                              const updated = [...editDeliveryAddresses]
                              if (updated[idx]) {
                                updated[idx].address = e.target.value || ''
                              }
                              setEditDeliveryAddresses(updated)
                              
                              // Trigger autocomplete
                              const addressKey = `delivery-${idx}`
                              handleAddressAutocomplete(e.target.value, addressKey)
                            }}
                            onFocus={(e) => {
                              if (e.target.value.length >= 3) {
                                const addressKey = `delivery-${idx}`
                                handleAddressAutocomplete(e.target.value, addressKey)
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding autocomplete to allow click selection
                              setTimeout(() => {
                                const addressKey = `delivery-${idx}`
                                setShowAutocomplete(prev => ({ ...prev, [addressKey]: false }))
                              }, 200)
                            }}
                            placeholder="Start typing address..."
                          />
                          {showAutocomplete[`delivery-${idx}`] && autocompleteSuggestions[`delivery-${idx}`]?.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {autocompleteSuggestions[`delivery-${idx}`].map((suggestion, sugIdx) => (
                                <button
                                  key={suggestion.id || sugIdx}
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                                  onClick={() => selectAutocompleteAddress(suggestion, 'delivery', idx)}
                                >
                                  <div className="font-medium text-sm text-gray-900">{suggestion.address}</div>
                                  <div className="text-xs text-gray-500">{suggestion.city}, {suggestion.state} {suggestion.zip}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label>City *</Label>
                            <Input
                              value={addr.city || ''}
                              onChange={(e) => {
                                const updated = [...editDeliveryAddresses]
                                if (updated[idx]) {
                                  updated[idx].city = e.target.value || ''
                                }
                                setEditDeliveryAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>State *</Label>
                            <Input
                              value={addr.state || ''}
                              onChange={(e) => {
                                const updated = [...editDeliveryAddresses]
                                if (updated[idx]) {
                                  updated[idx].state = e.target.value || ''
                                }
                                setEditDeliveryAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>ZIP *</Label>
                            <Input
                              value={addr.zip || ''}
                              onChange={(e) => {
                                const updated = [...editDeliveryAddresses]
                                if (updated[idx]) {
                                  updated[idx].zip = e.target.value || ''
                                }
                                setEditDeliveryAddresses(updated)
                              }}
                            />
                          </div>
                          <div>
                            <Label>Apt/Suite</Label>
                            <Input
                              value={addr.aptSuite || ''}
                              onChange={(e) => {
                                const updated = [...editDeliveryAddresses]
                                if (updated[idx]) {
                                  updated[idx].aptSuite = e.target.value || ''
                                }
                                setEditDeliveryAddresses(updated)
                              }}
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Heavy Items - Card-based UI matching packing materials */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Heavy Items</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addHeavyItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {editHeavyItems.length === 0 ? (
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">No heavy items added</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editHeavyItems.map((item, idx) => {
                          // Find matching tier for current band
                          const bandParts = item.band.split('-')
                          const min = parseInt(bandParts[0])
                          const max = bandParts[1] ? parseInt(bandParts[1].replace(/\D/g, '')) : Infinity
                          const matchingTier = editHeavyItemTiers.find(t => t.min_weight_lbs === min && t.max_weight_lbs === max)
                          const displayPrice = matchingTier?.price_cents || item.price_cents || 0
                          const totalForItem = displayPrice * item.count
                          
                          return (
                            <div key={idx} className={`p-4 border rounded-lg ${item.count > 0 ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-900">Heavy Item {idx + 1}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeHeavyItem(idx)} className="text-red-600 hover:text-red-700">
                                  Remove
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label>Weight Range (lbs)</Label>
                                  <select
                                    value={item.band}
                                    onChange={(e) => {
                                      const updated = [...editHeavyItems]
                                      const newBand = e.target.value
                                      updated[idx].band = newBand
                                      // Auto-populate price from provider config
                                      const newBandParts = newBand.split('-')
                                      const newMin = parseInt(newBandParts[0])
                                      const newMax = newBandParts[1] ? parseInt(newBandParts[1].replace(/\D/g, '')) : Infinity
                                      const tier = editHeavyItemTiers.find(t => t.min_weight_lbs === newMin && t.max_weight_lbs === newMax)
                                      if (tier) {
                                        updated[idx].price_cents = tier.price_cents
                                      }
                                      setEditHeavyItems(updated)
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    {editHeavyItemTiers.length > 0 ? (
                                      editHeavyItemTiers.map(tier => (
                                        <option key={`${tier.min_weight_lbs}-${tier.max_weight_lbs}`} value={`${tier.min_weight_lbs}-${tier.max_weight_lbs}`}>
                                          {tier.min_weight_lbs}-{tier.max_weight_lbs} lbs
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option value="201-400">201-400 lbs</option>
                                        <option value="401-600">401-600 lbs</option>
                                        <option value="601-800">601-800 lbs</option>
                                        <option value="801-1000">801-1000 lbs</option>
                                        <option value="1001+">1001+ lbs</option>
                                      </>
                                    )}
                                  </select>
                                  {matchingTier && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Provider rate: ${(matchingTier.price_cents / 100).toFixed(2)}/item
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Label>Count</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.count}
                                    onChange={(e) => {
                                      const updated = [...editHeavyItems]
                                      updated[idx].count = parseInt(e.target.value) || 0
                                      setEditHeavyItems(updated)
                                    }}
                                    className="text-center"
                                  />
                                </div>
                                <div>
                                  <Label>Price per Item ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={displayPrice / 100}
                                    onChange={(e) => {
                                      const updated = [...editHeavyItems]
                                      updated[idx].price_cents = Math.round(parseFloat(e.target.value) * 100) || 0
                                      setEditHeavyItems(updated)
                                    }}
                                    disabled={!!matchingTier}
                                    className={matchingTier ? 'bg-gray-100 cursor-not-allowed' : ''}
                                    title={matchingTier ? 'Price is set from provider config' : ''}
                                  />
                                  {matchingTier && (
                                    <p className="text-xs text-gray-500 mt-1 italic">From provider config</p>
                                  )}
                                </div>
                              </div>
                              {item.count > 0 && displayPrice > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Subtotal:</span>
                                    <span className="text-lg font-bold text-orange-600">
                                      ${(totalForItem / 100).toFixed(2)} ({item.count} × ${(displayPrice / 100).toFixed(2)})
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {editHeavyItems.length > 0 && editHeavyItems.some(item => item.count > 0) && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total Heavy Items Cost:</span>
                          <span className="text-2xl font-bold text-orange-600">
                            ${(editHeavyItems.reduce((sum, item) => {
                              const bandParts = item.band.split('-')
                              const min = parseInt(bandParts[0])
                              const max = bandParts[1] ? parseInt(bandParts[1].replace(/\D/g, '')) : Infinity
                              const tier = editHeavyItemTiers.find(t => t.min_weight_lbs === min && t.max_weight_lbs === max)
                              const price = tier?.price_cents || item.price_cents || 0
                              return sum + (price * item.count)
                            }, 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stairs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Additional Services</h3>
                    <div>
                      <Label htmlFor="editStairsFlights">Stairs (Flights)</Label>
                      <Input
                        id="editStairsFlights"
                        type="number"
                        min="0"
                        value={editStairsFlights}
                        onChange={(e) => setEditStairsFlights(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Packing Selection - Card-based UI matching booking form */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Choose your packing option</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditPackingHelp('kit')
                          // Don't reset rooms - keep current value
                        }}
                        className={`group p-5 border rounded-xl transition-all text-left hover:shadow-md hover:-translate-y-0.5 ${editPackingHelp === 'kit' ? 'border-orange-500 shadow-md ring-1 ring-orange-200' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-semibold">Full Packing Kit</div>
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Best Value</span>
                        </div>
                        <div className="text-3xl font-bold text-orange-600">
                          {editPackingConfig?.per_room_cents ? (editPackingRooms > 0 ? `$${Math.round(((editPackingConfig.per_room_cents || 0) * editPackingRooms) / 100)}` : `$${Math.round((editPackingConfig.per_room_cents || 0) / 100)}/room`) : '$—'}
                        </div>
                        <ul className="mt-3 list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Complete packing supplies for your move</li>
                          {(editPackingConfig?.materials || []).filter(m => m.included).slice(0, 4).map(m => (
                            <li key={m.name}>{m.name}</li>
                          ))}
                        </ul>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPackingHelp('paygo')
                          // CRITICAL: Reset packing_rooms to 0 for Pay as You Go - rooms are not relevant
                          setEditPackingRooms(0)
                          // Don't reset materials - keep existing selections
                        }}
                        className={`group p-5 border rounded-xl transition-all text-left hover:shadow-md hover:-translate-y-0.5 ${editPackingHelp === 'paygo' ? 'border-orange-500 shadow-md ring-1 ring-orange-200' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-semibold">Pay as You Go</div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Flexible</span>
                        </div>
                        <div className="text-3xl font-bold text-orange-600">
                          ${(() => {
                            const total = editPackingMaterials.reduce((sum, m) => sum + ((m.price_cents || 0) * (m.quantity || 1)), 0)
                            return Math.round(total / 100)
                          })()}
                        </div>
                        <div className="mt-3 text-sm text-gray-700">Choose individual items as needed</div>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                          {(editPackingConfig?.materials || []).slice(0, 6).map(m => (
                            <li key={m.name}>{m.name}: ${Math.round((m.price_cents || 0) / 100)}</li>
                          ))}
                        </ul>
                      </button>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditPackingHelp('none')
                          // CRITICAL: Reset packing_rooms to 0 for I will pack myself - rooms are not relevant
                          setEditPackingRooms(0)
                        }}
                        className={`w-full md:w-auto px-6 py-3 rounded-xl border transition hover:shadow ${editPackingHelp === 'none' ? 'border-orange-500 shadow ring-1 ring-orange-200' : 'border-gray-300'}`}
                      >
                        Customer will pack
                      </button>
                    </div>
                    {/* CRITICAL: Only show "number of rooms" for Full Packing Kit - NOT for Pay as You Go or I will pack myself */}
                    {editPackingHelp === 'kit' && (
                      <div className="mt-6">
                        <label className="block text-sm font-semibold mb-4 text-gray-900">How many rooms?</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                if (num === 6) {
                                  // For 6+, set to 6 and show custom input
                                  setEditPackingRooms(6)
                                } else {
                                  setEditPackingRooms(num)
                                }
                              }}
                              className={`
                                relative p-4 rounded-xl border-2 transition-all duration-200 font-semibold text-lg
                                ${editPackingRooms === num || (num === 6 && editPackingRooms >= 6)
                                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 shadow-md shadow-orange-500/20 scale-105'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-sm'
                                }
                              `}
                            >
                              {num === 6 ? (
                                <span className="block">
                                  <span className="block text-base">6+</span>
                                  <span className="text-xs font-normal text-gray-500 mt-0.5">Custom</span>
                                </span>
                              ) : (
                                <span>{num}</span>
                              )}
                              {(editPackingRooms === num || (num === 6 && editPackingRooms >= 6)) && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {editPackingRooms >= 6 && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-sm text-gray-600">Custom number:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditPackingRooms(Math.max(6, editPackingRooms - 1))}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={6}
                                value={editPackingRooms}
                                onChange={e => setEditPackingRooms(Math.max(6, parseInt(e.target.value) || 6))}
                                className="w-20 text-center border border-gray-300 rounded-lg px-3 py-1.5 font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                              <button
                                type="button"
                                onClick={() => setEditPackingRooms(editPackingRooms + 1)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* CRITICAL: Show materials selector for Pay as You Go */}
                    {editPackingHelp === 'paygo' && (
                      <div className="mt-6">
                        <label className="block text-sm font-semibold mb-4 text-gray-900">Select Packing Materials</label>
                        {!editPackingConfig ? (
                          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-600">Loading materials...</p>
                          </div>
                        ) : (editPackingConfig.materials && editPackingConfig.materials.length > 0) ? (
                          <div className="space-y-3">
                            {editPackingConfig.materials.map((material, idx) => {
                              const selectedMaterial = editPackingMaterials.find(m => m.name === material.name)
                              const quantity = selectedMaterial?.quantity || 0
                              const isSelected = quantity > 0
                              
                              return (
                                <div key={idx} className={`p-4 border rounded-lg ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{material.name}</div>
                                      <div className="text-sm text-gray-600">${Math.round((material.price_cents || 0) / 100)} each</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...editPackingMaterials]
                                          const existingIdx = updated.findIndex(m => m.name === material.name)
                                          if (existingIdx >= 0) {
                                            const existing = updated[existingIdx]
                                            if (existing && (existing.quantity ?? 0) > 1) {
                                              updated[existingIdx] = { ...existing, quantity: (existing.quantity ?? 1) - 1 }
                                            } else {
                                              updated.splice(existingIdx, 1)
                                            }
                                          }
                                          setEditPackingMaterials(updated)
                                        }}
                                        disabled={quantity === 0}
                                        className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        −
                                      </button>
                                      <span className="w-12 text-center font-semibold">{quantity}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...editPackingMaterials]
                                          const existingIdx = updated.findIndex(m => m.name === material.name)
                                          if (existingIdx >= 0) {
                                            updated[existingIdx].quantity = (updated[existingIdx].quantity || 1) + 1
                                          } else {
                                            updated.push({
                                              name: material.name,
                                              price_cents: material.price_cents || 0,
                                              quantity: 1,
                                              included: material.included
                                            })
                                          }
                                          setEditPackingMaterials(updated)
                                        }}
                                        className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="mt-2 text-sm text-orange-700">
                                      Subtotal: ${Math.round(((material.price_cents || 0) * quantity) / 100)} ({quantity} × ${Math.round((material.price_cents || 0) / 100)})
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                            <p className="text-sm text-orange-700">
                              No packing materials available. Please configure materials in your provider settings first.
                            </p>
                          </div>
                        )}
                        {editPackingMaterials.length > 0 && (
                          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900">Total Materials Cost:</span>
                              <span className="text-2xl font-bold text-orange-600">
                                ${Math.round(editPackingMaterials.reduce((sum, m) => sum + ((m.price_cents || 0) * (m.quantity || 1)), 0) / 100)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Notes</h3>
                    <div>
                      <Label htmlFor="editCustomerNotes">Customer Notes</Label>
                      <Textarea
                        id="editCustomerNotes"
                        value={editCustomerNotes}
                        onChange={(e) => setEditCustomerNotes(e.target.value)}
                        placeholder="Notes visible to customer"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="editBusinessNotes">Business Notes</Label>
                      <Textarea
                        id="editBusinessNotes"
                        value={editBusinessNotes}
                        onChange={(e) => setEditBusinessNotes(e.target.value)}
                        placeholder="Internal notes (not visible to customer)"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEditDialog(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveBooking}
                      disabled={saving}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save All Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Toast Notification */}
            {toast.show && (
              <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
                <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md ${
                  toast.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {toast.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
                  </div>
                    <button
                      onClick={() => setToast({ show: false, message: '', type: 'success' })}
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors ${
                        toast.type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                </div>
              </div>
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
              <Card className="border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-600" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Avatar and Name */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                    {booking.customer?.avatar_url ? (
                      <div className="relative">
                        <img 
                          src={booking.customer.avatar_url} 
                          alt={booking.customer.full_name || 'Customer'} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-orange-200 shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center border-2 border-orange-200 shadow-md">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">
                        {booking.customer?.full_name || 'Customer'}
                      </h3>
                      {booking.customer_email && (
                        <p className="text-sm text-gray-600 truncate">{booking.customer_email}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Unified Color Scheme */}
                  {(booking.customer_phone || booking.customer_id) && (
                    <div className={`grid gap-2.5 ${booking.customer_phone ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {booking.customer_phone && (
                        <>
                          <Button
                            variant="default"
                            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all font-medium"
                            onClick={() => {
                              window.location.href = `tel:${booking.customer_phone}`
                            }}
                          >
                            <PhoneCall className="w-4 h-4 mr-2" />
                            Call
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 font-medium transition-all"
                            onClick={() => {
                              window.location.href = `sms:${booking.customer_phone}`
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            SMS
                          </Button>
                        </>
                      )}
                      <Button
                        variant="default"
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all font-medium"
                        onClick={() => {
                          setShowChatModal(true)
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-2.5 pt-2 border-t border-gray-100">
                    {booking.customer_phone && (
                      <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-orange-600" />
                        </div>
                        <a href={`tel:${booking.customer_phone}`} className="text-sm hover:text-orange-600 text-gray-700 font-medium transition-colors flex-1">
                          {booking.customer_phone}
                        </a>
                      </div>
                    )}
                    
                    {booking.customer_email && (
                      <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <a href={`mailto:${booking.customer_email}`} className="text-sm hover:text-blue-600 text-gray-700 font-medium transition-colors flex-1 truncate">
                          {booking.customer_email}
                        </a>
                      </div>
                    )}
                  </div>
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
                  // IMPORTANT: All breakdown values from quoteCalculator are in DOLLARS (not cents)
                  // Only values with _cents suffix or keys explicitly ending in _cents are in cents
                  const getBreakdownValue = (keys: string[], defaultValue = 0) => {
                    for (const key of keys) {
                      const value = quoteBreakdown[key]
                      // CRITICAL: Skip arrays and objects - they need special handling
                      if (value !== undefined && value !== null && value !== '' && value !== 0 && !Array.isArray(value) && typeof value !== 'object') {
                        // Check if the key explicitly indicates cents (ends with _cents)
                        const isCentsKey = key.toLowerCase().endsWith('_cents') || key.toLowerCase().endsWith('Cents')
                        
                        if (isCentsKey) {
                          // Already in cents, return as is (but handle very large numbers which might be incorrect)
                          const numValue = typeof value === 'number' ? value : parseFloat(String(value))
                          if (!isNaN(numValue)) {
                            // If value > 10000, it might actually be in dollars mislabeled as cents
                            // But for _cents keys, assume they're correct
                            return Math.round(numValue)
                          }
                        } else {
                          // NOT a _cents key - assume value is in DOLLARS (from quoteCalculator)
                          let dollarValue = 0
                          
                          if (typeof value === 'number') {
                            dollarValue = value
                          } else if (typeof value === 'string') {
                            // Parse string values (might have $ sign)
                            dollarValue = parseFloat(value.replace(/[$,]/g, '')) || 0
                          }
                          
                          if (!isNaN(dollarValue) && dollarValue > 0) {
                            // Convert dollars to cents
                            return Math.round(dollarValue * 100)
                          }
                        }
                      }
                    }
                    return defaultValue
                  }
                  
                  // Extract service details for breakdown display FIRST
                  const hourlyRateCents = booking.hourly_rate_cents || serviceDetails.hourly_rate_cents || (serviceDetails.hourly_rate ? Math.round(parseFloat(String(serviceDetails.hourly_rate)) * 100) : 0)
                  // CRITICAL: Prioritize serviceDetails (current saved data) over quoteBreakdown (old quote data)
                  // Check multiple places to ensure we get the updated team size
                  const moverTeam = serviceDetails.mover_team || 
                                  serviceDetails.crew_size || 
                                  serviceDetails.breakdown?.mover_team || 
                                  serviceDetails.breakdown?.crew_size ||
                                  quoteBreakdown.mover_team || 
                                  quoteBreakdown.crew_size || 
                                  2
                  const estimatedDuration = booking.estimated_duration_hours || serviceDetails.estimated_duration_hours || 3
                  const baseHours = 3 // Standard minimum hours
                  const moveSize = serviceDetails.move_size || quoteBreakdown.move_size || ''
                  const timeSlot = serviceDetails.time_slot || quoteBreakdown.time_slot || ''
                  const doubleDriveTime = serviceDetails.double_drive_time || quoteBreakdown.double_drive_time || false
                  const tripDistance = serviceDetails.trip_distance_miles || serviceDetails.mileage || serviceDetails.trip_distances?.distance || 0
                  const tripDuration = serviceDetails.trip_distance_duration || serviceDetails.trip_distances?.duration || 0
                  // CRITICAL: Prioritize serviceDetails (current saved data) over quoteBreakdown (old quote data)
                  const packingHelp = serviceDetails.packing_help || serviceDetails.packing || quoteBreakdown.packing_help || 'none'
                  // If packing is 'none', packing_rooms should be 0
                  const packingRooms = (packingHelp === 'none') ? 0 : (serviceDetails.packing_rooms !== undefined ? serviceDetails.packing_rooms : (quoteBreakdown.packing_rooms || 0))
                  const stairsFlights = serviceDetails.stairs_flights !== undefined ? serviceDetails.stairs_flights : (quoteBreakdown.stairs_flights || 0)
                  
                  // CRITICAL: Calculate team hourly rate FIRST
                  // Priority: 1) booking.hourly_rate_cents (updated from API), 2) breakdown values, 3) calculated from baseHourly
                  // Check if hourly_rate_cents is a team rate (from updated booking)
                  const isTeamRate = serviceDetails.hourly_rate_is_team_rate === true || 
                                     (hourlyRateCents && moverTeam > 0 && (hourlyRateCents / moverTeam) < 2000)
                  
                  let teamHourlyRateCents = 0
                  if (hourlyRateCents && moverTeam > 0) {
                    if (isTeamRate) {
                      // hourly_rate_cents is already the TEAM rate
                      teamHourlyRateCents = hourlyRateCents
                    } else {
                      // hourly_rate_cents is PER-MOVER rate, multiply by movers
                      teamHourlyRateCents = hourlyRateCents * moverTeam
                    }
                  }
                  
                  // Calculate baseHourly from breakdown first (fallback)
                  let baseHourly = getBreakdownValue(['base_hourly', 'baseHourly', 'base_hourly_cents', 'basePrice', 'base_price_cents']) || booking.base_price_cents || 0
                  
                  // CRITICAL: If we have an updated team rate, recalculate baseHourly from it
                  // This ensures baseHourly reflects the current team size and rate
                  if (teamHourlyRateCents > 0) {
                    baseHourly = Math.round(teamHourlyRateCents * baseHours)
                  } else if (baseHourly > 0 && baseHours > 0) {
                    // Fallback: calculate team rate from baseHourly
                    teamHourlyRateCents = Math.round(baseHourly / baseHours)
                  }
                  
                  // Calculate per-mover hourly rate (for display)
                  const hourlyRatePerMoverCents = moverTeam > 0 && teamHourlyRateCents > 0
                    ? Math.round(teamHourlyRateCents / moverTeam)
                    : teamHourlyRateCents
                  
                            // Extract heavy items details - PRIORITIZE serviceDetails (current saved data) over quoteBreakdown (old quote data)
                            let heavyItemsArray: Array<any> = []
                            
                            // CRITICAL: Check serviceDetails FIRST (this has the most recent saved data)
                            if (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items)) {
                              // Use serviceDetails if it exists (even if empty array - that means items were removed)
                              heavyItemsArray = serviceDetails.heavy_items as Array<any>
                            } else if (serviceDetails.heavy_items_count > 0) {
                              // If we have count but not array, create array from count/band from serviceDetails
                              const count = serviceDetails.heavy_items_count
                              const band = serviceDetails.heavy_item_band || serviceDetails.weight_range || 'N/A'
                              const priceCents = serviceDetails.heavy_item_price_cents || 0
                              heavyItemsArray = [{
                                band: band,
                                count: count,
                                price_cents: priceCents,
                                weight_range: band
                              }]
                            } else if (quoteBreakdown.heavy_items && Array.isArray(quoteBreakdown.heavy_items)) {
                              // Fallback to quoteBreakdown only if serviceDetails doesn't have it
                              heavyItemsArray = quoteBreakdown.heavy_items as Array<any>
                            } else if (quoteBreakdown.heavy_items_count > 0) {
                              // Final fallback to quoteBreakdown count/band
                              const count = quoteBreakdown.heavy_items_count || 1
                              const band = quoteBreakdown.heavy_item_band || quoteBreakdown.weight_band || 'N/A'
                              const priceCents = quoteBreakdown.heavy_item_price_cents || 0
                              heavyItemsArray = [{
                                band: band,
                                count: count,
                                price_cents: priceCents,
                                weight_range: band
                              }]
                            }
                            // If heavyItemsArray is empty, that means items were removed - leave it as empty array
                  
                  // CRITICAL: Prioritize serviceDetails (current saved data) over quoteBreakdown (old quote data)
                  // Packing cost - check serviceDetails first, then recalculate if needed
                  let packingCost = 0
                  if (serviceDetails.packing_help === 'none' || serviceDetails.packing === 'none') {
                    packingCost = 0 // Explicitly set to 0 if packing was removed
                  } else if (packingHelp === 'kit' && packingRooms > 0) {
                    // CRITICAL: For Full Packing Kit with rooms, read from breakdown or recalculate
                    if (quoteBreakdown.packing_cost_cents && typeof quoteBreakdown.packing_cost_cents === 'number' && quoteBreakdown.packing_cost_cents > 0) {
                      packingCost = Math.round(quoteBreakdown.packing_cost_cents)
                      // Validate: if cost seems too low for the number of rooms, recalculate
                      const perRoomCents = Math.round(packingCost / packingRooms)
                      // If per-room cost is less than $50, it's probably wrong (should be at least $50-99 per room)
                      if (perRoomCents < 50 * 100 && packingRooms > 1) {
                        // Recalculate: assume $99 per room (fallback since we don't have provider config here)
                        packingCost = Math.round(99 * 100 * packingRooms)
                      }
                    } else {
                      // No breakdown value or invalid - calculate from rooms (fallback)
                      // Assume $99 per room (this should match provider config, but we don't have it here)
                      packingCost = Math.round(99 * 100 * packingRooms)
                    }
                  } else if (packingHelp === 'paygo') {
                    // CRITICAL: Pay as You Go - calculate from packing_materials only
                    const packingMaterials = serviceDetails.packing_materials || []
                    if (Array.isArray(packingMaterials) && packingMaterials.length > 0) {
                      packingCost = packingMaterials.reduce((sum: number, mat: any) => {
                        const quantity = mat.quantity || 1
                        const priceCents = mat.price_cents || 0
                        return sum + (priceCents * quantity)
                      }, 0)
                    } else {
                      // No materials selected - cost is $0
                      packingCost = 0
                    }
                  } else {
                    // For other packing types, use breakdown value
                    packingCost = getBreakdownValue(['packing_cost_cents', 'packing_cost', 'packing', 'packingCost'])
                  }
                  
                  // Stairs cost - check serviceDetails first
                  let stairsCost = 0
                  if (serviceDetails.stairs_flights === 0 || !serviceDetails.stairs) {
                    stairsCost = 0 // Explicitly set to 0 if stairs were removed
                  } else {
                    stairsCost = getBreakdownValue(['stairs', 'stairsCost', 'stairs_cost', 'stairs_cost_cents', 'stairsCostCents'])
                  }
                  // CRITICAL: heavy_items is an array, not a number - calculate from array items
                  const distanceCost = getBreakdownValue(['distanceCost', 'distance_cost', 'distance_cost_cents'])
                  // Destination fee: try breakdown first, then serviceDetails (assume serviceDetails.destination_fee is in dollars if it's a string/number)
                  let destinationFee = getBreakdownValue(['destination_fee', 'destinationFee', 'destination_fee_cents'])
                  if (!destinationFee && serviceDetails.destination_fee) {
                    // serviceDetails.destination_fee might be a string "$98" or number 98 (dollars) or 9800 (cents)
                    const feeValue = typeof serviceDetails.destination_fee === 'string' 
                      ? parseFloat(serviceDetails.destination_fee.replace(/[$,]/g, '')) 
                      : serviceDetails.destination_fee
                    // If it's a valid number, convert appropriately
                    if (!isNaN(feeValue) && feeValue > 0) {
                      // If it's a large number (>10000), assume it's already in cents, otherwise assume dollars
                      destinationFee = (feeValue > 10000) 
                        ? Math.round(feeValue) 
                        : Math.round(feeValue * 100)
                    }
                  }
                  if (!destinationFee) destinationFee = 0
                  
                  // Calculate distance from base for display
                  // Destination fee formula: furthestFromBase > 25 ? Math.round(furthestFromBase * destinationFeePerMile) : 0
                  // destinationFee is in cents, so: distanceFromBase = (destinationFee / 100) / destinationFeePerMile
                  let distanceFromBase = 0
                  if (destinationFee > 0) {
                    // Try to get distance from breakdown or calculate from fee
                    const destinationFeePerMile = quoteBreakdown.destination_fee_per_mile_cents 
                      ? quoteBreakdown.destination_fee_per_mile_cents / 100 
                      : 2.3 // Default $2.30/mile
                    // destinationFee is in cents, convert to dollars, then divide by per-mile rate
                    distanceFromBase = (destinationFee / 100) / destinationFeePerMile
                  }
                  // Also check if we have stored distance from base in service details
                  const storedDistanceFromBase = serviceDetails.distance_from_base || 
                                                 serviceDetails.furthest_from_base || 
                                                 quoteBreakdown.distance_from_base ||
                                                 quoteBreakdown.furthest_from_base
                  if (storedDistanceFromBase) {
                    distanceFromBase = typeof storedDistanceFromBase === 'number' 
                      ? storedDistanceFromBase 
                      : parseFloat(String(storedDistanceFromBase)) || distanceFromBase
                  }
                  
                  const insuranceCost = getBreakdownValue(['insurance', 'insuranceCost', 'insurance_cost', 'insurance_cost_cents'])
                  const storageCost = getBreakdownValue(['storage', 'storageCost', 'storage_cost', 'storage_cost_cents'])
                  
                  // CRITICAL: Extract heavy items cost - PRIORITIZE serviceDetails (current saved data)
                  let heavyItemsCostFromItems = 0
                  
                  // CRITICAL: If heavyItemsArray is empty (from serviceDetails), items were removed - cost is 0
                  if (heavyItemsArray.length === 0 && serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items)) {
                    // Explicitly empty array means items were removed
                    heavyItemsCostFromItems = 0
                  } else if (heavyItemsArray.length > 0) {
                    // Calculate from heavyItemsArray (which now prioritizes serviceDetails)
                    heavyItemsCostFromItems = heavyItemsArray.reduce((sum: number, item: any) => {
                      if (item && typeof item === 'object') {
                        const count = item.count || 1
                        // If price_cents exists, it's already in cents
                        if (item.price_cents !== undefined && item.price_cents !== null) {
                          return sum + (Math.round(item.price_cents) * count)
                        }
                        // If price exists, assume it's in dollars (from quoteCalculator)
                        if (item.price !== undefined && item.price !== null) {
                          const priceValue = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0
                          return sum + (Math.round(priceValue * 100) * count)
                        }
                      }
                      return sum
                    }, 0)
                  }
                  
                  // Also check for heavy_items_cost or heavyItemsCost as a direct number (but prioritize serviceDetails)
                  const heavyItemsCost = getBreakdownValue(['heavyItemsCost', 'heavy_items_cost', 'heavy_items_cost_cents'])
                  
                  // CRITICAL: Use serviceDetails first if available (even if 0), otherwise use breakdown
                  // If serviceDetails has heavy_items_count === 0 or empty array, that means items were removed
                  let finalHeavyItemsCost = 0
                  if (serviceDetails.heavy_items_count === 0 || (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items) && serviceDetails.heavy_items.length === 0)) {
                    // Items were explicitly removed
                    finalHeavyItemsCost = 0
                  } else if (heavyItemsCostFromItems > 0) {
                    // Use calculated cost from items array
                    finalHeavyItemsCost = heavyItemsCostFromItems
                  } else if (typeof heavyItemsCost === 'number' && heavyItemsCost > 0) {
                    // Fallback to breakdown value
                    finalHeavyItemsCost = heavyItemsCost
                  }
                  
                  const hasBreakdown = baseHourly > 0 || packingCost > 0 || stairsCost > 0 || finalHeavyItemsCost > 0 || destinationFee > 0 || insuranceCost > 0 || storageCost > 0
                  
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Price Breakdown</p>
                      <div className="space-y-4">
                        {baseHourly > 0 && (
                          <div className="pb-4 border-b border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900 mb-1">
                                  Base Payment: {baseHours} hours @ {formatPrice(teamHourlyRateCents)}/hour
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {moverTeam} {moverTeam === 1 ? 'mover' : 'movers'} @ {formatPrice(hourlyRatePerMoverCents)} per mover/hour = {formatPrice(teamHourlyRateCents)}/hour total
                                </div>
                                {(moveSize || timeSlot) && (
                                  <div className="text-xs text-gray-500 mt-2">
                                    {moveSize && <span className="capitalize">{moveSize.replace('_', ' ')}</span>}
                                    {moveSize && timeSlot && <span className="mx-2">•</span>}
                                    {timeSlot && <span className="capitalize">{timeSlot}</span>}
                                  </div>
                                )}
                              </div>
                              <span className="font-bold text-base text-gray-900 ml-6">{formatPrice(baseHourly)}</span>
                            </div>
                            {estimatedDuration > baseHours && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-900 mb-1">
                                      Additional Hours: {estimatedDuration - baseHours} {estimatedDuration - baseHours === 1 ? 'hour' : 'hours'} @ {formatPrice(teamHourlyRateCents)}/hour
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {moverTeam} {moverTeam === 1 ? 'mover' : 'movers'} @ {formatPrice(hourlyRatePerMoverCents)} per mover/hour
                                    </div>
                                    <div className="text-xs text-orange-600 mt-1">Not billed until provider confirms at job completion</div>
                                  </div>
                                  <span className="font-bold text-base text-gray-400 ml-6 line-through">{formatPrice(teamHourlyRateCents * (estimatedDuration - baseHours))}</span>
                                </div>
                              </div>
                            )}
                            {tripDistance > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="text-xs font-medium text-gray-700 mb-1">Trip Details</div>
                                <div className="text-xs text-gray-600">
                                  Distance: {tripDistance.toFixed(1)} miles {tripDuration > 0 && `(${Math.round(tripDuration)} min)`}
                                  {doubleDriveTime && <span className="text-orange-600 ml-2 font-medium">• Double Drive Time Applied</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {destinationFee > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">Destination Fee</span>
                              {distanceFromBase > 0 && (
                                <span className="text-xs text-gray-500 ml-2">• {distanceFromBase.toFixed(1)} miles from base</span>
                              )}
                            </div>
                            <span className="font-semibold text-sm text-gray-900 ml-6">{formatPrice(destinationFee)}</span>
                          </div>
                        )}
                        {finalHeavyItemsCost > 0 && (
                          <div className="py-2 border-b border-gray-100">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-semibold text-gray-900">Heavy Items</span>
                              <span className="font-bold text-base text-gray-900 ml-6">{formatPrice(finalHeavyItemsCost)}</span>
                            </div>
                            {heavyItemsArray.length > 0 && (
                              <div className="space-y-3 pl-4">
                                {heavyItemsArray.map((item: any, idx: number) => {
                                  const band = item.band || item.weight_range || item.weight_band || 'N/A'
                                  const count = item.count || 1
                                  
                                  // Calculate price per item and total for this item
                                  let itemPriceCents = 0
                                  if (item.price_cents !== undefined && item.price_cents !== null) {
                                    itemPriceCents = Math.round(item.price_cents)
                                  } else if (item.price !== undefined && item.price !== null) {
                                    const priceValue = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0
                                    itemPriceCents = Math.round(priceValue * 100)
                                  }
                                  
                                  // If still no price, try to calculate from total if we have multiple items
                                  if (itemPriceCents === 0 && heavyItemsArray.length > 0 && finalHeavyItemsCost > 0) {
                                    const totalCount = heavyItemsArray.reduce((sum: number, it: any) => sum + (it.count || 1), 0)
                                    if (totalCount > 0) {
                                      itemPriceCents = Math.round(finalHeavyItemsCost / totalCount)
                                    }
                                  }
                                  
                                  const itemTotalCents = itemPriceCents > 0 ? (itemPriceCents * count) : 0
                                  
                                  return (
                                    <div key={idx} className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-700 mb-1">
                                          Weight range: {band} <span className="text-gray-600">({count} {count === 1 ? 'item' : 'items'})</span>
                                        </div>
                                        {itemPriceCents > 0 && (
                                          <div className="text-xs text-gray-600 mt-1 pl-2">
                                            {count} {count === 1 ? 'item' : 'items'} × {formatPrice(itemPriceCents)} per item = {formatPrice(itemTotalCents)}
                                          </div>
                                        )}
                                      </div>
                                      {itemPriceCents > 0 && (
                                        <span className="text-xs font-semibold text-gray-700 ml-6">{formatPrice(itemTotalCents)}</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Show Heavy Items as $0 if removed */}
                        {finalHeavyItemsCost === 0 && (serviceDetails.heavy_items && Array.isArray(serviceDetails.heavy_items) && serviceDetails.heavy_items.length === 0) && (
                          <div className="py-2 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Heavy Items</span>
                              <span className="text-xs text-gray-500 italic ml-6">No heavy items</span>
                            </div>
                          </div>
                        )}
                        {/* Show Packing section - always show if packing type is set */}
                        {(packingCost > 0 || serviceDetails.packing_help || serviceDetails.packing || serviceDetails.packing_help === 'none' || serviceDetails.packing === 'none') && (
                          <div className="flex justify-between items-center py-2">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">Packing</span>
                              {packingCost > 0 || serviceDetails.packing_help === 'paygo' ? (
                                <div className="text-xs text-gray-600 mt-1">
                                  Type: {serviceDetails.packing_help === 'kit' ? 'Full Packing Kit' : serviceDetails.packing_help === 'paygo' ? 'Pay as You Go' : serviceDetails.packing_help}
                                  {packingRooms > 0 && (
                                    <span> • {packingRooms} {packingRooms === 1 ? 'room' : 'rooms'} to pack</span>
                                  )}
                                  {packingHelp === 'paygo' && serviceDetails.packing_materials && Array.isArray(serviceDetails.packing_materials) && serviceDetails.packing_materials.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {serviceDetails.packing_materials.map((mat: any, idx: number) => (
                                        <div key={idx} className="text-xs text-gray-600">
                                          • {mat.name}: {mat.quantity || 1} × {formatPrice(mat.price_cents || 0)} = {formatPrice((mat.price_cents || 0) * (mat.quantity || 1))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {packingHelp === 'paygo' && (!serviceDetails.packing_materials || !Array.isArray(serviceDetails.packing_materials) || serviceDetails.packing_materials.length === 0) && (
                                    <div className="text-xs text-gray-500 mt-1 italic">No materials selected</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 mt-1 italic">No packing requested</div>
                              )}
                            </div>
                            <span className="font-semibold text-sm text-gray-900 ml-6">{formatPrice(packingCost)}</span>
                          </div>
                        )}
                        {/* Show Stairs section - always show if explicitly set */}
                        {stairsCost > 0 || (serviceDetails.stairs_flights === 0 || serviceDetails.stairs === false) ? (
                          <div className="flex justify-between items-center py-2">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">Stairs</span>
                              {stairsCost > 0 && stairsFlights > 0 ? (
                                <span className="text-xs text-gray-600 ml-2">• {stairsFlights} {stairsFlights === 1 ? 'flight' : 'flights'}</span>
                              ) : (
                                <span className="text-xs text-gray-500 ml-2 italic">• No stairs</span>
                              )}
                            </div>
                            <span className="font-semibold text-sm text-gray-900 ml-6">{formatPrice(stairsCost)}</span>
                          </div>
                        ) : null}
                        {storageCost > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-700">Storage</span>
                            <span className="font-semibold text-sm text-gray-900 ml-6">{formatPrice(storageCost)}</span>
                          </div>
                        )}
                        {insuranceCost > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-700">Insurance</span>
                            <span className="font-semibold text-sm text-gray-900 ml-6">{formatPrice(insuranceCost)}</span>
                          </div>
                        )}
                        
                        {/* Total Due - calculated from displayed breakdown items */}
                        {(() => {
                          // CRITICAL: Only include items that are actually displayed in the breakdown above
                          // Sum up all the displayed breakdown items
                          // Do NOT bill additional hours until provider confirms
                          const billedAdditionalHours = (serviceDetails?.bill_additional === true && estimatedDuration > baseHours)
                            ? (teamHourlyRateCents * (estimatedDuration - baseHours))
                            : 0
                          const breakdownSubtotal = 
                            (baseHourly > 0 ? baseHourly : 0) +
                            billedAdditionalHours +
                            (destinationFee || 0) +
                            (finalHeavyItemsCost || 0) +
                            (packingCost || 0) +
                            (stairsCost || 0) +
                            (storageCost > 0 ? storageCost : 0) +  // Only include if > 0 (meaning it's displayed)
                            (insuranceCost > 0 ? insuranceCost : 0)  // Only include if > 0 (meaning it's displayed)
                          
                          // Calculate Total Due = breakdown subtotal + additional fees + booking items
                          const totalDue = breakdownSubtotal + (booking.additional_fees_cents || 0) + 
                            (bookingItems.reduce((sum, item) => sum + item.total_price_cents, 0))
                          
                          return (
                            <div className="border-t-2 border-gray-300 pt-4 mt-4 space-y-2">
                              {booking.additional_fees_cents > 0 && (
                                <div className="flex justify-between items-center text-sm text-gray-600">
                                  <span>Additional Fees</span>
                                  <span>{formatPrice(booking.additional_fees_cents)}</span>
                                </div>
                              )}
                              {bookingItems.length > 0 && (
                                <div className="flex justify-between items-center text-sm text-gray-600">
                                  <span>Additional Items</span>
                                  <span>{formatPrice(bookingItems.reduce((sum, item) => sum + item.total_price_cents, 0))}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t-2 border-gray-400">
                                <span className="text-base font-bold text-gray-900">Total Due</span>
                                <span className="text-xl font-bold text-gray-900">{formatPrice(totalDue)}</span>
                              </div>
                            </div>
                          )
                        })()}
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

                {(() => {
                  const serviceDetails = booking.service_details || {}
                  const quoteBreakdown = serviceDetails.breakdown || {}
                  
                  // Recalculate breakdown to show how Base Price is composed
                  const getBreakdownValue = (keys: string[], defaultValue = 0) => {
                    for (const key of keys) {
                      const value = quoteBreakdown[key]
                      if (value !== undefined && value !== null && value !== '' && value !== 0 && !Array.isArray(value) && typeof value !== 'object') {
                        const isCentsKey = key.toLowerCase().endsWith('_cents') || key.toLowerCase().endsWith('Cents')
                        if (isCentsKey) {
                          const numValue = typeof value === 'number' ? value : parseFloat(String(value))
                          if (!isNaN(numValue)) return Math.round(numValue)
                        } else {
                          let dollarValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : 0)
                          if (!isNaN(dollarValue) && dollarValue > 0) return Math.round(dollarValue * 100)
                        }
                      }
                    }
                    return defaultValue
                  }
                  
                  const baseHourlyCalc = getBreakdownValue(['base_hourly', 'baseHourly', 'base_hourly_cents', 'basePrice', 'base_price_cents']) || booking.base_price_cents || 0
                  const hourlyRateCents = booking.hourly_rate_cents || serviceDetails.hourly_rate_cents || 0
                  const moverTeamCalc = serviceDetails.mover_team || serviceDetails.crew_size || 2
                  const estimatedDurationCalc = booking.estimated_duration_hours || serviceDetails.estimated_duration_hours || 3
                  const baseHoursCalc = 3
                  const teamHourlyRateCents = baseHourlyCalc > 0 && baseHoursCalc > 0 ? Math.round(baseHourlyCalc / baseHoursCalc) : hourlyRateCents
                  
                  const packingCostCalc = getBreakdownValue(['packing', 'packingCost', 'packing_cost', 'packing_cost_cents'])
                  const stairsCostCalc = getBreakdownValue(['stairs', 'stairsCost', 'stairs_cost', 'stairs_cost_cents'])
                  const destinationFeeCalc = getBreakdownValue(['destination_fee', 'destinationFee', 'destination_fee_cents']) || (serviceDetails.destination_fee ? Math.round(parseFloat(String(serviceDetails.destination_fee)) * 100) : 0)
                  const insuranceCostCalc = getBreakdownValue(['insurance', 'insuranceCost', 'insurance_cost', 'insurance_cost_cents'])
                  const storageCostCalc = getBreakdownValue(['storage', 'storageCost', 'storage_cost', 'storage_cost_cents'])
                  
                  // Calculate heavy items
                  let heavyItemsCostCalc = 0
                  if (quoteBreakdown.heavy_items && Array.isArray(quoteBreakdown.heavy_items)) {
                    heavyItemsCostCalc = quoteBreakdown.heavy_items.reduce((sum: number, item: any) => {
                      if (item && typeof item === 'object') {
                        if (item.price_cents !== undefined) return sum + Math.round(item.price_cents)
                        if (item.price !== undefined) {
                          const priceValue = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0
                          return sum + Math.round(priceValue * 100)
                        }
                      }
                      return sum
                    }, 0)
                  }
                  
                  const additionalHoursCost = estimatedDurationCalc > baseHoursCalc ? (teamHourlyRateCents * (estimatedDurationCalc - baseHoursCalc)) : 0
                  
                  const breakdownSubtotalCalc = 
                    baseHourlyCalc +
                    additionalHoursCost +
                    (destinationFeeCalc || 0) +
                    (heavyItemsCostCalc || 0) +
                    (packingCostCalc || 0) +
                    (stairsCostCalc || 0) +
                    (storageCostCalc || 0) +
                    (insuranceCostCalc || 0)
                  
                  // Don't show duplicate Total Due here - it's shown in the breakdown section above
                  return null
                })()}
                {/* Removed duplicate Total line; Total Due is shown above */}
                {invoices.length === 0 && isProvider && booking.booking_status === 'completed' && (
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 mt-4"
                    onClick={() => router.push(`/dashboard/invoices/new?bookingId=${booking.id}`)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
                {/* Open in Calendar */}
                <Button 
                  variant="outline"
                  className="w-full mt-2 border-2 border-gray-800 hover:bg-gray-900 hover:text-white"
                  onClick={() => {
                    const d = booking.requested_date || (booking.service_details?.scheduled_date) || ''
                    const dateOnly = typeof d === 'string' ? d.split('T')[0] : ''
                    router.push(`/dashboard/bookings?date=${encodeURIComponent(dateOnly)}&open=${booking.id}`)
                  }}
                >
                  Open in Calendar
                </Button>
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

      {/* Chat Modal */}
      {isProvider && booking.customer_id && (
        <MessageModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          recipientId={booking.customer_id}
          recipientName={booking.customer?.full_name || 'Customer'}
          recipientAvatar={booking.customer?.avatar_url ?? undefined}
          onMessageSent={() => {
            // Refresh messages or show success
            setToast({
              show: true,
              message: 'Message sent successfully!',
              type: 'success'
            })
          }}
        />
      )}
    </div>
  )
}
