import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

/**
 * POST /api/email/test
 * Send a test email
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
    const { to, subject = 'Test Email from Haulers.app', message = 'This is a test email from the Haulers notification system.' } = body

    // Use provided email or user's email
    const recipientEmail = to || user.email

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      )
    }

    // Send test email - try without tags first to isolate the issue
    const result = await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #f97316, #ea580c); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
              <h1 style="margin: 0;">Test Email ✅</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Hello,</p>
              <p>${message}</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
                <h2 style="margin-top: 0; color: #f97316;">Email Configuration</h2>
                <p><strong>Sent to:</strong> ${recipientEmail}</p>
                <p><strong>Sent from:</strong> ${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}</p>
                <p><strong>Status:</strong> Email sent successfully!</p>
              </div>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This is a test email from the Haulers.app notification system.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Test Email\n\n${message}\n\nSent to: ${recipientEmail}\n\nThis is a test email from the Haulers.app notification system.`
      // Removed tags temporarily to test if that's causing the issue
    })

    if (!result.success) {
      // Provide more helpful error messages
      let errorMessage = result.error || 'Failed to send email'
      
      // Clean API key for display
      const rawKey = process.env.RESEND_API_KEY || ''
      const cleanedKey = rawKey.trim().replace(/^["']|["']$/g, '').trim()
      
      const details: any = {
        configured: !!process.env.RESEND_API_KEY,
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyFormat: cleanedKey ? (cleanedKey.startsWith('re_') ? 'valid' : 'invalid format') : 'missing',
        fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        apiKeyPreview: cleanedKey ? `${cleanedKey.substring(0, 10)}...` : 'not set',
        rawKeyPreview: rawKey ? `${rawKey.substring(0, 10)}...` : 'not set',
        hasQuotes: rawKey.includes('"') || rawKey.includes("'"),
        trimmedLength: cleanedKey.length
      }

      // Add Resend-specific error details if available
      if ((result as any).resendError) {
        details.resendError = (result as any).resendError
      }
      if ((result as any).resendCode) {
        details.resendCode = (result as any).resendCode
      }

      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: result.messageId,
      sentTo: recipientEmail,
      details: {
        configured: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      }
    })
  } catch (error: any) {
    console.error('Error in test email API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: {
          configured: !!process.env.RESEND_API_KEY
        }
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/test
 * Check email configuration
 */
export async function GET() {
  const isConfigured = !!process.env.RESEND_API_KEY
  
  return NextResponse.json({
    configured: isConfigured,
    hasApiKey: isConfigured,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.RESEND_FROM_NAME || 'Haulers.app',
    message: isConfigured 
      ? 'Email service is configured and ready to send emails.'
      : 'RESEND_API_KEY is not set. Please add it to your .env.local file.'
  })
}

