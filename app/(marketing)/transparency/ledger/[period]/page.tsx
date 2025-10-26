import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar
} from 'lucide-react'

interface LedgerEntry {
  id: string
  category: string
  amount_cents: number
  note: string
  created_at: string
}

// Empty data since we just started
const mockLedgerData: LedgerEntry[] = []

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
  income_fees: 'text-green-600',
  donations: 'text-green-600',
  infra_costs: 'text-red-600',
  staff: 'text-red-600',
  grants: 'text-blue-600',
  reserves: 'text-purple-600',
  other: 'text-gray-600'
}

interface PageProps {
  params: Promise<{
    period: string
  }>
}

export default async function LedgerPage({ params }: PageProps) {
  const { period } = await params
  
  // Parse period (YYYY-MM format)
  const [year, month] = period.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Calculate totals by category
  // Since we just started, all values are zero
  const totalIncome = 0
  const totalExpenses = 0
  const netIncome = 0
  const categoryTotals: Record<string, number> = {}

  const formatCurrency = (cents: number) => {
    const dollars = cents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(dollars)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" asChild>
              <Link href="/transparency">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Transparency
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Financial Report - {monthName}
              </h1>
              <p className="text-gray-600">
                Complete breakdown of income, expenses, and community reinvestment
              </p>
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-gray-500">
              No financial data available yet - we just launched!
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-gray-500">
                Platform fees + donations
              </p>
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
              <p className="text-xs text-gray-500">
                Infrastructure + grants + staff
              </p>
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

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Income Breakdown</CardTitle>
              <CardDescription>Sources of revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">No income data yet</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Where money was spent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">No expense data yet</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Transactions</CardTitle>
            <CardDescription>All financial entries for {monthName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
              <p className="text-gray-500 mb-4">
                We just launched! Financial data will appear here as we start processing transactions.
              </p>
              <p className="text-sm text-gray-400">
                Check back soon for our first financial report.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This report is generated automatically from our financial records. 
            All amounts are in USD. For questions about this report, please contact us.
          </p>
        </div>
      </div>
    </div>
  )
}
