'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText, 
  DollarSign,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Download,
  Send,
  Edit,
  Printer,
  X,
  CheckCircle2,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Invoice {
  id: string
  invoice_number: string
  booking_id: string | null
  business_id: string
  customer_id: string
  invoice_type: string
  status: string
  issue_date: string
  due_date: string | null
  payment_terms_days: number
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  paid_cents: number
  balance_cents: number
  notes: string | null
  footer_text: string | null
  email_sent_at: string | null
  paid_at: string | null
  created_at: string
  booking?: {
    id: string
    booking_status: string
    requested_date?: string
    requested_time?: string
    service_address?: string
    review_requested_at?: string | null
  }
  business?: {
    id: string
    name: string
    phone: string
    email: string
    address?: string
    city?: string
    state?: string
    postal_code?: string
    logo_url?: string
  }
  customer?: {
    id: string
    full_name: string
  }
  items?: Array<{
    id: string
    description: string
    quantity: number
    unit_price_cents: number
    total_cents: number
    item_type: string
  }>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBusinessOwner, setIsBusinessOwner] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)
  const [toast, setToast] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  })
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [markingPayment, setMarkingPayment] = useState(false)
  const [completeJobDialogOpen, setCompleteJobDialogOpen] = useState(false)
  const [completingJob, setCompletingJob] = useState(false)
  const [reviewDismissed, setReviewDismissed] = useState(false)

  useEffect(() => {
    loadInvoice()
    // Check if review was dismissed
    const dismissed = localStorage.getItem('dismissed_reviews')
    if (dismissed) {
      const dismissedArray = JSON.parse(dismissed)
      if (dismissedArray.includes(id)) {
        setReviewDismissed(true)
      }
    }
  }, [id])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      const response = await fetch(`/api/invoices/${id}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Error loading invoice:', data.error)
        return
      }

      setInvoice(data)
      setIsBusinessOwner((data.business as any)?.owner_id === user.id)
      setIsCustomer(data.customer_id === user.id)
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismissReview = () => {
    const dismissed = localStorage.getItem('dismissed_reviews')
    const dismissedArray = dismissed ? JSON.parse(dismissed) : []
    if (!dismissedArray.includes(id)) {
      dismissedArray.push(id)
      localStorage.setItem('dismissed_reviews', JSON.stringify(dismissedArray))
    }
    setReviewDismissed(true)
  }

  const shouldShowReviewPrompt = () => {
    if (!invoice) return false
    if (!isCustomer) return false
    if (invoice.status !== 'paid') return false
    if (!invoice.booking_id) return false
    if (reviewDismissed) return false
    // Check if review exists (not just if review was requested)
    if ((invoice as any).review_exists) return false
    return true
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-600 text-white'
      case 'sent':
        return 'bg-blue-600 text-white'
      case 'partially_paid':
        return 'bg-yellow-600 text-white'
      case 'overdue':
        return 'bg-red-600 text-white'
      case 'draft':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const handleSendInvoice = async () => {
    if (!invoice) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' })
      })

      if (response.ok) {
        await loadInvoice()
        setToast({
          show: true,
          message: 'Invoice sent successfully!',
          type: 'success'
        })
        // Auto-hide after 4 seconds
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'success' })
        }, 4000)
      } else {
        const data = await response.json()
        setToast({
          show: true,
          message: data.error || 'Failed to send invoice',
          type: 'error'
        })
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'error' })
        }, 4000)
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      setToast({
        show: true,
        message: 'Failed to send invoice. Please try again.',
        type: 'error'
      })
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' })
      }, 4000)
    }
  }

  const handleMarkPayment = async () => {
    if (!invoice) return

    const amount = parseFloat(paymentAmount.replace(/[^0-9.]/g, ''))
    if (isNaN(amount) || amount <= 0) {
      setToast({
        show: true,
        message: 'Please enter a valid payment amount',
        type: 'error'
      })
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' })
      }, 4000)
      return
    }

    const amountCents = Math.round(amount * 100)
    const newPaidCents = (invoice.paid_cents || 0) + amountCents
    const isFullyPaid = newPaidCents >= invoice.total_cents
    const newStatus = isFullyPaid ? 'paid' : 'partially_paid'

    setMarkingPayment(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/mark-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_cents: newPaidCents,
          status: newStatus
        })
      })

      if (response.ok) {
        await loadInvoice()
        setPaymentDialogOpen(false)
        setPaymentAmount('')
        setToast({
          show: true,
          message: `Payment recorded successfully! ${isFullyPaid ? 'Invoice is now fully paid.' : ''}`,
          type: 'success'
        })
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'success' })
        }, 4000)

        // If fully paid and has booking, show complete job dialog
        if (isFullyPaid && invoice.booking_id) {
          setTimeout(() => {
            setCompleteJobDialogOpen(true)
          }, 500)
        }
      } else {
        const data = await response.json()
        setToast({
          show: true,
          message: data.error || 'Failed to record payment',
          type: 'error'
        })
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'error' })
        }, 4000)
      }
    } catch (error) {
      console.error('Error marking payment:', error)
      setToast({
        show: true,
        message: 'Failed to record payment. Please try again.',
        type: 'error'
      })
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' })
      }, 4000)
    } finally {
      setMarkingPayment(false)
    }
  }

  const handleCompleteJob = async () => {
    if (!invoice || !invoice.booking_id) return

    setCompletingJob(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/complete-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        await loadInvoice()
        setCompleteJobDialogOpen(false)
        setToast({
          show: true,
          message: 'Job completed successfully!',
          type: 'success'
        })
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'success' })
        }, 4000)
      } else {
        const data = await response.json()
        setToast({
          show: true,
          message: data.error || 'Failed to complete job',
          type: 'error'
        })
        setTimeout(() => {
          setToast({ show: false, message: '', type: 'error' })
        }, 4000)
      }
    } catch (error) {
      console.error('Error completing job:', error)
      setToast({
        show: true,
        message: 'Failed to complete job. Please try again.',
        type: 'error'
      })
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' })
      }, 4000)
    } finally {
      setCompletingJob(false)
    }
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

  if (!invoice) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
              <p className="text-muted-foreground mb-4">This invoice could not be found or you don't have access to it.</p>
              <Button onClick={() => router.push('/dashboard/invoices')}>Back to Invoices</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-after: always;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <Badge className={`px-4 py-1.5 text-sm font-semibold uppercase tracking-wide ${getStatusColor(invoice.status)}`}>
            {invoice.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Invoice Document */}
        <Card className="border-2 border-gray-200 shadow-xl bg-white">
          <CardContent className="p-8 sm:p-12 lg:p-16">
            {/* Company Header */}
            <div className="mb-12 pb-8 border-b-2 border-gray-300">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                {/* Company Information */}
                <div className="flex-1">
                  {invoice.business && (
                    <div className="space-y-3">
                      {invoice.business.logo_url && (
                        <img 
                          src={invoice.business.logo_url} 
                          alt={invoice.business.name} 
                          className="h-16 w-auto mb-4"
                        />
                      )}
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        {invoice.business.name}
                      </h2>
                      {(invoice.business.address || invoice.business.city || invoice.business.state || invoice.business.postal_code) && (
                        <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
                          {invoice.business.address && <p>{invoice.business.address}</p>}
                          {(invoice.business.city || invoice.business.state || invoice.business.postal_code) && (
                            <p>
                              {invoice.business.city && invoice.business.city}
                              {invoice.business.city && invoice.business.state && ', '}
                              {invoice.business.state && invoice.business.state}
                              {invoice.business.postal_code && ` ${invoice.business.postal_code}`}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-1 text-sm text-gray-600">
                        {invoice.business.phone && (
                          <p className="font-medium">Phone: {invoice.business.phone}</p>
                        )}
                        {invoice.business.email && (
                          <p className="font-medium">Email: {invoice.business.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Number & Details */}
                <div className="text-left md:text-right">
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">INVOICE</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                      {invoice.invoice_number}
                    </h1>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex flex-col md:items-end">
                      <span className="text-gray-500">Issue Date:</span>
                      <span className="font-semibold text-gray-900">{format(new Date(invoice.issue_date), 'MMMM d, yyyy')}</span>
                    </div>
                    {invoice.due_date && (
                      <div className={`flex flex-col md:items-end ${invoice.status === 'overdue' ? 'text-red-600' : ''}`}>
                        <span className="text-gray-500">Due Date:</span>
                        <span className={`font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                          {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {invoice.payment_terms_days && (
                      <div className="flex flex-col md:items-end">
                        <span className="text-gray-500">Payment Terms:</span>
                        <span className="font-semibold text-gray-900">{invoice.payment_terms_days} days</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To / From Section */}
            <div className="mb-10 pb-8 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bill To */}
                {isBusinessOwner && invoice.customer && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Bill To</p>
                    <div className="space-y-1 text-sm text-gray-900">
                      <p className="font-semibold text-base">{invoice.customer.full_name}</p>
                      {invoice.booking && invoice.booking.service_address && (
                        <p className="text-gray-700 mt-2">{invoice.booking.service_address}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* From */}
                {isCustomer && invoice.business && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">From</p>
                    <div className="space-y-1 text-sm text-gray-900">
                      <p className="font-semibold text-base">{invoice.business.name}</p>
                      {invoice.business.address && (
                        <p className="text-gray-700">{invoice.business.address}</p>
                      )}
                      {(invoice.business.city || invoice.business.state || invoice.business.postal_code) && (
                        <p className="text-gray-700">
                          {invoice.business.city && invoice.business.city}
                          {invoice.business.city && invoice.business.state && ', '}
                          {invoice.business.state && invoice.business.state}
                          {invoice.business.postal_code && ` ${invoice.business.postal_code}`}
                        </p>
                      )}
                      {invoice.business.phone && (
                        <p className="text-gray-700 mt-1">Phone: {invoice.business.phone}</p>
                      )}
                      {invoice.business.email && (
                        <p className="text-gray-700">Email: {invoice.business.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Invoice Details */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-semibold text-gray-900 capitalize">{invoice.invoice_type.replace('_', ' ')}</span>
                </div>
                {invoice.booking_id && (
                  <div>
                    <span className="text-gray-500">Booking:</span>
                    <Link href={`/dashboard/bookings/${invoice.booking_id}`} className="ml-2 font-semibold text-orange-600 hover:text-orange-700 underline">
                      {invoice.booking_id.substring(0, 8)}...
                    </Link>
                  </div>
                )}
                {invoice.booking && invoice.booking.requested_date && (
                  <div>
                    <span className="text-gray-500">Service Date:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {format(new Date(invoice.booking.requested_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {invoice.email_sent_at && (
                  <div>
                    <span className="text-gray-500">Sent:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {format(new Date(invoice.email_sent_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-10">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="text-left py-4 px-4 font-bold text-xs uppercase tracking-wider text-gray-900">Description</th>
                      <th className="text-right py-4 px-4 font-bold text-xs uppercase tracking-wider text-gray-900 w-24">Quantity</th>
                      <th className="text-right py-4 px-4 font-bold text-xs uppercase tracking-wider text-gray-900 w-32">Unit Price</th>
                      <th className="text-right py-4 px-4 font-bold text-xs uppercase tracking-wider text-gray-900 w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-5 px-4 text-gray-900 font-medium">{item.description}</td>
                          <td className="py-5 px-4 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-5 px-4 text-right text-gray-600">{formatPrice(item.unit_price_cents)}</td>
                          <td className="py-5 px-4 text-right font-semibold text-gray-900">{formatPrice(item.total_cents)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="mb-10">
              <div className="max-w-md ml-auto">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatPrice(invoice.subtotal_cents)}</span>
                  </div>
                  {invoice.tax_cents > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Tax</span>
                      <span className="font-semibold text-gray-900">{formatPrice(invoice.tax_cents)}</span>
                    </div>
                  )}
                  {invoice.discount_cents > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Discount</span>
                      <span className="font-semibold text-red-600">-{formatPrice(invoice.discount_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t-2 border-gray-900">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{formatPrice(invoice.total_cents)}</span>
                  </div>
                  {invoice.paid_cents > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 pt-2">
                      <span>Amount Paid</span>
                      <span className="font-semibold text-emerald-600">{formatPrice(invoice.paid_cents)}</span>
                    </div>
                  )}
                  {invoice.balance_cents > 0 && (
                    <div className="flex justify-between pt-4 border-t-2 border-orange-600">
                      <span className="text-lg font-bold text-gray-900">Balance Due</span>
                      <span className="text-2xl font-bold text-orange-600">{formatPrice(invoice.balance_cents)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-8 pb-6 border-t border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Additional Notes</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            {invoice.footer_text && (
              <div className="pt-8 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500 leading-relaxed">{invoice.footer_text}</p>
              </div>
            )}
            
            {/* Payment Instructions */}
            {invoice.balance_cents > 0 && invoice.status !== 'draft' && (
              <div className="mt-10 pt-8 border-t-2 border-gray-300">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">Payment Instructions</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Please remit payment within {invoice.payment_terms_days || 30} days of the invoice date. 
                  {invoice.business && invoice.business.email && (
                    <> For questions about this invoice, please contact us at {invoice.business.email}</>
                  )}
                  {invoice.business && invoice.business.phone && (
                    <> or call {invoice.business.phone}.</>
                  )}
                </p>
              </div>
            )}

            {/* Review Prompt */}
            {shouldShowReviewPrompt() && (
              <div className="mt-10 pt-8 border-t-2 border-orange-200">
                <div className="p-6 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-full bg-orange-200 flex items-center justify-center">
                      <Star className="w-7 h-7 text-orange-600 fill-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">How was your service?</h4>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        Thank you for your business! We'd love to hear about your experience with <span className="font-semibold">{invoice.business?.name}</span>. Your review helps others make informed decisions and helps us improve.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {invoice.booking_id && (
                          <Link href={`/dashboard/reviews/${invoice.booking_id}`}>
                            <Button
                              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Leave a Review
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          className="border-gray-300 hover:bg-gray-50 text-gray-700"
                          onClick={handleDismissReview}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Maybe Later
                        </Button>
                      </div>
                    </div>
                    <button
                      onClick={handleDismissReview}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Dismiss review prompt"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end no-print">
          {isBusinessOwner && invoice.status === 'draft' && (
            <>
              <Button
                variant="outline"
                className="border-2 border-gray-800"
                onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleSendInvoice}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invoice
              </Button>
            </>
          )}
          {isBusinessOwner && invoice.status !== 'draft' && invoice.balance_cents > 0 && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setPaymentAmount(formatPrice(invoice.balance_cents).replace('$', ''))
                setPaymentDialogOpen(true)
              }}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Mark Payment
            </Button>
          )}
          {isBusinessOwner && invoice.status === 'paid' && invoice.booking_id && !invoice.booking?.review_requested_at && (
            <Button
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              onClick={() => setCompleteJobDialogOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}
          {isCustomer && invoice.balance_cents > 0 && invoice.status !== 'draft' && (
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}/pay`)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Pay {formatPrice(invoice.balance_cents)}
            </Button>
          )}
          <Button
            variant="outline"
            className="border-2 border-gray-800"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            className="border-2 border-gray-800"
            onClick={() => router.push(`/dashboard/invoices/${invoice.id}/download`)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md border-2 border-green-200 shadow-xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Mark Payment Received
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-gray-700 pt-2 leading-relaxed">
                Record a payment for this invoice. The invoice will be marked as paid or partially paid based on the amount.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      setPaymentAmount(value)
                    }}
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Balance due: {formatPrice(invoice.balance_cents)}
                </p>
                {paymentAmount && parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) > 0 && (
                  <p className="text-xs text-gray-600">
                    Remaining after payment: {formatPrice(
                      invoice.balance_cents - Math.round(parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) * 100)
                    )}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentDialogOpen(false)
                  setPaymentAmount('')
                }}
                disabled={markingPayment}
                className="px-6 py-2 border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkPayment}
                disabled={markingPayment || !paymentAmount || parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) <= 0}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {markingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Job Dialog */}
        <Dialog open={completeJobDialogOpen} onOpenChange={setCompleteJobDialogOpen}>
          <DialogContent className="sm:max-w-md border-2 border-orange-200 shadow-xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-orange-600" />
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Complete Job
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-gray-700 pt-2 leading-relaxed">
                Mark this job as complete.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button
                variant="outline"
                onClick={() => setCompleteJobDialogOpen(false)}
                disabled={completingJob}
                className="px-6 py-2 border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteJob}
                disabled={completingJob}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                {completingJob ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Job
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-4 right-4 z-[9999] animate-in">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md transition-all ${
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
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

