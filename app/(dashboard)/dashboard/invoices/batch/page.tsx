'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  FileText, 
  ArrowLeft, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Booking {
  id: string
  booking_status: string
  total_price_cents: number
  customer_id: string
  requested_date: string
  customer?: {
    full_name: string
    email: string
  }
  invoices?: Array<{
    id: string
    invoice_number: string
    status: string
  }>
  // Legacy support
  invoice?: Array<{
    id: string
    invoice_number: string
    status: string
  }>
}

export default function BatchInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [businessId, setBusinessId] = useState<string>('')
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>('')
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
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

      // Load completed bookings without invoices
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles(id, full_name, email),
          invoices:invoices(id, invoice_number, status)
        `)
        .eq('business_id', businesses[0].id)
        .eq('booking_status', 'completed')
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)

      // Filter out bookings that already have paid invoices
      const filteredBookings = (bookingsData || []).filter((booking: any) => {
        const hasPaidInvoice = booking.invoices?.some((inv: any) => inv.status === 'paid')
        return !hasPaidInvoice
      })

      setBookings(filteredBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings)
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId)
    } else {
      newSelected.add(bookingId)
    }
    setSelectedBookings(newSelected)
  }

  const toggleAll = () => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set())
    } else {
      setSelectedBookings(new Set(bookings.map(b => b.id)))
    }
  }

  const handleBatchCreate = async () => {
    if (selectedBookings.size === 0) {
      alert('Please select at least one booking')
      return
    }

    setSubmitting(true)
    try {
      const bookingIds = Array.from(selectedBookings)
      
      // Create invoices one by one (could be optimized with batch API later)
      for (const bookingId of bookingIds) {
        const booking = bookings.find(b => b.id === bookingId)
        if (!booking) continue

        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            businessId,
            customerId: booking.customer_id,
            invoiceType: 'one_time',
            issueDate,
            dueDate: dueDate || null,
            paymentTermsDays,
            items: [{
              description: 'Service Charge',
              quantity: 1,
              unit_price_cents: booking.total_price_cents,
              item_type: 'service'
            }]
          })
        })

        if (!response.ok) {
          console.error(`Failed to create invoice for booking ${bookingId}`)
        }
      }

      alert(`Successfully created ${selectedBookings.size} invoice(s)!`)
      router.push('/dashboard/invoices')
    } catch (error) {
      console.error('Error creating batch invoices:', error)
      alert('Failed to create invoices. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/dashboard/invoices">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-200">
            <CardTitle className="text-2xl font-bold">Batch Create Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Invoice Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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

            {/* Bookings List */}
            {bookings.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bookings Available</h3>
                <p className="text-muted-foreground mb-4">
                  All completed bookings already have invoices, or none are available for invoicing.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedBookings.size === bookings.length && bookings.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <Label className="text-base font-semibold">
                      Select All ({selectedBookings.size} of {bookings.length} selected)
                    </Label>
                  </div>
                  <Button
                    onClick={handleBatchCreate}
                    disabled={submitting || selectedBookings.size === 0}
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
                        Create {selectedBookings.size} Invoice(s)
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {bookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className={`border-2 transition-all ${
                        selectedBookings.has(booking.id)
                          ? 'border-orange-500 bg-orange-50/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedBookings.has(booking.id)}
                            onCheckedChange={() => toggleBooking(booking.id)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {booking.customer?.full_name || 'Customer'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Booking ID: {booking.id.slice(0, 8)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">
                                  {formatPrice(booking.total_price_cents)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(booking.requested_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            {((booking.invoices && booking.invoices.length > 0) || (booking.invoice && Array.isArray(booking.invoice) && booking.invoice.length > 0)) && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                  Existing invoices: {(booking.invoices || booking.invoice || []).map((inv: any) => inv.invoice_number).join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

