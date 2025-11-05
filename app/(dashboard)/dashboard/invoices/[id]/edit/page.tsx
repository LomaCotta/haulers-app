'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  FileText,
  Save
} from 'lucide-react'
import Link from 'next/link'

interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  item_type: string
}

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
  items?: InvoiceItem[]
}

export default function EditInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  
  // Form state
  const [invoiceType, setInvoiceType] = useState<string>('one_time')
  const [issueDate, setIssueDate] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [paymentTermsType, setPaymentTermsType] = useState<'now' | 'date' | 'days'>('days')
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30)
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<InvoiceItem[]>([])

  useEffect(() => {
    loadInvoice()
  }, [id])

  useEffect(() => {
    // Calculate due date based on payment terms
    if (issueDate && paymentTermsType === 'days' && paymentTermsDays > 0) {
      const issue = new Date(issueDate)
      const due = new Date(issue)
      due.setDate(due.getDate() + paymentTermsDays)
      setDueDate(due.toISOString().split('T')[0])
    } else if (paymentTermsType === 'now' && issueDate) {
      setDueDate(issueDate)
    }
    // If paymentTermsType is 'date', keep the manual dueDate
  }, [issueDate, paymentTermsType, paymentTermsDays])

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
        alert('Error loading invoice: ' + data.error)
        router.push('/dashboard/invoices')
        return
      }

      // Check if user is business owner
      const business = data.business as any
      if (business?.owner_id !== user.id) {
        alert('You do not have permission to edit this invoice')
        router.push(`/dashboard/invoices/${id}`)
        return
      }

      // Check if invoice can be edited
      if (data.status !== 'draft') {
        alert('Only draft invoices can be edited')
        router.push(`/dashboard/invoices/${id}`)
        return
      }

      setInvoice(data)
      setInvoiceType(data.invoice_type || 'one_time')
      setIssueDate(data.issue_date || '')
      setDueDate(data.due_date || '')
      
      // Determine payment terms type
      if (data.due_date && data.issue_date) {
        const issue = new Date(data.issue_date)
        const due = new Date(data.due_date)
        const diffDays = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) {
          setPaymentTermsType('now')
        } else if (diffDays === data.payment_terms_days) {
          setPaymentTermsType('days')
        } else {
          setPaymentTermsType('date')
        }
      } else {
        setPaymentTermsType('days')
      }
      
      setPaymentTermsDays(data.payment_terms_days || 30)
      setNotes(data.notes || '')
      setItems(data.items || [])
    } catch (error) {
      console.error('Error loading invoice:', error)
      alert('Failed to load invoice')
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price_cents: 0,
      total_cents: 0,
      item_type: 'service'
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate total_cents
    if (field === 'quantity' || field === 'unit_price_cents') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity
      const unitPrice = field === 'unit_price_cents' ? value : newItems[index].unit_price_cents
      newItems[index].total_cents = Math.round(quantity * unitPrice)
    }
    
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (item.unit_price_cents * item.quantity)
    }, 0)
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const handleSubmit = async () => {
    if (!invoice || items.length === 0) {
      alert('Please add at least one item to the invoice')
      return
    }

    setSaving(true)
    try {
      const subtotal = calculateTotal()
      const total = subtotal // Add tax calculation later

      // Calculate due date and payment terms days based on selection
      let finalDueDate = dueDate
      let finalPaymentTermsDays = paymentTermsDays

      if (paymentTermsType === 'now') {
        finalDueDate = issueDate
        finalPaymentTermsDays = 0
      } else if (paymentTermsType === 'date') {
        // Calculate days from issue date to due date
        if (issueDate && dueDate) {
          const issue = new Date(issueDate)
          const due = new Date(dueDate)
          const diffDays = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24))
          finalPaymentTermsDays = Math.max(0, diffDays)
        }
      } else if (paymentTermsType === 'days') {
        // Due date already calculated in useEffect
        finalPaymentTermsDays = paymentTermsDays
      }

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice.status,
          due_date: finalDueDate,
          payment_terms_days: finalPaymentTermsDays,
          notes,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price_cents: Math.round(item.unit_price_cents),
            item_type: item.item_type
          }))
        })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/invoices/${id}`)
      } else {
        alert(data.error || 'Failed to update invoice')
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('Failed to update invoice')
    } finally {
      setSaving(false)
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
              <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
              <Button onClick={() => router.push('/dashboard/invoices')}>Back to Invoices</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/dashboard/invoices/${id}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoice
          </Button>
        </Link>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader className="border-b-2 border-gray-200">
            <CardTitle className="text-2xl font-bold">Edit Invoice: {invoice.invoice_number}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType} disabled>
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
                  disabled
                />
              </div>
              
              {/* Payment Terms */}
              <div>
                <Label htmlFor="paymentTermsType">Payment Terms</Label>
                <Select value={paymentTermsType} onValueChange={(value: 'now' | 'date' | 'days') => setPaymentTermsType(value)}>
                  <SelectTrigger id="paymentTermsType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Due Now (Same as Issue Date)</SelectItem>
                    <SelectItem value="date">Due on Specific Date</SelectItem>
                    <SelectItem value="days">Due in X Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paymentTermsType === 'date' && (
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={issueDate}
                  />
                </div>
              )}
              
              {paymentTermsType === 'days' && (
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                  <Select value={paymentTermsDays.toString()} onValueChange={(value) => setPaymentTermsDays(parseInt(value))}>
                    <SelectTrigger id="paymentTerms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Due Now</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="15">15 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="45">45 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentTermsDays > 0 && issueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due Date: {new Date(new Date(issueDate).getTime() + paymentTermsDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              
              {paymentTermsType === 'now' && (
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Payment is due immediately</p>
                </div>
              )}
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
                              step="0.01"
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
                onClick={() => router.push(`/dashboard/invoices/${id}`)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || items.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

