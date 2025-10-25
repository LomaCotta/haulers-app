import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Phone, Mail, MapPin, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"

interface BookingPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      business:businesses(*),
      messages(*)
    `)
    .eq("id", id)
    .single()

  if (error || !booking) {
    notFound()
  }

  const isCustomer = booking.customer_id === user.id
  const isProvider = booking.business?.owner_id === user.id

  if (!isCustomer && !isProvider) {
    notFound()
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Booking #{booking.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              Created {format(new Date(booking.created_at), "PPP")}
            </p>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Pickup</p>
                      <p className="text-sm text-muted-foreground">{booking.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Dropoff</p>
                      <p className="text-sm text-muted-foreground">{booking.dropoff_address}</p>
                    </div>
                  </div>
                </div>
                
                {booking.description && (
                  <div>
                    <p className="font-medium mb-2">Description</p>
                    <p className="text-sm text-muted-foreground">{booking.description}</p>
                  </div>
                )}

                {booking.preferred_date && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Preferred Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.preferred_date), "PPP")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Messages</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.messages && booking.messages.length > 0 ? (
                  <div className="space-y-4">
                    {booking.messages.map((message: any) => (
                      <div key={message.id} className="flex space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">
                              {message.sender_id === user.id ? "You" : 
                               isCustomer ? booking.business?.name : "Customer"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.created_at), "PPp")}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No messages yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Info */}
            {isCustomer && booking.business && (
              <Card>
                <CardHeader>
                  <CardTitle>Provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium">{booking.business.name}</h3>
                    <p className="text-sm text-muted-foreground">{booking.business.description}</p>
                  </div>
                  
                  {booking.business.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.business.phone}</span>
                    </div>
                  )}
                  
                  {booking.business.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{booking.business.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            {isProvider && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.contact_phone}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.contact_email}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Pricing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Estimated Value</span>
                  <span>${booking.estimated_value?.toFixed(2)}</span>
                </div>
                {booking.quote_amount && (
                  <div className="flex justify-between font-medium">
                    <span>Quote Amount</span>
                    <span>${booking.quote_amount.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {booking.status === "pending" && isProvider && (
                  <Button className="w-full">Send Quote</Button>
                )}
                {booking.status === "confirmed" && (
                  <Button variant="outline" className="w-full">Update Status</Button>
                )}
                <Button variant="outline" className="w-full">Send Message</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
