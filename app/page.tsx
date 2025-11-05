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

      {/* Customer Support Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                  </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Need Help? We're Here For You
                </h2>
                
                <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                  Whether you need help with a service provider, have questions about your booking, want to learn more about our platform, or anything else - 
                  <br />
                  <span className="text-orange-600 font-semibold">Our team is committed to helping you get the support you need quickly and effectively.</span>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Phone Contact */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800">Call Us</h3>
                    </div>
                    <a 
                      href="tel:+13102954181" 
                      className="text-2xl font-bold text-orange-600 hover:text-red-600 transition-colors block mb-2"
                    >
                      (310) 295-4181
                    </a>
                    <p className="text-sm text-gray-600">
                      Available for immediate assistance and personalized support
                    </p>
                  </div>
                  
                  {/* Email Contact */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800">Email Us</h3>
                    </div>
                    <a 
                      href="mailto:support@haulers.app" 
                      className="text-lg font-semibold text-blue-600 hover:text-indigo-600 transition-colors break-all block mb-2"
                    >
                      support@haulers.app
                    </a>
                    <p className="text-sm text-gray-600">
                      Perfect for detailed questions or if you prefer written communication
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">How We Can Help:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Service provider questions and support
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Platform features and navigation help
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Booking and scheduling assistance
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Payment and billing support
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      Account and profile management
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      General questions about our platform
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Community Values Section */}
      <section className="relative py-20 bg-gray-50 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{
            backgroundImage: "url('/sweat-equity.png')"
          }}
        ></div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Building Something Different
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                We're creating a transparent, community-focused marketplace where fairness and honesty come first. 
                Join us in building something better than the status quo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-6">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Community First</h3>
                <p className="text-gray-600 leading-relaxed">
                  Every decision we make prioritizes our community over profits. 
                  We're building this platform for you, not for shareholders.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-6">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Complete Transparency</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our financial reports are public. You can see exactly how we're using 
                  platform fees and where every dollar goes.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Fair for Everyone</h3>
                <p className="text-gray-600 leading-relaxed">
                  Low platform fees mean more money stays with service providers 
                  and fairer prices for customers. All revenue is reinvested in the community.
                </p>
              </div>
            </div>

            <div className="mt-16 text-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200 max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Be Part of Something Better
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  We're building a platform that truly serves our community. Your feedback and participation help shape what we become—join us in creating something better together.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup?role=provider">
                    <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                      Join as Provider
                    </Button>
                  </Link>
                  <Link href="/find">
                    <Button size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                      Find Services
                    </Button>
                  </Link>
                </div>
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
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join our transparent marketplace and support local businesses
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/find">
                <Button size="lg" className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-bold px-8 py-4 shadow-lg">
                  Find Services Now
                </Button>
              </Link>
              <Link href="/transparency">
                <Button size="lg" className="w-full sm:w-auto bg-orange-600 text-white hover:bg-orange-700 font-bold px-8 py-4 shadow-lg">
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
