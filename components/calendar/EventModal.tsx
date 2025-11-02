'use client'

import { X, MapPin, Clock, DollarSign, Users, Phone, Mail, Calendar } from 'lucide-react'
import { CalendarEvent } from './ModernCalendar'

interface EventModalProps {
  event: CalendarEvent | null
  onClose: () => void
}

export function EventModal({ event, onClose }: EventModalProps) {
  if (!event) return null

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-purple-100 text-purple-800 border-purple-300'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-gray-200 flex items-start justify-between rounded-t-2xl">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{event.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              {event.status && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(event.status)}`}>
                  {event.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {event.time && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Time</div>
                <div className="text-gray-700">{event.time}</div>
              </div>
            </div>
          )}

          {event.metadata?.customer && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Customer</div>
                <div className="text-gray-700">{event.metadata.customer}</div>
              </div>
            </div>
          )}

          {event.metadata?.address && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Address</div>
                <div className="text-gray-700">{event.metadata.address}</div>
              </div>
            </div>
          )}

          {event.metadata?.price !== undefined && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <DollarSign className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Price</div>
                <div className="text-gray-700">${(event.metadata.price / 100).toFixed(2)}</div>
              </div>
            </div>
          )}

          {event.metadata?.crewSize && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Crew Size</div>
                <div className="text-gray-700">{event.metadata.crewSize} movers</div>
              </div>
            </div>
          )}

          {event.metadata?.timeSlot && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Time Slot</div>
                <div className="text-gray-700 capitalize">{event.metadata.timeSlot}</div>
              </div>
            </div>
          )}

          {event.metadata?.serviceType && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Service Type</div>
                <div className="text-gray-700 capitalize">{event.metadata.serviceType.replace('_', ' ')}</div>
              </div>
            </div>
          )}

          {(event.metadata?.city || event.metadata?.state) && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Location</div>
                <div className="text-gray-700">
                  {event.metadata.city && event.metadata.state 
                    ? `${event.metadata.city}, ${event.metadata.state}`
                    : event.metadata.city || event.metadata.state || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {event.metadata?.business && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{event.metadata.isCustomerBooking ? 'Service Provider' : 'Business'}</div>
                <div className="text-gray-700">{event.metadata.business}</div>
              </div>
            </div>
          )}

          {event.metadata?.isCustomerBooking !== undefined && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 flex items-center justify-center">
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
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}



