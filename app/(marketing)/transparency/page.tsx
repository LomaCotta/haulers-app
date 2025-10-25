import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Heart,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react'

export default function TransparencyPage() {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <Heart className="w-4 h-4 mr-1" />
              Nonprofit Transparency
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Transparent by Design
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We believe in complete transparency. Every dollar earned through platform fees 
              is tracked, reported, and reinvested in our community. See exactly how we use 
              our revenue to support local businesses and community initiatives.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Low Platform Fees
              </CardTitle>
              <CardDescription>
                We keep fees minimal to support local businesses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">2.5%</div>
              <p className="text-sm text-gray-600">
                Maximum platform fee (vs 10-15% for other platforms)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Public Ledgers
              </CardTitle>
              <CardDescription>
                Monthly financial reports available to everyone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <p className="text-sm text-gray-600">
                Transparent financial reporting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-600" />
                Community Reinvestment
              </CardTitle>
              <CardDescription>
                Revenue supports local initiatives and infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 mb-2">60%</div>
              <p className="text-sm text-gray-600">
                Of revenue reinvested in community programs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Ledgers */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Recent Financial Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>November 2024</span>
                  <Badge variant="outline">Latest</Badge>
                </CardTitle>
                <CardDescription>Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Platform Fees</span>
                    <span className="font-medium">$2,340</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Donations</span>
                    <span className="font-medium">$890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Infrastructure</span>
                    <span className="font-medium">-$1,200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Community Grants</span>
                    <span className="font-medium">-$1,800</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/transparency/ledger/${currentMonth}`}>
                      View Report
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/transparency/ledger/${currentMonth}.csv`}>
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>October 2024</CardTitle>
                <CardDescription>Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Platform Fees</span>
                    <span className="font-medium">$1,890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Donations</span>
                    <span className="font-medium">$650</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Infrastructure</span>
                    <span className="font-medium">-$980</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Community Grants</span>
                    <span className="font-medium">-$1,200</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/transparency/ledger/${lastMonth}`}>
                      View Report
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/transparency/ledger/${lastMonth}.csv`}>
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>September 2024</CardTitle>
                <CardDescription>Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Platform Fees</span>
                    <span className="font-medium">$1,560</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Donations</span>
                    <span className="font-medium">$420</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Infrastructure</span>
                    <span className="font-medium">-$850</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Community Grants</span>
                    <span className="font-medium">-$900</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link href="/transparency/ledger/2024-09">
                      View Report
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/transparency/ledger/2024-09.csv">
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How Our Transparency Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Monthly Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Every month, we publish a detailed financial report showing all income, 
                  expenses, and community reinvestment. These reports are available to 
                  everyone and include CSV downloads for analysis.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• Platform fee income from transactions</li>
                  <li>• Donation income from users</li>
                  <li>• Infrastructure and operational costs</li>
                  <li>• Community grants and reinvestment</li>
                  <li>• Staff and administrative expenses</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-green-600" />
                  Community Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Our revenue directly supports local communities through grants, 
                  infrastructure improvements, and business development programs.
                </p>
                <ul className="space-y-2 text-sm">
                  <li>• Small business development grants</li>
                  <li>• Local infrastructure improvements</li>
                  <li>• Community event sponsorships</li>
                  <li>• Educational programs for providers</li>
                  <li>• Emergency relief funds</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Support Our Mission</h3>
              <p className="text-gray-600 mb-6">
                Help us build a more transparent and community-focused marketplace. 
                Every contribution directly supports local businesses and community initiatives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/find">Find Services</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth/signup?role=provider">Join as Provider</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
