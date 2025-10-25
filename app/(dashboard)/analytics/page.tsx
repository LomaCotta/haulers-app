"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp, 
  Users, 
  Search, 
  MapPin, 
  Star, 
  DollarSign, 
  Clock, 
  Eye,
  MousePointer,
  Heart,
  MessageCircle,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Activity
} from "lucide-react"

interface AnalyticsData {
  overview: {
    total_searches: number
    total_businesses: number
    total_users: number
    total_bookings: number
    revenue: number
    conversion_rate: number
  }
  searches: {
    total: number
    by_category: { category: string; count: number }[]
    by_location: { location: string; count: number }[]
    popular_terms: { term: string; count: number }[]
  }
  businesses: {
    total: number
    verified: number
    by_category: { category: string; count: number }[]
    by_rating: { rating: string; count: number }[]
    new_this_month: number
  }
  users: {
    total: number
    new_this_month: number
    by_role: { role: string; count: number }[]
    active_users: number
  }
  bookings: {
    total: number
    completed: number
    pending: number
    cancelled: number
    revenue: number
    by_category: { category: string; count: number; revenue: number }[]
  }
  performance: {
    page_views: number
    bounce_rate: number
    avg_session_duration: number
    top_pages: { page: string; views: number }[]
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  // Mock data - in production, this would come from API
  const mockData: AnalyticsData = {
    overview: {
      total_searches: 15420,
      total_businesses: 1247,
      total_users: 8934,
      total_bookings: 3421,
      revenue: 125430,
      conversion_rate: 22.1
    },
    searches: {
      total: 15420,
      by_category: [
        { category: 'Moving', count: 3420 },
        { category: 'Cleaning', count: 2890 },
        { category: 'Plumbing', count: 2150 },
        { category: 'Electrical', count: 1890 },
        { category: 'HVAC', count: 1650 },
        { category: 'Painting', count: 1420 },
        { category: 'Other', count: 2000 }
      ],
      by_location: [
        { location: 'Los Angeles', count: 4200 },
        { location: 'New York', count: 3800 },
        { location: 'Chicago', count: 2900 },
        { location: 'Houston', count: 2100 },
        { location: 'Phoenix', count: 1800 },
        { location: 'Other', count: 620 }
      ],
      popular_terms: [
        { term: 'moving services', count: 1200 },
        { term: 'house cleaning', count: 980 },
        { term: 'plumber near me', count: 850 },
        { term: 'electrician', count: 720 },
        { term: 'hvac repair', count: 650 }
      ]
    },
    businesses: {
      total: 1247,
      verified: 892,
      by_category: [
        { category: 'Moving', count: 234 },
        { category: 'Cleaning', count: 189 },
        { category: 'Plumbing', count: 156 },
        { category: 'Electrical', count: 134 },
        { category: 'HVAC', count: 98 },
        { category: 'Painting', count: 87 },
        { category: 'Other', count: 343 }
      ],
      by_rating: [
        { rating: '5 stars', count: 456 },
        { rating: '4 stars', count: 234 },
        { rating: '3 stars', count: 123 },
        { rating: '2 stars', count: 45 },
        { rating: '1 star', count: 12 }
      ],
      new_this_month: 89
    },
    users: {
      total: 8934,
      new_this_month: 456,
      by_role: [
        { role: 'Customer', count: 7234 },
        { role: 'Provider', count: 1234 },
        { role: 'Admin', count: 12 }
      ],
      active_users: 3421
    },
    bookings: {
      total: 3421,
      completed: 2890,
      pending: 234,
      cancelled: 297,
      revenue: 125430,
      by_category: [
        { category: 'Moving', count: 1234, revenue: 45600 },
        { category: 'Cleaning', count: 890, revenue: 23400 },
        { category: 'Plumbing', count: 456, revenue: 18900 },
        { category: 'Electrical', count: 234, revenue: 15600 },
        { category: 'HVAC', count: 189, revenue: 12300 },
        { category: 'Other', count: 418, revenue: 9630 }
      ]
    },
    performance: {
      page_views: 456789,
      bounce_rate: 34.2,
      avg_session_duration: 4.2,
      top_pages: [
        { page: '/find', views: 123456 },
        { page: '/', views: 98765 },
        { page: '/categories', views: 45678 },
        { page: '/transparency', views: 23456 },
        { page: '/pricing', views: 12345 }
      ]
    }
  }

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData(mockData)
      setLoading(false)
    }, 1000)
  }, [timeRange])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Platform performance and user insights</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="searches">Searches</SelectItem>
              <SelectItem value="businesses">Businesses</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.total_searches.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.total_businesses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.total_users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +15% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.overview.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +22% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Search Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Searches by Category</h4>
                  <div className="space-y-2">
                    {data.searches.by_category.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(item.count / data.searches.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Popular Search Terms</h4>
                  <div className="space-y-1">
                    {data.searches.popular_terms.map((term, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{term.term}</span>
                        <span className="font-medium">{term.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Business Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.businesses.total}</div>
                    <div className="text-sm text-gray-600">Total Businesses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.businesses.verified}</div>
                    <div className="text-sm text-gray-600">Verified</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Businesses by Category</h4>
                  <div className="space-y-2">
                    {data.businesses.by_category.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.category}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Rating Distribution</h4>
                  <div className="space-y-2">
                    {data.businesses.by_rating.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.rating}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${(item.count / data.businesses.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.users.total}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.users.active_users}</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Users by Role</h4>
                  <div className="space-y-2">
                    {data.users.by_role.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.role}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Booking Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.bookings.total}</div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">${data.bookings.revenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Revenue</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Booking Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Completed</span>
                      <Badge variant="default">{data.bookings.completed}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending</span>
                      <Badge variant="secondary">{data.bookings.pending}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cancelled</span>
                      <Badge variant="destructive">{data.bookings.cancelled}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Revenue by Category</h4>
                  <div className="space-y-2">
                    {data.bookings.by_category.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.category}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">${item.revenue.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{item.count} bookings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold">{data.performance.page_views.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Page Views</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.performance.bounce_rate}%</div>
                <div className="text-sm text-gray-600">Bounce Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.performance.avg_session_duration}m</div>
                <div className="text-sm text-gray-600">Avg Session Duration</div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">Top Pages</h4>
              <div className="space-y-2">
                {data.performance.top_pages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{page.page}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${(page.views / data.performance.page_views) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{page.views.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
