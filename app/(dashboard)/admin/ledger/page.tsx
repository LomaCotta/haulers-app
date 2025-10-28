'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Filter,
  MoreHorizontal,
  BarChart3,
  Download,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LedgerEntry {
  id: string
  period_month: string
  category: 'income_fees' | 'donations' | 'infra_costs' | 'staff' | 'grants' | 'reserves' | 'other'
  amount_cents: number
  note?: string
  created_at: string
}

const categoryLabels: Record<string, string> = {
  income_fees: 'Platform Fees',
  donations: 'Donations',
  infra_costs: 'Infrastructure',
  staff: 'Staff',
  grants: 'Community Grants',
  reserves: 'Reserves',
  other: 'Other'
}

const categoryColors: Record<string, string> = {
  income_fees: 'bg-green-100 text-green-800',
  donations: 'bg-green-100 text-green-800',
  infra_costs: 'bg-red-100 text-red-800',
  staff: 'bg-red-100 text-red-800',
  grants: 'bg-blue-100 text-blue-800',
  reserves: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
}

export default function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    period_month: '',
    category: 'income_fees' as LedgerEntry['category'],
    amount_cents: '',
    note: ''
  })

  useEffect(() => {
    fetchLedgerEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [entries, searchTerm, categoryFilter, periodFilter])

  const fetchLedgerEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user')
        return
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching current user profile:', profileError)
        return
      }

      if (profile?.role !== 'admin') {
        console.log('User is not admin, redirecting')
        window.location.href = '/dashboard'
        return
      }

      // Fetch all ledger entries
      console.log('Fetching ledger entries...')
      const { data: entriesData, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .order('period_month', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching ledger entries:', error)
        alert(`Error fetching ledger entries: ${error.message}`)
        return
      }

      console.log('Fetched ledger entries:', entriesData)
      setEntries(entriesData || [])
    } catch (error) {
      console.error('Error fetching ledger entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = entries

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryLabels[entry.category]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(entry => entry.category === categoryFilter)
    }

    // Filter by period
    if (periodFilter !== 'all') {
      filtered = filtered.filter(entry => entry.period_month.startsWith(periodFilter))
    }

    setFilteredEntries(filtered)
  }

  const handleAddEntry = async () => {
    try {
      const { error } = await supabase
        .from('ledger_entries')
        .insert({
          period_month: formData.period_month,
          category: formData.category,
          amount_cents: parseInt(formData.amount_cents),
          note: formData.note || null
        })

      if (error) {
        console.error('Error adding ledger entry:', error)
        alert(`Error adding entry: ${error.message}`)
        return
      }

      alert('Ledger entry added successfully')
      setShowAddForm(false)
      setFormData({ period_month: '', category: 'income_fees', amount_cents: '', note: '' })
      fetchLedgerEntries()
    } catch (error) {
      console.error('Error adding ledger entry:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleEditEntry = async () => {
    if (!editingEntry) return

    try {
      const { error } = await supabase
        .from('ledger_entries')
        .update({
          period_month: formData.period_month,
          category: formData.category,
          amount_cents: parseInt(formData.amount_cents),
          note: formData.note || null
        })
        .eq('id', editingEntry.id)

      if (error) {
        console.error('Error updating ledger entry:', error)
        alert(`Error updating entry: ${error.message}`)
        return
      }

      alert('Ledger entry updated successfully')
      setEditingEntry(null)
      setFormData({ period_month: '', category: 'income_fees', amount_cents: '', note: '' })
      fetchLedgerEntries()
    } catch (error) {
      console.error('Error updating ledger entry:', error)
      alert('An unexpected error occurred')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this ledger entry? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('ledger_entries')
        .delete()
        .eq('id', entryId)

      if (error) {
        console.error('Error deleting ledger entry:', error)
        alert(`Error deleting entry: ${error.message}`)
        return
      }

      alert('Ledger entry deleted successfully')
      fetchLedgerEntries()
    } catch (error) {
      console.error('Error deleting ledger entry:', error)
      alert('An unexpected error occurred')
    }
  }

  const startEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry)
    setFormData({
      period_month: entry.period_month,
      category: entry.category,
      amount_cents: entry.amount_cents.toString(),
      note: entry.note || ''
    })
    setShowAddForm(true)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  // Calculate totals
  const totalIncome = entries
    .filter(e => e.category === 'income_fees' || e.category === 'donations')
    .reduce((sum, e) => sum + e.amount_cents, 0)

  const totalExpenses = entries
    .filter(e => e.category === 'infra_costs' || e.category === 'staff' || e.category === 'grants')
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0)

  const netIncome = totalIncome - totalExpenses

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading ledger...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Ledger</h1>
          <p className="text-gray-600">Manage financial entries and track platform economics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-gray-500">Platform fees + donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-gray-500">Infrastructure + grants + staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-gray-500">
              {netIncome >= 0 ? 'Added to reserves' : 'From reserves'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search entries by note or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {Array.from(new Set(entries.map(e => e.period_month.substring(0, 7))))
                    .sort()
                    .reverse()
                    .map(period => (
                      <SelectItem key={period} value={period}>
                        {formatDate(period + '-01')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {categoryLabels[entry.category]}
                      </h3>
                      <Badge className={categoryColors[entry.category]}>
                        {entry.category}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.period_month + '-01')}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(entry.amount_cents)}
                      </div>
                      {entry.note && (
                        <div className="text-gray-600">
                          {entry.note.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(entry)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Entry
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Entry
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No ledger entries found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingEntry ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
                </h2>
                <Button variant="ghost" onClick={() => {
                  setShowAddForm(false)
                  setEditingEntry(null)
                  setFormData({ period_month: '', category: 'income_fees', amount_cents: '', note: '' })
                }}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Period (YYYY-MM)</label>
                  <Input
                    value={formData.period_month}
                    onChange={(e) => setFormData({ ...formData, period_month: e.target.value })}
                    placeholder="2024-01"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <Select value={formData.category} onValueChange={(value: LedgerEntry['category']) => 
                    setFormData({ ...formData, category: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Amount (cents)</label>
                  <Input
                    type="number"
                    value={formData.amount_cents}
                    onChange={(e) => setFormData({ ...formData, amount_cents: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Note</label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={editingEntry ? handleEditEntry : handleAddEntry}
                    className="flex-1"
                  >
                    {editingEntry ? 'Update Entry' : 'Add Entry'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingEntry(null)
                      setFormData({ period_month: '', category: 'income_fees', amount_cents: '', note: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
