import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Users, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get dashboard statistics
  const [
    { data: businesses },
    { data: users },
    { data: bookings },
    { data: reviews },
    { data: pendingBusinesses },
    { data: recentBookings },
    { data: ledgerEntries }
  ] = await Promise.all([
    supabase.from("businesses").select("id, status").eq("status", "verified"),
    supabase.from("profiles").select("id, role"),
    supabase.from("bookings").select("id, status, created_at"),
    supabase.from("reviews").select("id, rating"),
    supabase.from("businesses").select("id, name, created_at").eq("status", "pending"),
    supabase.from("bookings").select(`
      id, 
      status, 
      created_at,
      business:businesses(name),
      customer:profiles!bookings_customer_id_fkey(*)
    `).order("created_at", { ascending: false }).limit(5),
    supabase.from("ledger_entries").select("amount, type").order("created_at", { ascending: false }).limit(10)
  ])

  const totalRevenue = ledgerEntries?.reduce((sum, entry) => 
    entry.type === "platform_fee" ? sum + entry.amount : sum, 0
  ) || 0

  const averageRating = reviews && reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  const recentBookingsData = recentBookings || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform activity and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {pendingBusinesses?.length || 0} pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter(u => u.role === "customer").length || 0} customers, {" "}
              {users?.filter(u => u.role === "provider").length || 0} providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {bookings?.filter(b => b.status === "completed").length || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average rating: {averageRating.toFixed(1)}/5
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Pending Verifications</span>
            </CardTitle>
            <CardDescription>
              Businesses waiting for admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingBusinesses && pendingBusinesses.length > 0 ? (
              <div className="space-y-3">
                {pendingBusinesses.slice(0, 5).map((business) => (
                  <div key={business.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{business.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted {new Date(business.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/admin/businesses/${business.id}`}>
                      <Button size="sm">Review</Button>
                    </Link>
                  </div>
                ))}
                {pendingBusinesses.length > 5 && (
                  <Link href="/admin/businesses">
                    <Button variant="outline" className="w-full">
                      View All ({pendingBusinesses.length})
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No pending verifications
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Recent Bookings</span>
            </CardTitle>
            <CardDescription>
              Latest customer requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookingsData.length > 0 ? (
              <div className="space-y-3">
                {recentBookingsData.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">#{booking.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {(booking.customer as any)?.full_name} → {(booking.business as any)?.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        booking.status === "completed" ? "default" :
                        booking.status === "confirmed" ? "secondary" :
                        "outline"
                      }>
                        {booking.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Link href="/admin/bookings">
                  <Button variant="outline" className="w-full">
                    View All Bookings
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No recent bookings
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/businesses">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Building2 className="h-6 w-6" />
                <span>Manage Businesses</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Link href="/admin/ledger">
              <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                <DollarSign className="h-6 w-6" />
                <span>View Ledger</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
