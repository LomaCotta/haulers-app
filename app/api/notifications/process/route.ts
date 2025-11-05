import { NextRequest, NextResponse } from 'next/server'
import { processNotificationQueue } from '@/lib/notifications'

/**
 * POST /api/notifications/process
 * Process pending notifications from the queue
 * This should be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization for cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await processNotificationQueue()

    return NextResponse.json({
      success: true,
      message: 'Notification queue processed'
    })
  } catch (error: any) {
    console.error('Error processing notification queue:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/process
 * Get queue status
 */
export async function GET() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: stats, error } = await supabase
      .from('notification_queue')
      .select('status', { count: 'exact' })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const counts = stats?.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      queue: {
        pending: counts?.pending || 0,
        sent: counts?.sent || 0,
        failed: counts?.failed || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

