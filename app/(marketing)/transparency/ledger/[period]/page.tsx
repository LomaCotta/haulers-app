import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Download, 
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

// Mock data for demonstration
const mockLedgerData: LedgerEntry[] = [
  {
    id: '1',
    category: 'income_fees',
    amount_cents: 234000, // $2,340
    note: 'Platform fees from November transactions',
    created_at: '2024-11-01T00:00:00Z'
  },
  {
    id: '2',
    category: 'donations',
    amount_cents: 89000, // $890
    note: 'User donations and tips',
    created_at: '2024-11-15T00:00:00Z'
  },
  {
    id: '3',
    category: 'infra_costs',
    amount_cents: -120000, // -$1,200
    note: 'Supabase hosting and database costs',
    created_at: '2024-11-01T00:00:00Z'
  },
  {
    id: '4',
    category: 'infra_costs',
    amount_cents: -45000, // -$450
    note: 'Stripe payment processing fees',
    created_at: '2024-11-01T00:00:00Z'
  },
  {
    id: '5',
    category: 'staff',
    amount_cents: -80000, // -$800
    note: 'Part-time community manager',
    created_at: '2024-11-01T00:00:00Z'
  },
  {
    id: '6',
    category: 'grants',
    amount_cents: -180000, // -$1,800
    note: 'Small business development grants',
    created_at: '2024-11-20T00:00:00Z'
  },
  {
    id: '7',
    category: 'reserves',
    amount_cents: 50000, // $500
    note: 'Emergency fund contribution',
    created_at: '2024-11-25T00:00:00Z'
  }
]

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
  const categoryTotals = mockLedgerData.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = 0
    }
    acc[entry.category] += entry.amount_cents
    return acc
  }, {} as Record<string, number>)

  const totalIncome = Object.entries(categoryTotals)
    .filter(([category]) => ['income_fees', 'donations'].includes(category))
    .reduce((sum, [, amount]) => sum + amount, 0)

  const totalExpenses = Object.entries(categoryTotals)
    .filter(([category]) => !['income_fees', 'donations'].includes(category))
    .reduce((sum, [, amount]) => sum + Math.abs(amount), 0)

  const netIncome = totalIncome - totalExpenses

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

          <div className="flex gap-4">
            <Button asChild>
              <Link href={`/transparency/ledger/${period}.csv`}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/transparency/ledger/${period}.json`}>
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Link>
            </Button>
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
              <div className="space-y-4">
                {Object.entries(categoryTotals)
                  .filter(([category]) => ['income_fees', 'donations'].includes(category))
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{categoryLabels[category]}</span>
                      </div>
                      <span className="font-bold text-green-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Where money was spent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryTotals)
                  .filter(([category]) => !['income_fees', 'donations'].includes(category))
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium">{categoryLabels[category]}</span>
                      </div>
                      <span className="font-bold text-red-600">
                        {formatCurrency(Math.abs(amount))}
                      </span>
                    </div>
                  ))}
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
            <div className="space-y-4">
              {mockLedgerData.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={entry.amount_cents >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {categoryLabels[entry.category]}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{entry.note}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${entry.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.amount_cents >= 0 ? '+' : ''}{formatCurrency(entry.amount_cents)}
                    </div>
                  </div>
                </div>
              ))}
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
