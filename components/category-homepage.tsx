"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Heart, 
  BarChart3, 
  MapPin, 
  Star, 
  Users, 
  CheckCircle,
  ArrowRight
} from "lucide-react"
import { ServiceCategory } from "@/config/service-categories"

interface CategoryHomepageProps {
  category: ServiceCategory
}

export function CategoryHomepage({ category }: CategoryHomepageProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Heart className="w-4 h-4 mr-1" />
              {category.icon} {category.name} Services
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Find Trusted {category.name} Professionals
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {category.seoDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/find">
                <Button size="lg" className="w-full sm:w-auto">
                  Find {category.name} Services
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup?role=provider">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Join as {category.name} Provider
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose Our {category.name} Services?
              </h2>
              <p className="text-lg text-gray-600">
                Professional {category.name.toLowerCase()} services with complete transparency
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Verified {category.name} Professionals</CardTitle>
                  <CardDescription>
                    All {category.name.toLowerCase()} providers are thoroughly verified and background checked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      License verification
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Insurance coverage
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Background checks
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Fair Pricing</CardTitle>
                  <CardDescription>
                    Low 2.5% platform fees with transparent financial reporting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">2.5%</div>
                  <p className="text-sm text-gray-600">
                    Maximum platform fee (vs 10-15% for other platforms)
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Complete Transparency</CardTitle>
                  <CardDescription>
                    Monthly financial reports and public ledgers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Public financial reports
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Community reinvestment tracking
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Open source governance
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How Our {category.name} Services Work
              </h2>
              <p className="text-lg text-gray-600">
                Simple, transparent, and community-focused {category.name.toLowerCase()} services
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">1. Find {category.name} Services</h3>
                <p className="text-gray-600">
                  Search for verified {category.name.toLowerCase()} professionals in your area with transparent pricing and reviews.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">2. Book & Communicate</h3>
                <p className="text-gray-600">
                  Book your {category.name.toLowerCase()} service and communicate directly with providers through our secure platform.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Star className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">3. Review & Support</h3>
                <p className="text-gray-600">
                  Leave reviews for completed {category.name.toLowerCase()} jobs and support community reinvestment through our platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Find {category.name} Services?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join our transparent marketplace and support local {category.name.toLowerCase()} professionals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/find">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Find {category.name} Services Now
                </Button>
              </Link>
              <Link href="/transparency">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-600">
                  View Transparency Report
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
