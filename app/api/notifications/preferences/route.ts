import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'

/**
 * POST /api/notifications/preferences
 * Update user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      email_enabled,
      email_booking_requests,
      email_booking_updates,
      email_booking_reminders,
      email_invoices,
      email_messages,
      email_jobs,
      email_quotes,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end
    } = body

    // Upsert notification preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        email_enabled,
        email_booking_requests,
        email_booking_updates,
        email_booking_reminders,
        email_invoices,
        email_messages,
        email_jobs,
        email_quotes,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preferences: data
    })
  } catch (error: any) {
    console.error('Error in notification preferences API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    // Return defaults if no preferences exist
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          email_enabled: true,
          email_booking_requests: true,
          email_booking_updates: true,
          email_booking_reminders: true,
          email_invoices: true,
          email_messages: true,
          email_jobs: true,
          email_quotes: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00'
        }
      })
    }

    return NextResponse.json({
      preferences
    })
  } catch (error: any) {
    console.error('Error in notification preferences API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

