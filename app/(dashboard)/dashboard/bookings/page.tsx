import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, DollarSign, Search, Filter } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface BookingsPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const { status, search } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please sign in to view your bookings.</div>
  }

  // Get user's profile to determine if they're a provider
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isProvider = profile?.role === "provider"

  // Build query based on user role
  let query = supabase
    .from("bookings")
    .select(`
      *,
      business:businesses(*),
      customer:profiles!bookings_customer_id_fkey(*)
    `)

  if (isProvider) {
    // Providers see bookings for their businesses
    query = query.eq("business.owner_id", user.id)
  } else {
    // Customers see their own bookings
    query = query.eq("customer_id", user.id)
  }

  // Apply filters
  if (status) {
    query = query.eq("status", status)
  }

  if (search) {
    query = query.or(`pickup_address.ilike.%${search}%,dropoff_address.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data: bookings, error } = await query.order("created_at", { ascending: false })

  if (error) {
    return <div>Error loading bookings: {error.message}</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "confirmed": return "bg-green-100 text-green-800"
      case "in_progress": return "bg-blue-100 text-blue-800"
      case "completed": return "bg-gray-100 text-gray-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-muted-foreground">
              {isProvider ? "Manage your business bookings" : "Track your service requests"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search bookings..."
                className="pl-10"
                defaultValue={search}
              />
            </div>
          </div>
          <Select defaultValue={status}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold">
                          Booking #{booking.id.slice(0, 8)}
                        </h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Pickup</p>
                            <p className="text-sm text-muted-foreground">{booking.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Dropoff</p>
                            <p className="text-sm text-muted-foreground">{booking.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {booking.description && (
                        <p className="text-sm text-muted-foreground mb-4">{booking.description}</p>
                      )}

                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(booking.created_at), "MMM d, yyyy")}</span>
                        </div>
                        {booking.preferred_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Prefers: {format(new Date(booking.preferred_date), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        {booking.estimated_value && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Est. ${booking.estimated_value}</span>
                          </div>
                        )}
                      </div>

                      {/* Show business or customer info */}
                      <div className="mt-4 pt-4 border-t">
                        {isProvider ? (
                          <div>
                            <p className="text-sm font-medium">Customer</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.customer?.full_name} • {booking.contact_phone}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium">Provider</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.business?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {isProvider 
                    ? "No bookings found for your businesses." 
                    : "You haven't made any bookings yet."}
                </p>
                {!isProvider && (
                  <Link href="/find">
                    <Button className="mt-4">Find Services</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
