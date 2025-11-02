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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <Badge 
              variant="secondary" 
              className="mb-4 px-3 py-1 text-xs font-medium bg-orange-50 border-orange-100 text-orange-700"
            >
              <Heart className="w-3 h-3 mr-1.5 text-orange-600" />
              Nonprofit Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4 tracking-tight">
              Transparent, Zero-Cost Pricing
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We keep our fees minimal to support local businesses and community reinvestment. 
              No hidden costs, no surprise fees — just transparent pricing that works for everyone.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* How We Do It */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">How We Do It</h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* No Fees Card */}
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="text-center pb-4 pt-6">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-medium text-gray-900 mb-1">No Fees</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Browse and book services completely free
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600">No platform fees for consumers</p>
                </div>
                <ul className="space-y-2.5 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">Browse all providers</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">Request quotes</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">Secure booking</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">Leave reviews</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">Round-the-clock support</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-10 text-sm font-medium rounded-lg" 
                  asChild
                >
                  <Link href="/auth/signup?role=consumer">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Optional Donations Card */}
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="text-center pb-4 pt-6">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-medium text-gray-900 mb-1">Optional Donations</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Support our nonprofit mission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600">Suggested donation on bookings</p>
                </div>
                <ul className="space-y-2.5 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-sm text-gray-700">Support community programs</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-sm text-gray-700">Help local businesses</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-sm text-gray-700">Transparent reporting</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-sm text-gray-700">Completely optional</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full border border-orange-200 bg-white hover:bg-orange-50 text-orange-600 hover:text-orange-700 font-medium h-10 text-sm rounded-lg" 
                  asChild
                >
                  <Link href="/transparency">Learn More</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Service Providers */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">Service Providers</h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* The Problem with Other Platforms */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-medium text-gray-900 mb-5 text-center tracking-tight">How Other Platforms Make Money</h3>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p className="text-base">
                    Most lead generation platforms operate on pay-per-click (PPC) or pay-per-lead models. 
                    They earn revenue every time someone clicks on an ad or submits their information — 
                    regardless of whether that click or lead is genuine or fake.
                  </p>
                  <p className="text-base">
                    This creates a fundamental misalignment: <strong className="text-gray-900 font-medium">platforms have no financial incentive to stop fake traffic</strong>. 
                    In fact, they profit from it. Fake clicks still generate revenue. Fake leads still get charged. 
                    Some platforms exist almost entirely to create fake traffic, using click farms and bots to inflate numbers.
                  </p>
                  <p className="text-base">
                    Service providers end up paying for leads that are fabricated, stolen, or incentivized — 
                    wasting their marketing budgets on traffic that will never convert. Billions are lost annually to 
                    click fraud and fake lead generation, while platforms continue to profit from the deception.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Our Solution */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-medium text-gray-900 mb-6 text-center tracking-tight">Our Response to a Broken System</h3>
                <div className="text-center mb-10 space-y-5">
                  <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                    We observed everything — the fake traffic, the click fraud, the platforms profiting from deception. 
                    We built Haulers as a response to this broken system.
                  </p>
                  <p className="text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    We know what it takes to save businesses from wasting money on fake leads. We know how to build 
                    a superior product that actually serves service providers, not exploits them.
                  </p>
                  <div className="max-w-2xl mx-auto bg-orange-50 px-6 py-4 rounded-lg border-2 border-orange-200">
                    <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                      We are not here to sell fake leads. We will not touch leads with a ten foot pole.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">Easy Booking</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Streamlined booking software designed for service providers</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">Invoicing</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Automated invoicing to simplify your workflow</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">Review Management</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Tools to manage and showcase your customer reviews</p>
                  </div>
                </div>
                
                <div className="mt-10 pt-6 border-t border-gray-200">
                  <p className="text-center text-gray-700 leading-relaxed text-base max-w-2xl mx-auto">
                    Every experience is verified by our team. We build software to make booking easy, handle invoicing, 
                    and manage reviews — all backed by us who verify each interaction. No fake traffic. No click fraud. 
                    No wasted budgets. Just real connections between real service providers and real customers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comparison */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">How We Compare</h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <Card className="max-w-4xl mx-auto border border-gray-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-medium text-sm text-gray-900">Platform</th>
                      <th className="text-center py-4 px-6 font-medium text-sm text-gray-900">Platform Fee</th>
                      <th className="text-center py-4 px-6 font-medium text-sm text-gray-900">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-orange-50/30 hover:bg-orange-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-900">Haulers.app</td>
                      <td className="text-center py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-orange-500 text-white">
                          None
                        </span>
                      </td>
                      <td className="text-center py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-orange-500 text-white">
                          No cost
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-700 text-sm">TaskRabbit</td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥15%</span>
                      </td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥17.9%</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-700 text-sm">Thumbtack</td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥10%</span>
                      </td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥12.9%</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-700 text-sm">Angie's List</td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥8%</span>
                      </td>
                      <td className="text-center py-4 px-6">
                        <span className="text-base font-semibold text-gray-900">≥10.9%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">Frequently Asked Questions</h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900">Why are your fees so low?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 leading-relaxed">
                  We're a nonprofit organization focused on supporting local businesses and community reinvestment. 
                  Our low fees help service providers keep more of their earnings while still covering our operational costs.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900">How do you make money?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 leading-relaxed">
                  We generate revenue through our small platform fees and optional user donations. 
                  All revenue is transparently reported in our monthly ledgers, with the majority reinvested 
                  in community programs and infrastructure.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900">Are there any hidden fees?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 leading-relaxed">
                  No hidden fees whatsoever. The only costs are our transparent platform fees and 
                  Stripe's payment processing fee (2.9%). Everything else is clearly disclosed upfront.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900">Can I see how my money is used?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 leading-relaxed">
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
          <Card className="max-w-2xl mx-auto border border-gray-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-10">
              <h3 className="text-2xl md:text-3xl font-medium text-gray-900 mb-3 tracking-tight">Ready to Get Started?</h3>
              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
                Join our transparent marketplace and start connecting with local service providers today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 text-sm font-medium rounded-lg"
                  asChild
                >
                  <Link href="/auth/signup?role=consumer">Find Services</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium h-11 px-8 text-sm rounded-lg"
                  asChild
                >
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
