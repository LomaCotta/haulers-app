'use client'

import { X, MapPin, Clock, DollarSign, Users, Phone, Mail, Calendar, PackageSearch, ExternalLink, Truck, Home, TrendingUp, ShoppingBag, Package } from 'lucide-react'
import { CalendarEvent } from './ModernCalendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

  // Parse service details if available
  const serviceDetails = event.metadata?.serviceDetails || {}
  const booking = event.metadata?.booking || {}

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
                        {event.metadata.address || serviceDetails.from_address || 
                         (Array.isArray(serviceDetails.pickup_addresses) ? serviceDetails.pickup_addresses[0] : '')}
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

                  {event.metadata?.price !== undefined && event.metadata.price > 0 && (
                    <tr className="border-b-2 border-gray-900">
                      <td className="py-4 pr-8 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Total Price
                        </div>
                      </td>
                      <td className="py-4 text-xl font-bold text-gray-900">{formatPrice(event.metadata.price)}</td>
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
                        <div className="text-sm font-semibold text-gray-900">{serviceDetails.heavy_items === true ? 'Yes' : serviceDetails.heavy_items}</div>
                      </div>
                    </div>
                  )}

                  {serviceDetails.stairs && (
                    <div className="flex items-center gap-3">
                      <Stairs className="w-4 h-4 text-gray-400" />
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
