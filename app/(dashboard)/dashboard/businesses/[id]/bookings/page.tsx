import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, DollarSign, User, Phone, Mail } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface BusinessBookingsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BusinessBookingsPage({ params }: BusinessBookingsPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get business and verify ownership
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single()

  if (businessError || !business) {
    notFound()
  }

  // Get bookings for this business
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(*)
    `)
    .eq("business_id", id)
    .order("created_at", { ascending: false })

  if (bookingsError) {
    return <div>Error loading bookings: {bookingsError.message}</div>
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
            <h1 className="text-3xl font-bold">Bookings for {business.name}</h1>
            <p className="text-muted-foreground">Manage customer requests and quotes</p>
          </div>
          <Link href={`/dashboard/businesses/${id}`}>
            <Button variant="outline">Back to Business</Button>
          </Link>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">
                        Booking #{booking.id.slice(0, 8)}
                      </h3>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                      {booking.status === "pending" && (
                        <Button size="sm">Send Quote</Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Job Details */}
                    <div className="space-y-4">
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

                      {booking.description && (
                        <div>
                          <p className="font-medium text-sm">Description</p>
                          <p className="text-sm text-muted-foreground">{booking.description}</p>
                        </div>
                      )}

                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Requested {format(new Date(booking.created_at), "MMM d, yyyy")}</span>
                        </div>
                        {booking.preferred_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Prefers {format(new Date(booking.preferred_date), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Customer</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.customer?.full_name || "Unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Phone</p>
                          <p className="text-sm text-muted-foreground">{booking.contact_phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Email</p>
                          <p className="text-sm text-muted-foreground">{booking.contact_email}</p>
                        </div>
                      </div>

                      {booking.estimated_value && (
                        <div className="flex items-center space-x-3">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Estimated Value</p>
                            <p className="text-sm text-muted-foreground">${booking.estimated_value}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quote Section */}
                  {booking.status === "pending" && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium mb-4">Send Quote</h4>
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="quote-amount">Quote Amount ($)</Label>
                            <Input
                              id="quote-amount"
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label htmlFor="quote-notes">Notes</Label>
                            <Input
                              id="quote-notes"
                              placeholder="Additional details..."
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="quote-message">Message to Customer</Label>
                          <Textarea
                            id="quote-message"
                            placeholder="Explain your quote and any conditions..."
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button type="submit">Send Quote</Button>
                          <Button type="button" variant="outline">Decline</Button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No bookings found for this business.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
