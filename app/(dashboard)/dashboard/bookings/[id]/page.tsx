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
  Edit
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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addingItem, setAddingItem] = useState(false)

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

      if (bookingError || !bookingData) {
        console.error('Booking error:', bookingError)
        return
      }

      const bookingObj = bookingData as Booking
      const userIsCustomer = bookingObj.customer_id === user.id
      const userIsProvider = bookingObj.business?.owner_id === user.id

      setIsCustomer(userIsCustomer)
      setIsProvider(userIsProvider)

      if (!userIsCustomer && !userIsProvider) {
        router.push('/dashboard/bookings')
        return
      }

      setBooking(bookingObj)

      // Load booking items
      const { data: items, error: itemsError } = await supabase
        .from('booking_items')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false })

      if (!itemsError && items) {
        setBookingItems(items as BookingItem[])
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

  const handleCreateInvoice = async () => {
    setSubmitting(true)
    try {
      const supabase = createClient()

      // Update booking status to ready for payment
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        alert('Failed to create invoice. Please try again.')
        return
      }

      // Refresh booking
      await loadBooking()
      setShowInvoiceDialog(false)
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice. Please try again.')
    } finally {
      setSubmitting(false)
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
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
              <p className="text-muted-foreground mb-4">This booking could not be found or you don't have access to it.</p>
              <Button onClick={() => router.push('/dashboard/bookings')}>Back to Bookings</Button>
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
                {isProvider ? `Order #${booking.id.slice(0, 8)}` : 'Track Your Order'}
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Service Location</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service_address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service_city}, {booking.service_state} {booking.service_postal_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Scheduled Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.requested_date), "PPP")} at {booking.requested_time}
                      </p>
                    </div>
                  </div>
                </div>

                {booking.customer_notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">Customer Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.customer_notes}</p>
                  </div>
                )}

                {isProvider && booking.business_notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">Internal Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.business_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Actions - Add Items */}
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

                    {booking.booking_status === 'confirmed' || booking.booking_status === 'in_progress' ? (
                      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-2 border-gray-800">
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Invoice
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Generate Invoice</DialogTitle>
                            <DialogDescription>
                              Create an invoice for this order. The customer will be able to view and pay it.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium">Subtotal:</span>
                                <span>{formatPrice(calculateSubtotal())}</span>
                              </div>
                              {bookingItems.length > 0 && (
                                <>
                                  {bookingItems.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm text-muted-foreground pl-4">
                                      <span>{item.item_name} (x{item.quantity}):</span>
                                      <span>{formatPrice(item.total_price_cents)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-sm text-muted-foreground pl-4">
                                    <span>Additional Items:</span>
                                    <span>{formatPrice(booking.additional_fees_cents)}</span>
                                  </div>
                                </>
                              )}
                              <div className="pt-2 border-t border-gray-300 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span className="text-lg">{formatPrice(calculateTotal())}</span>
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleCreateInvoice} 
                                disabled={submitting}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Invoice
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : null}
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
              <CardContent className="space-y-3">
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
                {booking.payment_status !== 'paid' && isCustomer && (
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700 mt-4"
                    onClick={() => router.push(`/dashboard/bookings/${id}/pay`)}
                  >
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
