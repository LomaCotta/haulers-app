'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ErrorDialog } from '@/components/ui/error-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface Booking {
  id: string
  booking_status: string
  total_price_cents: number
  customer_id: string
  business_id?: string
  customer?: {
    full_name: string
    email: string
  }
  booking_items?: Array<{
    id: string
    item_name: string
    quantity: number
    unit_price_cents: number
    total_price_cents: number
  }>
}

interface InvoiceItem {
  description: string
  quantity: number
  unit_price_cents: number
  item_type: string
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [businessId, setBusinessId] = useState<string>('')
  const [loadingBooking, setLoadingBooking] = useState(false)
  const [error, setError] = useState<{ title: string; message: string; details?: string } | null>(null)
  
  // Form state
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')
  const [invoiceType, setInvoiceType] = useState<string>('one_time')
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>('')
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30)
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<InvoiceItem[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Get user's business
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      if (!businesses || businesses.length === 0) {
        router.push('/dashboard/businesses')
        return
      }

      setBusinessId(businesses[0].id)

      // Load bookings that can be invoiced
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, phone),
          booking_items:booking_items(*)
        `)
        .eq('business_id', businesses[0].id)
        .eq('booking_status', 'completed')
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false })

      setBookings(bookingsData || [])

      // If bookingId is in URL, load that specific booking
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const bookingIdParam = params.get('bookingId')
        if (bookingIdParam) {
          await loadBookingForInvoice(bookingIdParam, businesses[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookingForInvoice = async (bookingId: string, businessIdParam?: string) => {
    try {
      setLoadingBooking(true)
      const supabase = createClient()
      
      // Set selectedBookingId immediately
      setSelectedBookingId(bookingId)
      
      // Load the specific booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, phone),
          business:businesses!business_id(id, name, owner_id),
          booking_items:booking_items(*)
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError || !booking) {
        console.error('Error loading booking:', bookingError)
        setError({
          title: 'Error Loading Booking',
          message: bookingError?.message || 'Booking not found',
          details: bookingError?.details || bookingError?.hint || undefined
        })
        setLoadingBooking(false)
        return
      }

      // Set businessId - use from booking if not provided, or verify ownership
      const bookingBusinessId = booking.business_id || businessIdParam
      if (bookingBusinessId) {
        setBusinessId(bookingBusinessId)
      }

      // Auto-populate items from booking
      if (booking.booking_items && booking.booking_items.length > 0) {
        setItems(booking.booking_items.map((item: any) => ({
          description: item.item_name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          item_type: 'service'
        })))
      } else {
        // Add base item from booking total
        setItems([{
          description: 'Service Charge',
          quantity: 1,
          unit_price_cents: booking.total_price_cents || 0,
          item_type: 'service'
        }])
      }

      // Add booking to list if not already there
      setBookings(prev => {
        const exists = prev.find(b => b.id === booking.id)
        if (!exists) {
          return [...prev, booking as any]
        }
        return prev
      })
    } catch (error) {
      console.error('Error loading booking for invoice:', error)
      setError({
        title: 'Error Loading Booking',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      })
    } finally {
      setLoadingBooking(false)
    }
  }

  useEffect(() => {
    // Load booking data when selectedBookingId changes
    if (selectedBookingId) {
      const booking = bookings.find(b => b.id === selectedBookingId)
      if (booking) {
        // Auto-populate items from booking
        if (booking.booking_items && booking.booking_items.length > 0) {
          setItems(booking.booking_items.map(item => ({
            description: item.item_name,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            item_type: 'service'
          })))
        } else {
          // Add base item from booking total
          setItems([{
            description: 'Service Charge',
            quantity: 1,
            unit_price_cents: booking.total_price_cents,
            item_type: 'service'
          }])
        }
      }
    }
  }, [selectedBookingId, bookings])

  const handleBookingSelect = (bookingId: string) => {
    // Handle "none" value which means no booking selected
    setSelectedBookingId(bookingId === 'none' ? '' : bookingId)
  }

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price_cents: 0,
      item_type: 'service'
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    // Wait for booking to finish loading if it's loading
    if (loadingBooking) {
      alert('Please wait for the booking to finish loading...')
      return
    }

    if (!businessId || items.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to create an invoice')
        setSubmitting(false)
        return
      }

      // Get booking info if selected
      let customerIdToUse: string | null = null
      let finalBusinessId = businessId
      
      if (selectedBookingId) {
        // Try to find in existing bookings array first
        let booking = bookings.find(b => b.id === selectedBookingId)
        
        if (!booking) {
          // Load booking directly from database
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('customer_id, business_id, total_price_cents')
            .eq('id', selectedBookingId)
            .single()
          
          if (bookingError || !bookingData) {
            console.error('Error loading booking:', bookingError)
            alert(`Error loading booking: ${bookingError?.message || 'Booking not found'}`)
            setSubmitting(false)
            return
          }
          
          booking = bookingData as any
          customerIdToUse = bookingData.customer_id
          
          if (!finalBusinessId && bookingData.business_id) {
            finalBusinessId = bookingData.business_id
            setBusinessId(bookingData.business_id)
          }
        } else {
          customerIdToUse = booking.customer_id
          if (!finalBusinessId && booking.business_id) {
            finalBusinessId = booking.business_id
          }
        }
      }

      // Validate required fields
      const finalBusinessIdValue = finalBusinessId || businessId
      
      if (!finalBusinessIdValue) {
        alert('Business ID is required. Please ensure you own a business or select a booking.')
        setSubmitting(false)
        return
      }

      if (!customerIdToUse && selectedBookingId) {
        alert('Could not determine customer ID from booking. Please try again or contact support.')
        setSubmitting(false)
        return
      }

      // If no booking selected, we need customerId
      if (!customerIdToUse) {
        alert('Customer ID is required. Please select a booking or provide customer details.')
        setSubmitting(false)
        return
      }
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId || null,
          businessId: finalBusinessIdValue,
          customerId: customerIdToUse,
          invoiceType,
          issueDate,
          dueDate: dueDate || null,
          paymentTermsDays,
          notes,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price_cents: Math.round(parseFloat(item.unit_price_cents.toString())),
            item_type: item.item_type
          }))
        })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/invoices/${data.id}`)
      } else {
        alert(data.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.unit_price_cents * item.quantity)
    }, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  return (
    <>
      <ErrorDialog
        open={!!error}
        onOpenChange={(open) => !open && setError(null)}
        title={error?.title || 'Error'}
        message={error?.message || ''}
        details={error?.details}
        onConfirm={() => setError(null)}
      />
      <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-200">
            <CardTitle className="text-2xl font-bold">Create New Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Booking Selection */}
            {bookings.length > 0 && (
              <div>
                <Label htmlFor="booking">Link to Booking (Optional)</Label>
                <Select value={selectedBookingId || 'none'} onValueChange={handleBookingSelect}>
                  <SelectTrigger id="booking">
                    <SelectValue placeholder="Select a booking..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Create Standalone Invoice</SelectItem>
                    {bookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.customer?.full_name || 'Customer'} - {formatPrice(booking.total_price_cents)} - {booking.booking_status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Linking to a booking will auto-populate customer and items
                </p>
              </div>
            )}

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger id="invoiceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                <Input
                  id="paymentTerms"
                  type="number"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 30)}
                  min="0"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Invoice Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-4">No items added yet</p>
                  <Button variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="md:col-span-2">
                            <Label htmlFor={`item-${index}-desc`}>Description *</Label>
                            <Input
                              id={`item-${index}-desc`}
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`item-${index}-qty`}>Quantity</Label>
                            <Input
                              id={`item-${index}-qty`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`item-${index}-price`}>Unit Price ($)</Label>
                            <Input
                              id={`item-${index}-price`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={(item.unit_price_cents / 100).toFixed(2)}
                              onChange={(e) => updateItem(index, 'unit_price_cents', Math.round(parseFloat(e.target.value) * 100))}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label>Total</Label>
                              <div className="h-10 flex items-center font-semibold text-gray-900">
                                {formatPrice(item.unit_price_cents * item.quantity)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(calculateTotal())}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the customer..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/invoices')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || items.length === 0 || !businessId}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}

