"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Star,
  DollarSign,
  Users,
  Truck,
  Home,
  Sparkles
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// Minimal toast fallback to avoid external dependency
const notify = {
  success: (msg: string) => (typeof window !== 'undefined' ? window.alert(msg) : console.log(msg)),
  error: (msg: string) => (typeof window !== 'undefined' ? window.alert(msg) : console.error(msg)),
}

interface BookingFormData {
  serviceType: string
  requestedDate: string
  requestedTime: string
  serviceAddress: string
  serviceCity: string
  serviceState: string
  servicePostalCode: string
  serviceDetails: Record<string, any>
  customerNotes: string
  customerPhone: string
  customerEmail: string
  specialRequirements: string[]
}

interface ServiceTemplate {
  id: string
  template_name: string
  template_description: string
  industry_category: string
  service_type: string
  base_price_cents: number
  hourly_rate_cents: number
  estimated_duration_hours: number
  service_config: Record<string, any>
  required_items: any[]
  optional_items: any[]
}

interface BookingSuccessData {
  booking_id: string
  total_price_cents: number
  estimated_duration_hours: number
  business_name: string
  service_type: string
  requested_date: string
  requested_time: string
}

interface BookingSystemProps {
  businessId: string
  businessName: string
  industryCategory: string
  onBookingSuccess?: (data: BookingSuccessData) => void
}

export function BookingSystem({ businessId, businessName, industryCategory, onBookingSuccess }: BookingSystemProps) {
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookingData, setBookingData] = useState<BookingSuccessData | null>(null)
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null)
  
  const [formData, setFormData] = useState<BookingFormData>({
    serviceType: '',
    requestedDate: '',
    requestedTime: '',
    serviceAddress: '',
    serviceCity: '',
    serviceState: '',
    servicePostalCode: '',
    serviceDetails: {},
    customerNotes: '',
    customerPhone: '',
    customerEmail: '',
    specialRequirements: []
  })

  const supabase = createClient()

  // Load service templates
  useEffect(() => {
    const loadServiceTemplates = async () => {
      const { data, error } = await supabase
        .from('service_templates')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('template_name')

      if (error) {
        console.error('Error loading service templates:', error)
        return
      }

      setServiceTemplates(data || [])
    }

    loadServiceTemplates()
  }, [businessId, supabase])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        notify.error('Please sign in to make a booking')
        return
      }

      // Prepare service details based on industry
      const serviceDetails = {
        ...formData.serviceDetails,
        industry_category: industryCategory,
        template_id: selectedTemplate?.id,
        special_requirements: formData.specialRequirements
      }

      // Call the booking creation function
      const { data, error } = await supabase.rpc('create_booking_with_validation', {
        p_business_id: businessId,
        p_customer_id: user.id,
        p_service_type: formData.serviceType,
        p_requested_date: formData.requestedDate,
        p_requested_time: formData.requestedTime,
        p_service_address: formData.serviceAddress,
        p_service_city: formData.serviceCity,
        p_service_state: formData.serviceState,
        p_service_postal_code: formData.servicePostalCode,
        p_service_details: serviceDetails,
        p_customer_notes: formData.customerNotes,
        p_customer_phone: formData.customerPhone,
        p_customer_email: formData.customerEmail
      })

      if (error) {
        console.error('Booking creation error:', error)
        notify.error('Failed to create booking. Please try again.')
        return
      }

      if (!data.success) {
        notify.error(data.error || 'Booking validation failed')
        return
      }

      // Success!
      const successData: BookingSuccessData = {
        booking_id: data.booking_id,
        total_price_cents: data.total_price_cents,
        estimated_duration_hours: data.estimated_duration_hours,
        business_name: businessName,
        service_type: formData.serviceType,
        requested_date: formData.requestedDate,
        requested_time: formData.requestedTime
      }

      setBookingData(successData)
      setShowSuccess(true)
      onBookingSuccess?.(successData)
      
      notify.success('Booking created successfully! 🎉')

    } catch (error) {
      console.error('Unexpected error:', error)
      notify.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = serviceTemplates.find(t => t.id === templateId)
    setSelectedTemplate(template || null)
    
    if (template) {
      setFormData(prev => ({
        ...prev,
        serviceType: template.service_type,
        serviceDetails: template.service_config
      }))
    }
  }

  // Handle special requirements
  const handleSpecialRequirementToggle = (requirement: string) => {
    setFormData(prev => ({
      ...prev,
      specialRequirements: prev.specialRequirements.includes(requirement)
        ? prev.specialRequirements.filter(r => r !== requirement)
        : [...prev.specialRequirements, requirement]
    }))
  }

  // Format price
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  // Success screen
  if (showSuccess && bookingData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed! 🎉</h2>
              <p className="text-green-700">
                Your booking with <strong>{bookingData.business_name}</strong> has been created successfully.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-lg mb-4">Booking Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{bookingData.service_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{new Date(bookingData.requested_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingData.requested_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{bookingData.estimated_duration_hours} hours</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-semibold">Total Price:</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatPrice(bookingData.total_price_cents)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• You'll receive a confirmation email shortly</li>
                  <li>• The business owner will review and confirm your booking</li>
                  <li>• You'll be notified once your booking is confirmed</li>
                  <li>• You can track your booking status in your dashboard</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => window.location.href = '/dashboard/bookings'}
                  className="flex-1"
                >
                  View My Bookings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSuccess(false)}
                  className="flex-1"
                >
                  Make Another Booking
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Booking form
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book a Service
          </CardTitle>
          <CardDescription>
            Book a service with <strong>{businessName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.template_name}</span>
                        <span className="text-sm text-gray-500">
                          {formatPrice(template.base_price_cents)} - {template.estimated_duration_hours}h
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-sm text-gray-600">{selectedTemplate.template_description}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedDate">Preferred Date *</Label>
                <Input
                  id="requestedDate"
                  type="date"
                  value={formData.requestedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestedDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedTime">Preferred Time *</Label>
                <Input
                  id="requestedTime"
                  type="time"
                  value={formData.requestedTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestedTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Service Address */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Service Location *</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Street Address"
                  value={formData.serviceAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceAddress: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="City"
                    value={formData.serviceCity}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceCity: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="State"
                    value={formData.serviceState}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceState: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={formData.servicePostalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, servicePostalCode: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            {selectedTemplate?.optional_items && selectedTemplate.optional_items.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Additional Services</Label>
                <div className="space-y-2">
                  {selectedTemplate.optional_items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`requirement-${index}`}
                        checked={formData.specialRequirements.includes(item.name)}
                        onCheckedChange={() => handleSpecialRequirementToggle(item.name)}
                      />
                      <Label htmlFor={`requirement-${index}`} className="flex-1">
                        <div className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="text-sm text-gray-500">
                            {formatPrice(item.unit_price_cents)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Contact Information</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="customerNotes">Additional Notes</Label>
              <Textarea
                id="customerNotes"
                placeholder="Any special instructions or requirements..."
                value={formData.customerNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Pricing Summary */}
            {selectedTemplate && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Pricing Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base Service:</span>
                    <span>{formatPrice(selectedTemplate.base_price_cents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Duration:</span>
                    <span>{selectedTemplate.estimated_duration_hours} hours</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Estimated Total:</span>
                    <span>{formatPrice(selectedTemplate.base_price_cents + (selectedTemplate.hourly_rate_cents * selectedTemplate.estimated_duration_hours))}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Final pricing may vary based on specific requirements and actual service duration.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading || !formData.serviceType || !formData.requestedDate || !formData.requestedTime}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Booking
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
