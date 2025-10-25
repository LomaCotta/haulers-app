import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Check, 
  Heart, 
  DollarSign, 
  Users, 
  Shield,
  TrendingUp,
  Star
} from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <Heart className="w-4 h-4 mr-1" />
              Nonprofit Pricing
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Transparent, Low-Cost Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We keep our fees minimal to support local businesses and community reinvestment. 
              No hidden costs, no surprise fees - just transparent pricing that works for everyone.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* For Consumers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">For Consumers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-green-200">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>No Fees</CardTitle>
                <CardDescription>
                  Browse and book services completely free
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">$0</div>
                  <p className="text-gray-600">No platform fees for consumers</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Browse all providers</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Request quotes</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Secure booking</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Leave reviews</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>24/7 support</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" asChild>
                  <Link href="/auth/signup?role=consumer">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Optional Donations</CardTitle>
                <CardDescription>
                  Support our nonprofit mission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">1%</div>
                  <p className="text-gray-600">Suggested donation on bookings</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-blue-600 mr-3" />
                    <span>Support community programs</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-blue-600 mr-3" />
                    <span>Help local businesses</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-blue-600 mr-3" />
                    <span>Transparent reporting</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-blue-600 mr-3" />
                    <span>Tax deductible</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-blue-600 mr-3" />
                    <span>Completely optional</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-6" asChild>
                  <Link href="/transparency">Learn More</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-gray-600" />
                </div>
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>
                  Secure payments through Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-600 mb-2">2.9%</div>
                  <p className="text-gray-600">Stripe processing fee</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Secure payment processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>PCI compliant</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Fraud protection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Multiple payment methods</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Instant deposits</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  This fee goes directly to Stripe, not to us
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* For Providers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">For Service Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-green-200">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Low Platform Fee</CardTitle>
                <CardDescription>
                  Keep more of your earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">2.5%</div>
                  <p className="text-gray-600">Maximum platform fee</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Much lower than competitors</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>No monthly subscription</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>No setup fees</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>No hidden costs</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span>Transparent reporting</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" asChild>
                  <Link href="/auth/signup?role=provider">Join as Provider</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                </div>
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>
                  Secure payments through Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-600 mb-2">2.9%</div>
                  <p className="text-gray-600">Stripe processing fee</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Secure payment processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>PCI compliant</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Fraud protection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Multiple payment methods</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-gray-600 mr-3" />
                    <span>Instant deposits</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  This fee goes directly to Stripe, not to us
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comparison */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How We Compare</h2>
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4">Platform</th>
                      <th className="text-center py-4 px-4">Platform Fee</th>
                      <th className="text-center py-4 px-4">Payment Processing</th>
                      <th className="text-center py-4 px-4">Monthly Fee</th>
                      <th className="text-center py-4 px-4">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-4 px-4 font-medium">Haulers.app</td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold">2.5%</td>
                      <td className="text-center py-4 px-4">2.9%</td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold">$0</td>
                      <td className="text-center py-4 px-4 text-green-600 font-bold">5.4%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 px-4">TaskRabbit</td>
                      <td className="text-center py-4 px-4">15%</td>
                      <td className="text-center py-4 px-4">2.9%</td>
                      <td className="text-center py-4 px-4">$0</td>
                      <td className="text-center py-4 px-4">17.9%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 px-4">Thumbtack</td>
                      <td className="text-center py-4 px-4">10-15%</td>
                      <td className="text-center py-4 px-4">2.9%</td>
                      <td className="text-center py-4 px-4">$0</td>
                      <td className="text-center py-4 px-4">12.9-17.9%</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4">Angie's List</td>
                      <td className="text-center py-4 px-4">8-12%</td>
                      <td className="text-center py-4 px-4">2.9%</td>
                      <td className="text-center py-4 px-4">$0</td>
                      <td className="text-center py-4 px-4">10.9-14.9%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Why are your fees so low?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We're a nonprofit organization focused on supporting local businesses and community reinvestment. 
                  Our low fees help service providers keep more of their earnings while still covering our operational costs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How do you make money?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We generate revenue through our small platform fees (2.5% max) and optional user donations. 
                  All revenue is transparently reported in our monthly ledgers, with the majority reinvested 
                  in community programs and infrastructure.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Are there any hidden fees?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  No hidden fees whatsoever. The only costs are our transparent platform fee (2.5% max) and 
                  Stripe's payment processing fee (2.9%). Everything else is clearly disclosed upfront.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Can I see how my money is used?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely! We publish detailed monthly financial reports showing exactly how every dollar 
                  is spent. You can view these reports publicly on our transparency page, including CSV downloads 
                  for analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Join our transparent marketplace and start connecting with local service providers today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/auth/signup?role=consumer">Find Services</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/signup?role=provider">Offer Services</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
