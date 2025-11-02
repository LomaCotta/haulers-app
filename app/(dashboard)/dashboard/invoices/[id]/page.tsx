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
  Printer
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  paid_cents: number
  balance_cents: number
  notes: string | null
  footer_text: string | null
  created_at: string
  business?: {
    id: string
    name: string
    phone: string
    email: string
  }
  customer?: {
    id: string
    full_name: string
    email: string
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

  useEffect(() => {
    loadInvoice()
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
        alert('Invoice sent successfully!')
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice')
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardContent className="p-8 sm:p-12">
            {/* Invoice Header */}
            <div className="border-b-2 border-gray-900 pb-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                    {invoice.invoice_number}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Issue Date: {format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
                  </p>
                  {invoice.due_date && (
                    <p className={`text-sm font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                      Due Date: {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {isBusinessOwner && invoice.customer && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Bill To:</p>
                      <p className="font-semibold text-gray-900">{invoice.customer.full_name}</p>
                      {invoice.customer.email && (
                        <p className="text-sm text-gray-600">{invoice.customer.email}</p>
                      )}
                    </div>
                  )}
                  {isCustomer && invoice.business && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">From:</p>
                      <p className="font-semibold text-gray-900">{invoice.business.name}</p>
                      {invoice.business.email && (
                        <p className="text-sm text-gray-600">{invoice.business.email}</p>
                      )}
                      {invoice.business.phone && (
                        <p className="text-sm text-gray-600">{invoice.business.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="text-left py-3 px-4 font-bold text-sm uppercase tracking-wide text-gray-900">Description</th>
                      <th className="text-right py-3 px-4 font-bold text-sm uppercase tracking-wide text-gray-900">Quantity</th>
                      <th className="text-right py-3 px-4 font-bold text-sm uppercase tracking-wide text-gray-900">Unit Price</th>
                      <th className="text-right py-3 px-4 font-bold text-sm uppercase tracking-wide text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-gray-200">
                          <td className="py-4 px-4 text-gray-900">{item.description}</td>
                          <td className="py-4 px-4 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-4 px-4 text-right text-gray-600">{formatPrice(item.unit_price_cents)}</td>
                          <td className="py-4 px-4 text-right font-semibold text-gray-900">{formatPrice(item.total_cents)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="border-t-2 border-gray-900 pt-6 mb-8">
              <div className="max-w-xs ml-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(invoice.subtotal_cents)}</span>
                </div>
                {invoice.tax_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(invoice.tax_cents)}</span>
                  </div>
                )}
                {invoice.discount_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-semibold text-red-600">-{formatPrice(invoice.discount_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-gray-900">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(invoice.total_cents)}</span>
                </div>
                {invoice.paid_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold text-emerald-600">{formatPrice(invoice.paid_cents)}</span>
                  </div>
                )}
                {invoice.balance_cents > 0 && (
                  <div className="flex justify-between pt-3 border-t border-gray-300">
                    <span className="font-semibold text-gray-900">Balance Due:</span>
                    <span className="text-xl font-bold text-orange-600">{formatPrice(invoice.balance_cents)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Notes</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            {invoice.footer_text && (
              <div className="pt-6 border-t border-gray-200 mt-8">
                <p className="text-xs text-center text-gray-500">{invoice.footer_text}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
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
      </div>
    </div>
  )
}

