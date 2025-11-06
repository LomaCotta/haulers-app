import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "User IDs array is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const stats: Record<string, { reviewCount: number; friendCount: number }> = {}

    // Fetch stats for all users in parallel
    await Promise.all(
      userIds.map(async (userId: string) => {
        // Count reviews
        const { count: reviewCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('consumer_id', userId)

        // Count friends (accepted friends only)
        // Use server-side client which may have different RLS permissions
        const { count: friendCount } = await supabase
          .from('friends')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted')

        stats[userId] = {
          reviewCount: reviewCount || 0,
          friendCount: friendCount || 0
        }
      })
    )

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

