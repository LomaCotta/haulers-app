'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  DollarSign,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Send
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
  total_cents: number
  paid_cents: number
  balance_cents: number
  created_at: string
  business?: {
    id: string
    name: string
  }
  customer?: {
    id: string
    full_name: string
    email: string
  }
  booking?: {
    id: string
    booking_status: string
  }
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userRole, setUserRole] = useState<'customer' | 'business'>('customer')

  useEffect(() => {
    loadInvoices()
  }, [filter])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Determine if user is business owner or customer
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      const isBusinessOwner = businesses && businesses.length > 0
      setUserRole(isBusinessOwner ? 'business' : 'customer')

      // Fetch invoices
      const params = new URLSearchParams()
      if (isBusinessOwner && businesses) {
        params.set('businessId', businesses[0].id)
      } else {
        params.set('customerId', user.id)
      }

      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/api/invoices?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setInvoices(data || [])
      } else {
        console.error('Error loading invoices:', {
          error: data.error,
          details: data.details,
          code: data.code,
          fullResponse: data
        })
        
        // Show user-friendly error
        if (data.code === 'TABLE_NOT_FOUND') {
          alert('Invoices feature is not set up yet. Please run the database migration first.')
        }
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'overdue':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      invoice.invoice_number.toLowerCase().includes(query) ||
      invoice.customer?.full_name?.toLowerCase().includes(query) ||
      invoice.business?.name?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              {userRole === 'business' ? 'Invoices' : 'My Invoices'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === 'business' 
                ? 'Manage and track all your invoices' 
                : 'View and pay your invoices'}
            </p>
          </div>
          {userRole === 'business' && (
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => router.push('/dashboard/invoices/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue'].map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className={filter === status ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  >
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Invoices Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search' : 'No invoices match your filters'}
              </p>
              {userRole === 'business' && !searchQuery && (
                <Button 
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => router.push('/dashboard/invoices/new')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h3>
                        <Badge className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusColor(invoice.status)}`}>
                          <span className="flex items-center gap-1.5">
                            {getStatusIcon(invoice.status)}
                            {invoice.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Issue Date:</span>
                          <span className="font-semibold text-gray-900">
                            {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {invoice.due_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600">Due Date:</span>
                            <span className={`font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                              {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold text-lg text-gray-900">
                            {formatPrice(invoice.total_cents)}
                          </span>
                        </div>
                        {invoice.balance_cents > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-semibold text-orange-600">
                              {formatPrice(invoice.balance_cents)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {userRole === 'business' && invoice.customer && (
                          <span>
                            Customer: <span className="font-semibold text-gray-900">{invoice.customer.full_name}</span>
                          </span>
                        )}
                        {userRole === 'customer' && invoice.business && (
                          <span>
                            Business: <span className="font-semibold text-gray-900">{invoice.business.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-800 hover:bg-gray-900 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/invoices/${invoice.id}`)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {userRole === 'business' && invoice.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-2 border-orange-600 hover:bg-orange-600 hover:text-white"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const response = await fetch(`/api/invoices/${invoice.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'sent' })
                              })
                              if (response.ok) {
                                await loadInvoices()
                              }
                            } catch (error) {
                              console.error('Error sending invoice:', error)
                            }
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      )}
                      {userRole === 'customer' && invoice.balance_cents > 0 && invoice.status !== 'overdue' && (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/invoices/${invoice.id}/pay`)
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

