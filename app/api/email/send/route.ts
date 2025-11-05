import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, sendTransactionalEmail } from '@/lib/email/resend'

/**
 * POST /api/email/send
 * Send an email using Resend
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject, html, text, template, templateData, from, replyTo, cc, bcc, tags, metadata } = body

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to and subject are required' },
        { status: 400 }
      )
    }

    // If template is provided, use template-based sending
    if (template) {
      const result = await sendTransactionalEmail(
        to,
        template as any,
        templateData || {},
        { from, replyTo, cc, bcc, tags, metadata }
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send email' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId
      })
    }

    // Otherwise, send raw email
    if (!html && !text) {
      return NextResponse.json(
        { error: 'Either html or text content is required' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      from,
      replyTo,
      cc,
      bcc,
      tags,
      metadata
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    })
  } catch (error: any) {
    console.error('Error in email send API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/send
 * Verify email configuration
 */
export async function GET() {
  try {
    const { verifyEmailConfig } = await import('@/lib/email/resend')
    const isConfigured = await verifyEmailConfig()

    return NextResponse.json({
      configured: isConfigured,
      hasApiKey: !!process.env.RESEND_API_KEY
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

