import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Heart,
  Calendar,
  BarChart3,
  Check,
  MessageCircle,
  Coffee
} from 'lucide-react'

export default function TransparencyPage() {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <Badge 
              variant="secondary" 
              className="mb-4 px-3 py-1 text-xs font-medium bg-orange-50 border-orange-100 text-orange-700"
            >
              <Heart className="w-3 h-3 mr-1.5 text-orange-600" />
              Nonprofit Transparency
            </Badge>
            <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4 tracking-tight">
              Transparent by Design
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We believe in complete transparency. Every dollar earned through platform fees 
              will be tracked, reported, and reinvested in our community.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* The Hidden Tax */}
        <div className="mb-20 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">
              The Hidden Tax on Communities
            </h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          
          <Card className="border border-gray-200 bg-white shadow-sm mb-8">
            <CardContent className="p-10">
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  Every dollar spent on Google Ads, Facebook ads, and digital marketing platforms 
                  flows out of your community through internet wires. This money doesn't stay local. 
                  It goes to headquarters in Silicon Valley, Seattle, and other tech hubs, funding 
                  the development of cities thousands of miles away — not your community.
                </p>
                <p className="text-lg">
                  What local businesses pay for marketing has become a hidden tax on communities. 
                  Billions flow out every year, extracted from Main Street businesses and funneled 
                  into corporate campuses, luxury real estate in tech cities, and shareholder returns — 
                  while local economies struggle.
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  We're built by people who understand this extraction. We know that we — the users 
                  — are the ones driving reviews to these platforms, pumping them up with our content, 
                  our searches, our clicks. Yet the value we create flows away from us.
                </p>
                <p className="text-lg">
                  That's why we code for clarity. We're building to save the business ecosystem — to 
                  keep resources flowing back into the communities that generate them, not into distant 
                  data centers and executive bonuses.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-orange-200 bg-orange-50/50 shadow-sm">
            <CardContent className="p-8">
              <h3 className="text-2xl font-medium text-gray-900 mb-6 tracking-tight">Our Commitment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">100% Transparency</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Every dollar tracked, every expense reported. No hidden fees, no creative accounting.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Community Reinvestment</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Revenue stays local, supporting the businesses and communities that generate it.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">No Extraction</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        We don't take your money to build our wealth. We build software to keep wealth in your community.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-orange-100 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Real Value</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        We understand that users create the value on these platforms. We're here to serve that value, not extract it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">
              Our Promise
            </h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 pt-6">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-center text-lg font-medium text-gray-900 mb-1">
                  Zero Platform Fees
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  We keep fees minimal to support local businesses
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="text-2xl font-semibold text-gray-900 mb-1">No cost</div>
                <p className="text-xs text-gray-600">
                  All revenue reinvested in the community
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 pt-6">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-center text-lg font-medium text-gray-900 mb-1">
                  Public Ledgers
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Monthly financial reports available to everyone
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="text-2xl font-semibold text-gray-900 mb-1">100%</div>
                <p className="text-xs text-gray-600">
                  Transparent financial reporting
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 pt-6">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-center text-lg font-medium text-gray-900 mb-1">
                  Community Reinvestment
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Revenue supports local initiatives and infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="text-2xl font-semibold text-gray-900 mb-1">Local</div>
                <p className="text-xs text-gray-600">
                  Money stays in your community
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Status */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">
              Financial Status
            </h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <Badge variant="outline" className="text-xs">Current</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Platform Fees</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Donations</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Infrastructure</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Community Grants</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                </div>
                <div className="text-center py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    No transactions yet — we just launched!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Previous Month</CardTitle>
                <CardDescription className="text-xs">Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Platform Fees</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Donations</span>
                    <span className="font-medium text-gray-900">$780</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">In-Kind Contributions</span>
                    <span className="font-medium text-gray-900">$6,500</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Infrastructure</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Community Grants</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                </div>
                <div className="text-center py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Thank you for your generous support! We received $780 in cash donations and $6,500 in developer work contributions.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Two Months Ago</CardTitle>
                <CardDescription className="text-xs">Monthly transparency report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Platform Fees</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Donations</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Infrastructure</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Community Grants</span>
                    <span className="font-medium text-gray-900">$0</span>
                  </div>
                </div>
                <div className="text-center py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    No transactions yet
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-3 tracking-tight">
              How Our Transparency Works
            </h2>
            <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 pt-6">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-medium text-gray-900 mb-1">Monthly Reports</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Every month, we publish a detailed financial report showing all income, 
                  expenses, and community reinvestment. These reports are available to 
                  everyone for complete transparency.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Platform fee income from transactions</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Donation income from users</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Infrastructure and operational costs</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Community grants and reinvestment</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Staff and administrative expenses</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4 pt-6">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-medium text-gray-900 mb-1">Community Impact</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Our revenue directly supports local communities through grants, 
                  infrastructure improvements, and business development programs.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Small business development grants</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Local infrastructure improvements</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Community event sponsorships</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Educational programs for providers</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded bg-orange-100 flex items-center justify-center mr-2 mt-0.5">
                      <Check className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Emergency relief funds</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-10">
              <h3 className="text-2xl md:text-3xl font-medium text-gray-900 mb-3 tracking-tight">
                Support Our Mission
              </h3>
              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
                Help us build a more transparent and community-focused marketplace. 
                Every contribution directly supports local businesses and community initiatives.
              </p>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 text-sm font-medium rounded-lg"
                    asChild
                  >
                    <Link href="/find">Find Services</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium h-11 px-8 text-sm rounded-lg"
                    asChild
                  >
                    <Link href="/auth/signup?role=provider">Join as Provider</Link>
                  </Button>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                    <Button 
                      variant="outline"
                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium h-11 px-6 text-sm rounded-lg"
                      asChild
                    >
                      <Link href="https://discord.gg/duwuQTgsUF" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Join Discord
                      </Link>
                    </Button>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
                    <div className="text-center mb-4">
                      <p className="text-base font-semibold text-gray-900 mb-2">
                        Your Donations Keep This Platform Free & Ad-Free
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed max-w-xl mx-auto">
                        We build this platform ourselves, spending our own time without charging you fees. 
                        Your donations ensure you never see ads and never pay for anything. Every dollar 
                        keeps this service running — simple, transparent, and effective.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <Button 
                        className="bg-orange-500 hover:bg-orange-600 text-white font-medium h-11 px-8 text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        asChild
                      >
                        <Link href="https://buymeacoffee.com/haulers" target="_blank" rel="noopener noreferrer">
                          <Coffee className="w-4 h-4 mr-2" />
                          Support With a Donation
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
