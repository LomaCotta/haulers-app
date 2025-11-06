'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MissionForm } from '@/components/mission-form'
import { 
  Heart, 
  Shield, 
  Zap, 
  Users, 
  Lock, 
  CheckCircle, 
  DollarSign,
  Github,
  MessageSquare,
  ExternalLink,
  ArrowRight,
  Building,
  FileText,
  Eye,
  UserPlus,
  CheckSquare,
  Share2,
  UserCheck,
  MapPin,
  Code,
  X,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function MissionPage() {
  const [openForm, setOpenForm] = useState<string | null>(null)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' })
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Haulers.app Mission</h1>
          <p className="text-2xl md:text-3xl font-semibold mb-4">We build tools—not tolls.</p>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto leading-relaxed">
            Haulers.app is a nonprofit, open project to end the "pay-to-exist" tax on local business.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Intro */}
        <div className="text-center mb-16">
          <p className="text-xl text-gray-700 leading-relaxed mb-6">
            We're replacing ad auctions and fake-lead marketplaces with free, transparent software that helps real customers find real providers—without extraction.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-base">
              <Shield className="w-4 h-4 mr-2" />
              No platform fees
            </Badge>
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-base">
              <Lock className="w-4 h-4 mr-2" />
              No paywalls
            </Badge>
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-base">
              <Eye className="w-4 h-4 mr-2" />
              No tricks
            </Badge>
          </div>
          <p className="text-lg text-gray-600 italic">
            Just open tools, public ledgers, and a community that keeps value local.
          </p>
        </div>

        {/* Why We Exist */}
        <Card className="mb-12 border-2 border-orange-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Heart className="w-8 h-8 mr-3 text-orange-600" />
              Why We Exist (and why now)
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="text-lg">
                Every year, billions flow out of neighborhoods through ad platforms and lead farms.
              </p>
              <p className="text-lg">
                Clicks get sold. Leads get resold. Budgets get burned.
              </p>
              <p className="text-xl font-semibold text-orange-700 mt-6">
                We're done feeding that machine.
              </p>
              <div className="bg-orange-50 rounded-lg p-6 mt-6 space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900">The hidden tax:</strong> Ad spend drains local cash to distant HQs.
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900">The perverse incentive:</strong> Platforms profit even from fake clicks and fake leads.
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900">The result:</strong> Small businesses pay more to be seen—and customers trust less.
                  </div>
                </div>
              </div>
              <p className="text-lg mt-6">
                <strong className="text-gray-900">Our answer:</strong> open, verifiable software + public accounting, so the value we create stays where it belongs—in the community.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What We're Building */}
        <Card className="mb-12 border-2 border-blue-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Zap className="w-8 h-8 mr-3 text-blue-600" />
              What We're Building (free forever)
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Category by category, we're releasing free booking, review, and operations tools—starting with Movers and expanding to every local trade.
            </p>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              Use them directly on Haulers.app at zero cost:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                  Find & Book
                </h3>
                <p className="text-gray-700">clean search, verified listings, no ads, no upsells.</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Invoicing
                </h3>
                <p className="text-gray-700">simple, automated, built for service work.</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 border border-yellow-200">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-yellow-600" />
                  Reviews
                </h3>
                <p className="text-gray-700">job-verified, bot-resistant, useful (not gamed).</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                  Operations
                </h3>
                <p className="text-gray-700">availability, quotes, deposits—without "lead fees."</p>
              </div>
            </div>
            <div className="mt-6 bg-gray-100 rounded-lg p-5">
              <h3 className="font-bold text-lg mb-2 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-600" />
                Transparency
              </h3>
              <p className="text-gray-700">every month, a public ledger of income/expenses.</p>
            </div>
            <p className="text-xl font-semibold text-gray-900 mt-6 text-center">
              You don't pay us to be visible. Visibility is the point.
            </p>
          </CardContent>
        </Card>

        {/* How We Fund This */}
        <Card className="mb-12 border-2 border-green-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-600" />
              How We Fund This (so it stays free)
            </h2>
            <p className="text-lg text-gray-700 mb-6 font-semibold">
              We refuse extraction economics. Here's our model:
            </p>
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="font-bold text-xl mb-3 flex items-center">
                  <Heart className="w-6 h-6 mr-2 text-green-600" />
                  Donations
                </h3>
                <p className="text-gray-700">
                  If you believe in what we're building, chip in. We publish every dollar in a monthly report.
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-bold text-xl mb-3 flex items-center">
                  <Building className="w-6 h-6 mr-2 text-blue-600" />
                  Service, not tolls
                </h3>
                <p className="text-gray-700 mb-2">
                  Need the same tools embedded on your own site (iframe/white-label, custom domain, booking link integration, data export)?
                </p>
                <p className="text-gray-700">
                  We'll do it for a clear service fee—no percentage skim, no dark patterns.
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-6">
                <h3 className="font-bold text-xl mb-3">Everything else</h3>
                <p className="text-gray-700 text-lg font-semibold">
                  free on Haulers.app for everyone.
                </p>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900 mt-6 text-center">
              We earn by helping you run, not by taxing you to be seen.
            </p>
          </CardContent>
        </Card>

        {/* Transparent Pricing */}
        <Card className="mb-12 border-2 border-purple-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-purple-600" />
              Transparent, Zero-Cost Pricing
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">For consumers:</strong> Browse, request quotes, book, review—free.
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">For providers:</strong> Get discovered, manage jobs, invoice—free on Haulers.app.
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">Optional:</strong> White-label/embedding, advanced integrations, and migrations—paid services at published rates.
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">Donations:</strong> Keep the platform ad-free and community-owned.
                </div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-gray-900 font-semibold">
                ❌ No hidden fees. ❌ No "boost for $500." ❌ No platform tax.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What's Already Live */}
        <Card className="mb-12 border-2 border-indigo-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Zap className="w-8 h-8 mr-3 text-indigo-600" />
              What's Already Live
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">Movers category:</strong> booking, quotes, deposits, verified reviews, provider dashboards.
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">Public transparency:</strong> monthly ledger posts (CSV + notes).
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-gray-900">Community support:</strong> Discord, open roadmap, issue tracker.
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-700 mt-6">
              Next up: electricians, plumbers, cleaners, landscapers, handypeople—one by one, we ship free software that ends the "lead tax."
            </p>
          </CardContent>
        </Card>

        {/* Founding Supporter */}
        <Card className="mb-12 border-2 border-orange-300 shadow-xl bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="w-8 h-8 mr-3 text-orange-600" />
              Join as a Founding Supporter (FOMO is real)
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Founding supporters help lock in the culture: open code, open books, open doors.
            </p>
            <p className="text-lg font-semibold text-gray-900 mb-4">Early backers get:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Founding badge on profile and provider pages</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Early influence on features and category order</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Name in the ledger (or anonymous—your call)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Priority access to white-label pilots and migrations</span>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              This is the window where a handful of people set the tone for the next decade.
            </p>
            <p className="text-lg text-gray-700 italic mb-6">
              Don't just watch it happen—shape it.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                <Heart className="w-4 h-4 mr-2" />
                Become a Founding Supporter
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Our Promises */}
        <Card className="mb-12 border-2 border-gray-300 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-gray-600" />
              Our Promises
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                <h3 className="font-bold text-lg mb-2">100% Transparency</h3>
                <p className="text-gray-700">Every dollar tracked, every expense explained.</p>
              </div>
              <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                <h3 className="font-bold text-lg mb-2">Community Reinvestment</h3>
                <p className="text-gray-700">Revenue funds tools, support, and local programs—not shareholders.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-200">
                <h3 className="font-bold text-lg mb-2">No Extraction</h3>
                <p className="text-gray-700">We don't sell your attention. We don't tax your visibility.</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                <h3 className="font-bold text-lg mb-2">Real Value</h3>
                <p className="text-gray-700">Tools that reduce costs, save time, and build trust—free where it matters.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        <Card className="mb-12 border-2 border-gray-300 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-8 h-8 mr-3 text-gray-600" />
              How We Compare (plain English)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-4 text-left font-bold text-gray-900">Platform</th>
                    <th className="border border-gray-300 p-4 text-left font-bold text-gray-900">Platform Fee</th>
                    <th className="border border-gray-300 p-4 text-left font-bold text-gray-900">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-4 font-semibold text-green-700">Haulers</td>
                    <td className="border border-gray-300 p-4 text-green-700">None</td>
                    <td className="border border-gray-300 p-4 text-green-700 font-semibold">No cost</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-4">TaskRabbit</td>
                    <td className="border border-gray-300 p-4">≥15%</td>
                    <td className="border border-gray-300 p-4">≥17.9%</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-4">Thumbtack</td>
                    <td className="border border-gray-300 p-4">≥10%</td>
                    <td className="border border-gray-300 p-4">≥12.9%</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-4">Angie's</td>
                    <td className="border border-gray-300 p-4">≥8%</td>
                    <td className="border border-gray-300 p-4">≥10.9%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xl font-semibold text-gray-900 mt-6 text-center">
              We don't win by charging less for the same game.
            </p>
            <p className="text-xl font-semibold text-gray-900 text-center">
              We win by ending the game.
            </p>
          </CardContent>
        </Card>

        {/* What Your Donation Does */}
        <Card className="mb-12 border-2 border-orange-200 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Heart className="w-8 h-8 mr-3 text-orange-600" />
              What Your Donation Does This Month
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Keeps it ad-free (no compromises)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Pays for infra (hosting, maps, email, moderation)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Funds build-out of the next category (your vote matters)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Supports verification (human checks, fraud prevention)</span>
              </div>
            </div>
            <p className="text-lg text-gray-700 italic mb-6">
              You're not "tipping a website." You're funding infrastructure your local economy actually needs.
            </p>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" asChild>
              <a href="https://buymeacoffee.com/haulers" target="_blank" rel="noopener noreferrer">
                <Heart className="w-4 h-4 mr-2" />
                Donate Now (any amount helps)
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* White-Label */}
        <Card className="mb-12 border-2 border-blue-200 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Building className="w-8 h-8 mr-3 text-blue-600" />
              White-Label & Embeds (optional service)
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              Want our tools on your own site (or a city's site)?
            </p>
            <p className="text-lg font-semibold text-gray-900 mb-4">We'll implement:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Embed/iframe or custom theme</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Booking links + provider sync</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Domain mapping (e.g., movers.yourbrand.com)</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <span className="text-gray-700">Data export & portability (your data = yours)</span>
              </div>
            </div>
            <p className="text-lg text-gray-700 mb-4">
              Clear flat fees, published rates, no revenue share, no lock-in.
            </p>
            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setOpenForm('white_label_demo')}>
              Talk to us → "White-label Request"
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="mb-12 border-2 border-gray-300 shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <MessageSquare className="w-8 h-8 mr-3 text-gray-600" />
              FAQ
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Are you a nonprofit?</h3>
                <p className="text-gray-700">
                  We operate as a nonprofit mission with open ledgers and community governance. As we formalize status across regions, donations fund the mission and are publicly reported.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">How do you make money without ads or lead fees?</h3>
                <p className="text-gray-700">
                  Donations + optional services (white-label/embedding/integration). The core platform stays free.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Will you ever charge providers to be listed?</h3>
                <p className="text-gray-700 font-semibold">
                  No. That's the problem we're here to solve.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">How do I know donations aren't wasted?</h3>
                <p className="text-gray-700">
                  Monthly CSVs + narrative reports. Infra, staffing, grants—everything is itemized.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Involved */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Get Involved</h2>
            <p className="text-xl text-gray-600">Join us in building tools that keep value local</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Providers */}
            <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center mb-5">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Providers</h3>
                </div>
                <div className="space-y-2.5 flex-1">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-blue-200 hover:bg-blue-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => window.location.href = '/dashboard/businesses'}
                  >
                    <UserPlus className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Claim your profile (free)</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-blue-200 hover:bg-blue-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => setOpenForm('discord_join')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Join the Discord</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-blue-200 hover:bg-blue-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => setOpenForm('category_vote')}
                  >
                    <CheckSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Vote the next category</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Supporters */}
            <Card className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center mb-5">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Heart className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Supporters</h3>
                </div>
                <div className="space-y-2.5 flex-1">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 hover:bg-green-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    asChild
                  >
                    <a href="https://buymeacoffee.com/haulers" target="_blank" rel="noopener noreferrer">
                      <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-left">Donate</span>
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 hover:bg-green-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: 'Haulers.app Mission',
                            text: 'We build tools—not tolls. Free software for local businesses.',
                            url: window.location.href
                          })
                          setToast({ show: true, message: 'Thanks for sharing!', type: 'success' })
                        } else {
                          await navigator.clipboard.writeText(window.location.href)
                          setToast({ show: true, message: 'Link copied to clipboard!', type: 'success' })
                        }
                        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
                      } catch (error) {
                        // User cancelled share or error occurred
                        if (error instanceof Error && error.name !== 'AbortError') {
                          setToast({ show: true, message: 'Failed to share. Please try again.', type: 'error' })
                          setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
                        }
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Share our mission</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-200 hover:bg-green-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => setOpenForm('founding_supporter')}
                  >
                    <UserCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Become a founding supporter</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Civic Partners */}
            <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center mb-5">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Civic Partners</h3>
                </div>
                <div className="space-y-2.5 flex-1">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-purple-200 hover:bg-purple-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => setOpenForm('city_node_pilot')}
                  >
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Pilot a city node</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-purple-200 hover:bg-purple-50 text-gray-700 text-sm py-2.5 px-3 h-auto whitespace-normal break-words"
                    onClick={() => setOpenForm('white_label_demo')}
                  >
                    <Code className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-left">Request a white-label demo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Modals */}
        <MissionForm
          isOpen={openForm === 'discord_join'}
          onClose={() => setOpenForm(null)}
          type="discord_join"
          title="Join the Discord"
          description="Get access to our community Discord server for updates, discussions, and support."
        />
        <MissionForm
          isOpen={openForm === 'category_vote'}
          onClose={() => setOpenForm(null)}
          type="category_vote"
          title="Vote for Next Category"
          description="Help us decide which service category to build next. Your vote matters!"
        />
        <MissionForm
          isOpen={openForm === 'donation'}
          onClose={() => setOpenForm(null)}
          type="donation"
          title="Make a Donation"
          description="Support our mission to keep tools free for local businesses. Every dollar helps!"
        />
        <MissionForm
          isOpen={openForm === 'founding_supporter'}
          onClose={() => setOpenForm(null)}
          type="founding_supporter"
          title="Become a Founding Supporter"
          description="Join our founding supporters and help shape the future of Haulers.app."
        />
        <MissionForm
          isOpen={openForm === 'city_node_pilot'}
          onClose={() => setOpenForm(null)}
          type="city_node_pilot"
          title="Pilot a City Node"
          description="Interested in piloting Haulers.app in your city? Let's talk!"
        />
        <MissionForm
          isOpen={openForm === 'white_label_demo'}
          onClose={() => setOpenForm(null)}
          type="white_label_demo"
          title="Request White-Label Demo"
          description="Get a demo of our white-label solution for your organization."
        />

        {/* One Line */}
        <div className="text-center py-12">
          <p className="text-3xl font-bold text-gray-900 italic">
            We build software to keep wealth in your community.
          </p>
          <p className="text-2xl text-gray-600 mt-4">
            No tolls. No tricks. Just tools.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md transition-all ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors ${
                toast.type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
              }`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

