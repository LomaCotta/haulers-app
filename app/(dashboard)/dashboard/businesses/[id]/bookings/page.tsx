import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign, User, Phone, Mail, CheckCircle2, Clock, XCircle } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { QuoteForm } from "@/components/quote-form"

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
    .select("*")
    .eq("business_id", id)
    .order("created_at", { ascending: false })

  if (bookingsError) {
    return <div>Error loading bookings: {bookingsError.message}</div>
  }

  // Fetch customer profiles separately
  const customerIds = bookings?.map(b => b.customer_id).filter(Boolean) || []
  const { data: customers } = customerIds.length > 0 
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", customerIds)
    : { data: [] }

  // Fetch quotes for bookings
  const bookingIds = bookings?.map(b => b.id) || []
  const { data: quotes } = bookingIds.length > 0
    ? await supabase
        .from("quotes")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  // Map customers and quotes to bookings
  const bookingsWithCustomers = bookings?.map(booking => ({
    ...booking,
    customer: customers?.find(c => c.id === booking.customer_id) || null,
    quote: quotes?.find(q => q.booking_id === booking.id) || null
  })) || []

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
          {bookingsWithCustomers && bookingsWithCustomers.length > 0 ? (
            bookingsWithCustomers.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">
                        Booking #{booking.id.slice(0, 8)}
                      </h3>
                      <Badge className={getStatusColor(booking.booking_status || 'pending')}>
                        {(booking.booking_status || 'pending').replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Job Details */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Service Address</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.service_address || 'Not specified'}
                            {booking.service_city && booking.service_state && (
                              <>, {booking.service_city}, {booking.service_state}</>
                            )}
                          </p>
                        </div>
                      </div>

                      {booking.service_type && (
                        <div>
                          <p className="font-medium text-sm">Service Type</p>
                          <p className="text-sm text-muted-foreground">{booking.service_type}</p>
                        </div>
                      )}

                      {(booking.special_requirements || booking.customer_notes) && (
                        <div>
                          <p className="font-medium text-sm">Details</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.special_requirements || booking.customer_notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Requested {format(new Date(booking.created_at), "MMM d, yyyy")}</span>
                        </div>
                        {booking.requested_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Scheduled {format(new Date(booking.requested_date), "MMM d, yyyy")}</span>
                            {booking.requested_time && (
                              <span>at {booking.requested_time}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {booking.total_price_cents > 0 && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Total Price</p>
                            <p className="text-sm text-muted-foreground">
                              ${(booking.total_price_cents / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
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

                      {booking.customer_phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Phone</p>
                            <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
                          </div>
                        </div>
                      )}

                      {booking.customer_email && (
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Email</p>
                            <p className="text-sm text-muted-foreground">{booking.customer_email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quote Status Section */}
                  {booking.quote ? (
                    <div className="mt-6 pt-6 border-t">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {booking.quote.quote_status === 'accepted' ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                            ) : booking.quote.quote_status === 'rejected' ? (
                              <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                            ) : booking.quote.quote_status === 'viewed' ? (
                              <Clock className="h-6 w-6 text-blue-600 mt-0.5" />
                            ) : (
                              <Clock className="h-6 w-6 text-yellow-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">Quote Sent</h4>
                                <Badge className={
                                  booking.quote.quote_status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  booking.quote.quote_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  booking.quote.quote_status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>
                                  {booking.quote.quote_status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-lg font-bold text-gray-900 mb-2">
                                ${(booking.quote.total_price_cents / 100).toFixed(2)}
                              </p>
                              {booking.quote.sent_at && (
                                <p className="text-sm text-gray-600 mb-2">
                                  Sent on {format(new Date(booking.quote.sent_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              )}
                              {booking.quote.viewed_at && (
                                <p className="text-sm text-green-600 mb-2">
                                  ✓ Viewed by customer
                                </p>
                              )}
                              {booking.quote.accepted_at && (
                                <p className="text-sm text-green-600 mb-2">
                                  ✓ Accepted on {format(new Date(booking.quote.accepted_at), "MMM d, yyyy")}
                                </p>
                              )}
                              {booking.quote.rejected_at && (
                                <p className="text-sm text-red-600 mb-2">
                                  ✗ Rejected on {format(new Date(booking.quote.rejected_at), "MMM d, yyyy")}
                                  {booking.quote.rejection_reason && ` - ${booking.quote.rejection_reason}`}
                                </p>
                              )}
                              {booking.quote.expires_at && new Date(booking.quote.expires_at) > new Date() && (
                                <p className="text-sm text-gray-500">
                                  Expires on {format(new Date(booking.quote.expires_at), "MMM d, yyyy")}
                                </p>
                              )}
                              {booking.quote.quote_message && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Your Message:</p>
                                  <p className="text-sm text-gray-600">{booking.quote.quote_message}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : booking.booking_status === "pending" ? (
                    <QuoteForm bookingId={booking.id} />
                  ) : null}
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
