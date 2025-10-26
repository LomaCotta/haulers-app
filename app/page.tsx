"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Shield, 
  Heart, 
  BarChart3, 
  MapPin, 
  Star, 
  Users, 
  Building2,
  CheckCircle,
  ArrowRight,
  Search
} from "lucide-react"
import { CategoryHomepage } from "@/components/category-homepage"
import { useServiceCategory } from "@/hooks/use-service-category"

export default function HomePage() {
  const serviceCategory = useServiceCategory()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")

  // If we're on a service category subdomain, show category-specific homepage
  if (serviceCategory) {
    return <CategoryHomepage category={serviceCategory} />
  }

  const handleSearch = () => {
    if (searchQuery.trim() || location.trim()) {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      if (location.trim()) {
        params.set('location', location.trim())
      }
      router.push(`/find?${params.toString()}`)
    } else {
      router.push('/find')
    }
  }

  const handleServiceClick = (service: string) => {
    setSearchQuery(service)
  }
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden -mt-16 pt-16">
        {/* Full Background Hero Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/haulers-hero.png')"
          }}
        ></div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
              {/* Text Content */}
              <div className="text-center lg:text-left">
                <Badge variant="secondary" className="mb-6 bg-white/90 backdrop-blur-sm">
                  <Heart className="w-4 h-4 mr-1" />
                  Nonprofit Marketplace
                </Badge>
                <h1 className="text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight drop-shadow-lg">
                  Find Local Services
                </h1>
                <p className="text-xl lg:text-2xl text-white mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-lg font-medium">
                  Connect with trusted local service providers. 
                  Transparent pricing, verified businesses, and community-focused platform.
                </p>
                
                {/* Search Section */}
                <div className="bg-white rounded-2xl p-6 shadow-2xl mb-8 max-w-6xl border border-gray-100">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-[2]">
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-green-600 transition-colors" />
                        <Input
                          placeholder="What service do you need?"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          className="pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-gray-50 hover:bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-green-600 transition-colors" />
                        <Input
                          placeholder="Zip code or city"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          className="pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 bg-gray-50 hover:bg-white"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      size="lg" 
                      onClick={handleSearch}
                      className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Search
                    </Button>
                  </div>
                  
                  {/* Quick Categories */}
                  <div className="mt-6">
                    <p className="text-gray-600 text-base font-medium mb-3">Popular Services:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {['Moving', 'Cleaning', 'Plumbing', 'Electrical', 'HVAC'].map((service) => (
                        <Button
                          key={service}
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceClick(service)}
                          className="px-3 py-2 text-sm font-medium rounded-full border border-gray-200 bg-white hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition-all duration-200"
                        >
                          {service}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                  <Link href="/auth/signup?role=provider">
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto text-lg px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-200 font-semibold"
                    >
                      Join as Provider
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Right side - empty to let background image show through */}
              <div className="hidden lg:block"></div>
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
                Why Choose Haulers.app?
              </h2>
              <p className="text-lg text-gray-600">
                Built for transparency, community, and fair pricing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Verified Providers</CardTitle>
                  <CardDescription>
                    All businesses are thoroughly verified and background checked
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
                  <CardTitle>Nonprofit Model</CardTitle>
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

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Trusted by the Community
              </h2>
              <p className="text-lg text-gray-600">
                Real impact through transparent operations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                <p className="text-gray-600">Verified Providers</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">2,500+</div>
                <p className="text-gray-600">Successful Jobs</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">$50K+</div>
                <p className="text-gray-600">Community Reinvestment</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">4.8★</div>
                <p className="text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-lg text-gray-600">
                Simple, transparent, and community-focused
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">1. Find Services</h3>
                <p className="text-gray-600">
                  Search for verified movers and haulers in your area with transparent pricing and reviews.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">2. Book & Communicate</h3>
                <p className="text-gray-600">
                  Book your service and communicate directly with providers through our secure platform.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Star className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">3. Review & Support</h3>
                <p className="text-gray-600">
                  Leave reviews for completed jobs and support community reinvestment through our platform.
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
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join our transparent marketplace and support local businesses
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/find">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Find Services Now
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
