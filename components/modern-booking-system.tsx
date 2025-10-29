'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  CheckCircle,
  Star,
  DollarSign,
  Zap,
  Timer,
  Shield,
  Award
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BookingFormData {
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  requested_date: string
  requested_time: string
  service_address: string
  service_city: string
  service_state: string
  service_postal_code: string
  special_requirements: string
  customer_notes: string
  preferred_contact_method: 'phone' | 'email' | 'sms'
  estimated_duration_hours: number
  base_price_cents: number
  hourly_rate_cents: number
  total_price_cents: number
}

interface ModernBookingSystemProps {
  businessId: string
  businessName: string
  baseRateCents: number
  hourlyRateCents: number
  serviceTypes: string[]
  onBookingSuccess?: (bookingId: string) => void
}

export default function ModernBookingSystem({
  businessId,
  businessName,
  baseRateCents,
  hourlyRateCents,
  serviceTypes,
  onBookingSuccess
}: ModernBookingSystemProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<BookingFormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: '',
    requested_date: '',
    requested_time: '',
    service_address: '',
    service_city: '',
    service_state: '',
    service_postal_code: '',
    special_requirements: '',
    customer_notes: '',
    preferred_contact_method: 'phone',
    estimated_duration_hours: 1,
    base_price_cents: baseRateCents,
    hourly_rate_cents: hourlyRateCents,
    total_price_cents: baseRateCents
  })

  const supabase = createClient()

  const updateFormData = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Recalculate total price when duration or rates change
      if (field === 'estimated_duration_hours' || field === 'hourly_rate_cents') {
        updated.total_price_cents = updated.base_price_cents + (updated.hourly_rate_cents * updated.estimated_duration_hours)
      }
      
      return updated
    })
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Please log in to make a booking')
      }

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          business_id: businessId,
          customer_id: user.id,
          service_type: formData.service_type,
          requested_date: formData.requested_date,
          requested_time: formData.requested_time,
          estimated_duration_hours: formData.estimated_duration_hours,
          service_address: formData.service_address,
          service_city: formData.service_city,
          service_state: formData.service_state,
          service_postal_code: formData.service_postal_code,
          base_price_cents: formData.base_price_cents,
          hourly_rate_cents: formData.hourly_rate_cents,
          total_price_cents: formData.total_price_cents,
          special_requirements: formData.special_requirements,
          customer_notes: formData.customer_notes,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          preferred_contact_method: formData.preferred_contact_method,
          booking_status: 'pending',
          priority: 'normal',
          source: 'web'
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      setBookingId(booking.id)
      setSuccess(true)
      onBookingSuccess?.(booking.id)
      
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Your booking request has been sent to {businessName}. 
              They will contact you within 24 hours to confirm details.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                <strong>Booking ID:</strong> {bookingId}
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => window.location.reload()}
              >
                Make Another Booking
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardTitle className="text-2xl font-bold">Book with {businessName}</CardTitle>
          <CardDescription className="text-blue-100">
            Step {step} of 3 - Complete your booking request
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          {/* Progress Bar */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= stepNumber 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Service Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Service Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <Select value={formData.service_type} onValueChange={(value) => updateFormData('service_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.requested_date}
                    onChange={(e) => updateFormData('requested_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time *
                  </label>
                  <Input
                    type="time"
                    value={formData.requested_time}
                    onChange={(e) => updateFormData('requested_time', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (hours)
                </label>
                <Select 
                  value={formData.estimated_duration_hours.toString()} 
                  onValueChange={(value) => updateFormData('estimated_duration_hours', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => (
                      <SelectItem key={hours} value={hours.toString()}>
                        {hours} {hours === 1 ? 'hour' : 'hours'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Pricing Estimate</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Base Rate:</span>
                    <span>{formatPrice(formData.base_price_cents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hourly Rate ({formData.estimated_duration_hours}h):</span>
                    <span>{formatPrice(formData.hourly_rate_cents * formData.estimated_duration_hours)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                    <span>Total Estimate:</span>
                    <span>{formatPrice(formData.total_price_cents)}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  * Final price may vary based on specific requirements
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => updateFormData('customer_name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => updateFormData('customer_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => updateFormData('customer_email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <Select 
                  value={formData.preferred_contact_method} 
                  onValueChange={(value: 'phone' | 'email' | 'sms') => updateFormData('preferred_contact_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Service Location & Notes */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Service Location & Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Address *
                </label>
                <Input
                  value={formData.service_address}
                  onChange={(e) => updateFormData('service_address', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <Input
                    value={formData.service_city}
                    onChange={(e) => updateFormData('service_city', e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <Input
                    value={formData.service_state}
                    onChange={(e) => updateFormData('service_state', e.target.value)}
                    placeholder="State"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <Input
                    value={formData.service_postal_code}
                    onChange={(e) => updateFormData('service_postal_code', e.target.value)}
                    placeholder="12345"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requirements
                </label>
                <Textarea
                  value={formData.special_requirements}
                  onChange={(e) => updateFormData('special_requirements', e.target.value)}
                  placeholder="Any special requirements or considerations..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <Textarea
                  value={formData.customer_notes}
                  onChange={(e) => updateFormData('customer_notes', e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Secure Booking
                </h4>
                <p className="text-sm text-green-800">
                  Your information is secure and will only be shared with the service provider. 
                  No payment is required until the service is confirmed.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Previous
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? 'Creating Booking...' : 'Complete Booking'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
