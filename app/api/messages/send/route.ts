import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'

/**
 * POST /api/messages/send
 * Send a message and notify recipient
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
    const { recipient_id, body: messageBody, message_type = 'general', booking_id, message_id } = body

    if (!recipient_id || (!messageBody && !message_id)) {
      return NextResponse.json(
        { error: 'Missing recipient_id or body/message_id' },
        { status: 400 }
      )
    }

    // If message_id is provided, use existing message (from client-side insert)
    // Otherwise, create new message
    let message
    if (message_id) {
      // Message already created client-side, just send notification
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('id', message_id)
        .single()

      if (!existingMessage) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        )
      }
      message = existingMessage
    } else {
      // Create message server-side
      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipient_id,
          body: messageBody.trim(),
          message_type: message_type,
          is_read: false
        })
        .select()
        .single()

      if (messageError) {
        console.error('Error creating message:', messageError)
        return NextResponse.json(
          { error: 'Failed to send message' },
          { status: 500 }
        )
      }
      message = newMessage
    }

    // Send notification to recipient
    try {
      await sendNotification(
        recipient_id,
        'message_received',
        'email',
        {
          message_id: message.id,
          booking_id: booking_id || undefined,
          message: `New message from ${user.email || 'User'}`
        }
      )
    } catch (notifError) {
      console.error('Error sending message notification:', notifError)
      // Don't fail message creation if notification fails
    }

    return NextResponse.json({
      success: true,
      message
    })
  } catch (error: any) {
    console.error('Error in send message API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

