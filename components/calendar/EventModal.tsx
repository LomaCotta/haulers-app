'use client'

import { X, MapPin, Clock, DollarSign, Users, Phone, Mail, Calendar, PackageSearch, ExternalLink, Truck, Home, TrendingUp, ShoppingBag, Package } from 'lucide-react'
import { CalendarEvent } from './ModernCalendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EventModalProps {
  event: CalendarEvent | null
  onClose: () => void
}

export function EventModal({ event, onClose }: EventModalProps) {
  const router = useRouter()
  
  if (!event) return null

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-indigo-600 text-white'
      case 'in_progress':
        return 'bg-blue-600 text-white'
      case 'completed':
        return 'bg-emerald-600 text-white'
      case 'cancelled':
        return 'bg-gray-400 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const formatPrice = (cents?: number) => {
    if (!cents) return '$0.00'
    return `$${(cents / 100).toFixed(2)}`
  }

  const handleViewDetails = () => {
    if (event.metadata?.bookingId) {
      router.push(`/dashboard/bookings/${event.metadata.bookingId}`)
      onClose()
    }
  }

  // Pull the freshest booking details (same as manage page) when a bookingId exists
  const supabase = createClient()
  const [liveBooking, setLiveBooking] = useState<any>(event.metadata?.booking || null)
  const [liveServiceDetails, setLiveServiceDetails] = useState<any>(event.metadata?.serviceDetails || {})
  const [loadingFresh, setLoadingFresh] = useState<boolean>(false)

  useEffect(() => {
    const fetchFresh = async () => {
      if (!event?.metadata?.bookingId) return
      try {
        setLoadingFresh(true)
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', event.metadata.bookingId)
          .maybeSingle()
        if (data) {
          setLiveBooking(data)
          let sd = data.service_details || {}
          // If breakdown missing but we have a quote id, enrich like the manage page
          const quoteId = sd.quote_id || sd.quoteId
          if ((!sd.breakdown || Object.keys(sd.breakdown || {}).length === 0) && quoteId) {
            const { data: quote } = await supabase
              .from('movers_quotes')
              .select('breakdown, crew_size')
              .eq('id', quoteId)
              .maybeSingle()
            if (quote?.breakdown) {
              sd = {
                ...sd,
                breakdown: quote.breakdown,
                mover_team: sd.mover_team || sd.crew_size || quote.crew_size || 2,
              }
            }
          }
          setLiveServiceDetails(sd)
        }
      } finally {
        setLoadingFresh(false)
      }
    }
    fetchFresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.metadata?.bookingId])

  // Use freshest data available
  const serviceDetails = liveServiceDetails || {}
  const booking = liveBooking || {}

  // Helpers
  const formatAddress = (addr: any): string => {
    if (!addr) return ''
    if (typeof addr === 'string') return addr
    if (typeof addr === 'object') {
      const street = addr.address || addr.street || ''
      const apt = addr.aptSuite || addr.apt_suite || ''
      const city = addr.city || addr.city_name || ''
      const state = addr.state || addr.state_name || ''
      const zip = addr.zip || addr.zip_code || addr.postal_code || ''
      return [street, apt, city, state, zip].filter(Boolean).join(', ').replace(/,\s*,/g, ', ')
    }
    return String(addr)
  }

  // Build concise price breakdown (mirrors booking details page logic)
  const breakdown = serviceDetails.breakdown || {}
  const centsFrom = (value: any): number => {
    if (value === undefined || value === null) return 0
    if (typeof value === 'number') return Math.round(value * 100)
    const parsed = parseFloat(String(value).replace(/[$,]/g, ''))
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }
  const getBreakdownValue = (keys: string[]): number => {
    for (const k of keys) {
      const v = breakdown[k]
      if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') {
        const isCentsKey = k.toLowerCase().includes('cents') || k.endsWith('_cents')
        if (isCentsKey) {
          const num = typeof v === 'number' ? v : parseFloat(String(v))
          return isNaN(num) ? 0 : Math.round(num)
        }
        return centsFrom(v)
      }
    }
    return 0
  }
  const baseHours = 3
  const moverTeam = serviceDetails.mover_team || serviceDetails.crew_size || breakdown.mover_team || 2
  const estimatedDuration = booking.estimated_duration_hours || serviceDetails.estimated_duration_hours || 3
  // Per-mover hourly
  const perMoverRateCents = booking.hourly_rate_cents 
    || serviceDetails.hourly_rate_cents 
    || (serviceDetails.hourly_rate ? Math.round(parseFloat(String(serviceDetails.hourly_rate)) * 100) : 0)
  // Team hourly = per-mover * team size (fallback: derive from base_hourly if provided)
  let teamHourlyRateCents = perMoverRateCents && moverTeam ? perMoverRateCents * moverTeam : 0
  const baseHourlyFromBreakdown = getBreakdownValue(['base_hourly', 'baseHourly', 'base_hourly_cents'])
  if (!teamHourlyRateCents && baseHourlyFromBreakdown > 0) {
    teamHourlyRateCents = Math.round(baseHourlyFromBreakdown / baseHours)
  }
  // Base payment (3-hour minimum) - derive from per-mover×movers or explicit base_hourly; if missing, back-solve from totals
  let baseHourly = teamHourlyRateCents > 0 ? Math.round(teamHourlyRateCents * baseHours) : baseHourlyFromBreakdown
  // Additional hours
  // Additional hours are not billed unless provider confirms
  const additionalHoursCents = (serviceDetails.bill_additional === true && estimatedDuration > baseHours && teamHourlyRateCents > 0)
    ? Math.round(teamHourlyRateCents * (estimatedDuration - baseHours))
    : 0
  
  // Destination / trip
  let destinationFee = getBreakdownValue(['destination_fee', 'destinationFee', 'destination_fee_cents'])
  if (!destinationFee && serviceDetails.destination_fee) {
    const fee = typeof serviceDetails.destination_fee === 'number' ? serviceDetails.destination_fee : parseFloat(String(serviceDetails.destination_fee).replace(/[$,]/g, ''))
    if (!isNaN(fee) && fee > 0) destinationFee = fee > 100 ? Math.round(fee) : Math.round(fee * 100)
  }
  const tripDistance = serviceDetails.trip_distance_miles || serviceDetails.trip_distances?.distance || 0
  const tripDuration = serviceDetails.trip_distance_duration || serviceDetails.trip_distances?.duration || 0
  const doubleDriveTime = serviceDetails.double_drive_time || breakdown.double_drive_time || false
  
  // Heavy items
  let heavyItemsCents = 0
  const heavyItems = Array.isArray(serviceDetails.heavy_items) ? serviceDetails.heavy_items : []
  if (heavyItems.length > 0) {
    heavyItemsCents = heavyItems.reduce((sum: number, it: any) => sum + ((it?.price_cents || 0) * (it?.count || 1)), 0)
  } else if (breakdown.heavy_items) {
    heavyItemsCents = centsFrom(breakdown.heavy_items)
  }
  
  // Packing / stairs / storage / insurance
  const packingHelp = serviceDetails.packing_help || serviceDetails.packing || 'none'
  const packingRooms = packingHelp === 'none' ? 0 : (serviceDetails.packing_rooms || breakdown.packing_rooms || 0)
  const packingCents = packingHelp !== 'none' ? getBreakdownValue(['packing', 'packingCost', 'packing_cost', 'packing_cost_cents']) : 0
  const stairsFlights = serviceDetails.stairs_flights || 0
  const stairsCents = stairsFlights > 0 ? getBreakdownValue(['stairs', 'stairsCost', 'stairs_cost', 'stairs_cost_cents']) : 0
  const storageCents = getBreakdownValue(['storage', 'storageCost', 'storage_cost', 'storage_cost_cents'])
  const insuranceCents = getBreakdownValue(['insurance', 'insuranceCost', 'insurance_cost', 'insurance_cost_cents'])
  
  let breakdownSubtotal = baseHourly + additionalHoursCents + destinationFee + heavyItemsCents + packingCents + stairsCents + (storageCents > 0 ? storageCents : 0) + (insuranceCents > 0 ? insuranceCents : 0)
  const addlFees = booking.additional_fees_cents || 0
  const itemsTotal = 0 // keep simple in modal
  let totalDue = breakdownSubtotal + addlFees + itemsTotal

  // If hourly info is missing and baseHourly is zero, back-solve base from known totals
  if (teamHourlyRateCents === 0 || baseHourly === 0) {
    const knownFees = destinationFee + heavyItemsCents + packingCents + stairsCents + (storageCents > 0 ? storageCents : 0) + (insuranceCents > 0 ? insuranceCents : 0)
    // Prefer booking.total_price_cents when present
    const bookedTotal = typeof booking.total_price_cents === 'number' && booking.total_price_cents > 0
      ? booking.total_price_cents
      : totalDue
    const derivedBase = Math.max(0, bookedTotal - addlFees - itemsTotal - knownFees)
    if (derivedBase > 0) {
      baseHourly = derivedBase
      teamHourlyRateCents = Math.round(baseHourly / baseHours)
      // Recompute subtotal/total with derived base
      breakdownSubtotal = baseHourly + additionalHoursCents + knownFees
      totalDue = breakdownSubtotal + addlFees + itemsTotal
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
        {/* Invoice-Style Header */}
        <div className="border-b-2 border-gray-900 bg-white px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                {event.title}
              </h2>
              <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Date:</span>
                  <span>{new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                {event.status && (
                  <Badge className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeColor(event.status)}`}>
                    {event.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors ml-4"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Invoice-Style Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {/* Key Information - Table Style */}
            <div className="border-b border-gray-200 pb-6">
              <table className="w-full border-collapse">
                <tbody className="space-y-3">
                  {event.time && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide w-32">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Time
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900 font-medium">{event.time}</td>
                    </tr>
                  )}
                  
                  {event.metadata?.customer && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Customer
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900 font-medium">{event.metadata.customer}</td>
                    </tr>
                  )}

                  {event.metadata?.business && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {event.metadata.isCustomerBooking ? 'Service Provider' : 'Business'}
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900 font-medium">{event.metadata.business}</td>
                    </tr>
                  )}

                  {(event.metadata?.address || serviceDetails.from_address || serviceDetails.pickup_addresses) && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide align-top">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Address
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900">
                        {formatAddress(event.metadata?.address || serviceDetails.from_address || (Array.isArray(serviceDetails.pickup_addresses) ? serviceDetails.pickup_addresses[0] : ''))}
                      </td>
                    </tr>
                  )}

                  {(event.metadata?.city || event.metadata?.state) && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900">
                        {event.metadata.city && event.metadata.state 
                          ? `${event.metadata.city}, ${event.metadata.state}`
                          : event.metadata.city || event.metadata.state || 'N/A'}
                      </td>
                    </tr>
                  )}

                  {totalDue > 0 && (
                    <tr className="border-b-2 border-gray-900">
                      <td className="py-4 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Total Price
                        </div>
                      </td>
                      <td className="py-4 text-xl font-bold text-gray-900">{formatPrice(totalDue)}</td>
                    </tr>
                  )}

                  {event.metadata?.crewSize && (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Crew Size
                        </div>
                      </td>
                      <td className="py-3 text-base text-gray-900">{event.metadata.crewSize} movers</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Service Details Section - If Available */}
            {serviceDetails && typeof serviceDetails === 'object' && Object.keys(serviceDetails).length > 0 && (
              <div className="pt-6 border-t-2 border-gray-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Service Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {serviceDetails.team_size && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Team Size</div>
                        <div className="text-sm font-semibold text-gray-900">{serviceDetails.team_size}</div>
                      </div>
                    </div>
                  )}
                  
                  {serviceDetails.move_size && (
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Move Size</div>
                        <div className="text-sm font-semibold text-gray-900">{serviceDetails.move_size}</div>
                      </div>
                    </div>
                  )}

                  {serviceDetails.heavy_items && (
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Heavy Items</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {(() => {
                            // CRITICAL: Handle heavy_items as array, object, number, or boolean
                            const heavyItems = serviceDetails.heavy_items
                            
                            // If it's an array of objects, display count and total
                            if (Array.isArray(heavyItems) && heavyItems.length > 0) {
                              const validItems = heavyItems.filter((item: any) => item && typeof item === 'object')
                              if (validItems.length > 0) {
                                const totalCount = validItems.reduce((sum: number, item: any) => sum + (item.count || 0), 0)
                                const totalCost = validItems.reduce((sum: number, item: any) => {
                                  const priceCents = item.price_cents || 0
                                  const count = item.count || 1
                                  return sum + ((priceCents * count) / 100)
                                }, 0)
                                return `${validItems.length} item${validItems.length !== 1 ? 's' : ''} (${totalCount} total) - $${totalCost.toFixed(2)}`
                              }
                            }
                            
                            // If it's a number, treat it as cost
                            if (typeof heavyItems === 'number' && heavyItems > 0) {
                              return `$${heavyItems.toFixed(2)}`
                            }
                            
                            // If it's a boolean, show Yes/No
                            if (typeof heavyItems === 'boolean') {
                              return heavyItems ? 'Yes' : 'No'
                            }
                            
                            // If it's a string, show as is
                            if (typeof heavyItems === 'string') {
                              return heavyItems
                            }
                            
                            // If it's an object (not an array), try to extract meaningful info
                            if (typeof heavyItems === 'object' && heavyItems !== null) {
                              const count = (heavyItems as any).count || 0
                              const band = (heavyItems as any).band || ''
                              if (count > 0 || band) {
                                return `${count || ''} ${band || 'items'}`.trim()
                              }
                            }
                            
                            // Fallback
                            return String(heavyItems)
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {serviceDetails.stairs && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Stairs</div>
                        <div className="text-sm font-semibold text-gray-900">{serviceDetails.stairs === true ? 'Yes' : serviceDetails.stairs}</div>
                      </div>
                    </div>
                  )}

                  {serviceDetails.packing_help && (
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Packing Help</div>
                        <div className="text-sm font-semibold text-gray-900">{serviceDetails.packing_help === true ? 'Yes' : serviceDetails.packing_help}</div>
                      </div>
                    </div>
                  )}
                </div>

                {serviceDetails.customer_notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer Notes</div>
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{serviceDetails.customer_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Booking Type Indicator */}
            {event.metadata?.isCustomerBooking !== undefined && (
              <div className="pt-6 border-t-2 border-gray-200">
                <div className={`p-4 rounded-lg border-2 ${
                  event.metadata.isCustomerBooking 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      event.metadata.isCustomerBooking ? 'bg-blue-600' : 'bg-orange-600'
                    }`}>
                      {event.metadata.isCustomerBooking ? '📥' : '📤'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {event.metadata.isCustomerBooking ? 'Service You Ordered' : 'Service Requested From You'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {event.metadata.isCustomerBooking 
                          ? 'This is a service you ordered from another provider.'
                          : 'This is a service request from a customer.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Invoice Summary</h4>
                  <div className="space-y-2 text-sm">
                    {baseHourly > 0 && (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Base Payment: {baseHours} hours @ {formatPrice(teamHourlyRateCents)}/hour</div>
                          <div className="text-xs text-gray-600 mt-0.5">{moverTeam} {moverTeam === 1 ? 'mover' : 'movers'} @ {formatPrice(Math.round(teamHourlyRateCents / Math.max(moverTeam,1)))} per mover/hour</div>
                        </div>
                        <div className="font-bold text-gray-900 ml-4">{formatPrice(baseHourly)}</div>
                      </div>
                    )}
                    {estimatedDuration > baseHours && (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">Additional Hours: {estimatedDuration - baseHours} {estimatedDuration - baseHours === 1 ? 'hour' : 'hours'} @ {formatPrice(teamHourlyRateCents)}/hour</div>
                          <div className="text-xs text-gray-600 mt-0.5">{moverTeam} {moverTeam === 1 ? 'mover' : 'movers'}</div>
                          {additionalHoursCents === 0 && (
                            <div className="text-xs text-orange-600 mt-0.5">Not billed until provider confirms at job completion</div>
                          )}
                        </div>
                        <div className={`font-bold ml-4 ${additionalHoursCents > 0 ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{formatPrice(additionalHoursCents || Math.round(teamHourlyRateCents * Math.max(0, estimatedDuration - baseHours)))}</div>
                      </div>
                    )}
                    {(tripDistance > 0 || doubleDriveTime) && (
                      <div className="text-xs text-gray-600">Trip: {tripDistance?.toFixed ? tripDistance.toFixed(1) : tripDistance} miles{tripDuration ? ` (${Math.round(tripDuration)} min)` : ''}{doubleDriveTime ? ' • Double Drive Time' : ''}</div>
                    )}
                    {destinationFee > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="text-gray-700">Destination Fee</div>
                        <div className="font-semibold text-gray-900">{formatPrice(destinationFee)}</div>
                      </div>
                    )}
                    {heavyItemsCents > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="text-gray-700">Heavy Items</div>
                        <div className="font-semibold text-gray-900">{formatPrice(heavyItemsCents)}</div>
                      </div>
                    )}
                    {packingCents >= 0 && (
                      <div className="flex items-center justify-between">
                        <div className="text-gray-700">Packing{packingRooms ? ` • ${packingRooms} room${packingRooms === 1 ? '' : 's'}` : ''}</div>
                        <div className="font-semibold text-gray-900">{formatPrice(packingCents)}</div>
                      </div>
                    )}
                    {stairsCents >= 0 && (
                      <div className="flex items-center justify-between">
                        <div className="text-gray-700">Stairs{stairsFlights ? ` • ${stairsFlights} ${stairsFlights === 1 ? 'flight' : 'flights'}` : ''}</div>
                        <div className="font-semibold text-gray-900">{formatPrice(stairsCents)}</div>
                      </div>
                    )}
                    {(storageCents > 0 || insuranceCents > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        {storageCents > 0 && (<div className="flex items-center justify-between"><span className="text-gray-700">Storage</span><span className="font-semibold text-gray-900">{formatPrice(storageCents)}</span></div>)}
                        {insuranceCents > 0 && (<div className="flex items-center justify-between"><span className="text-gray-700">Insurance</span><span className="font-semibold text-gray-900">{formatPrice(insuranceCents)}</span></div>)}
                      </div>
                    )}
                    <div className="border-t border-gray-300 mt-2 pt-2 flex items-center justify-between">
                      <div className="text-base font-bold text-gray-900">Total Due</div>
                      <div className="text-xl font-bold text-gray-900">{formatPrice(totalDue)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice-Style Footer with Actions */}
        <div className="border-t-2 border-gray-900 bg-gray-50 px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {event.metadata?.bookingId && (
              <span className="font-mono text-xs">Booking ID: {event.id.slice(0, 8)}...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {event.metadata?.bookingId && (
              <Button
                onClick={handleViewDetails}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2.5"
              >
                <PackageSearch className="w-4 h-4 mr-2" />
                View Full Details
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="border-2 border-gray-800 hover:bg-gray-900 hover:text-white font-semibold px-6 py-2.5"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
