import { createClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/resend'

export type NotificationType = 
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_updated'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'message_received'
  | 'job_created'
  | 'job_updated'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'

export interface NotificationData {
  booking_id?: string
  invoice_id?: string
  message_id?: string
  job_id?: string
  quote_id?: string
  message?: string
  [key: string]: any
}

/**
 * Send a notification to a user
 * This respects user preferences and queues the notification
 */
export async function sendNotification(
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel = 'email',
  data: NotificationData,
  options?: {
    scheduledFor?: Date
    metadata?: Record<string, any>
    userEmail?: string // Optional: Pass email directly if already known
  }
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Map notification types to email templates
    const emailTemplateMap: Record<string, string> = {
      'booking_request': 'booking-confirmation',
      'booking_confirmed': 'booking-confirmation',
      'booking_updated': 'booking-update',
      'booking_reminder': 'booking-reminder',
      'invoice_created': 'invoice',
      'invoice_paid': 'invoice',
      'quote_sent': 'quote'
    }

    // Get user email for email notifications
    let userEmail: string | null = null
    if (channel === 'email') {
      // If email is provided in options, use it
      if (options?.userEmail) {
        userEmail = options.userEmail
      } else {
        // Try to get from profiles table first
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .maybeSingle()
        
        userEmail = profile?.email || null
        
        // If not found in profiles, the email might not be synced
        // In this case, we'll fail gracefully - the reservation API should find it
        if (!userEmail) {
          console.warn(`[Notifications] Email not found in profiles for user ${userId}`)
        }
      }

      if (!userEmail) {
        return {
          success: false,
          error: 'User email not found'
        }
      }
    }

    // Build notification content
    let subject = ''
    let bodyHtml = ''
    let bodyText = ''

    if (channel === 'email' && emailTemplateMap[notificationType]) {
      // Use email template
      const templateData = await buildTemplateData(notificationType, data, supabase)
      const { getEmailTemplate } = await import('@/lib/email/templates')
      const template = getEmailTemplate(
        emailTemplateMap[notificationType] as any,
        templateData
      )
      subject = template.subject
      bodyHtml = template.html
      bodyText = template.text
    } else {
      // Generate basic notification content
      subject = getNotificationSubject(notificationType, data)
      bodyHtml = getNotificationBodyHtml(notificationType, data)
      bodyText = getNotificationBodyText(notificationType, data)
    }

    // Queue notification using database function
    const scheduledFor = options?.scheduledFor || new Date()
    const { data: notificationId, error: queueError } = await supabase.rpc(
      'queue_notification',
      {
        p_user_id: userId,
        p_notification_type: notificationType,
        p_channel: channel,
        p_subject: subject,
        p_body_html: bodyHtml,
        p_body_text: bodyText,
        p_metadata: {
          ...(options?.metadata || {}),
          // Store email in metadata so processNotificationQueue can use it
          ...(userEmail ? { userEmail } : {})
        },
        p_booking_id: data.booking_id || null,
        p_invoice_id: data.invoice_id || null,
        p_message_id: data.message_id || null,
        p_job_id: data.job_id || null,
        p_quote_id: data.quote_id || null,
        p_scheduled_for: scheduledFor.toISOString()
      }
    )

    if (queueError) {
      console.error('Error queueing notification:', queueError)
      return {
        success: false,
        error: queueError.message
      }
    }

    // If notification is scheduled for now, send immediately
    if (scheduledFor <= new Date() && channel === 'email' && userEmail) {
      // Process notifications after a brief delay to ensure DB commit
      // Use a promise-based delay
      await new Promise(resolve => setTimeout(resolve, 500))
      await processNotificationQueue()
    }

    return {
      success: true,
      notificationId: notificationId as string
    }
  } catch (error: any) {
    console.error('Error sending notification:', error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Process pending notifications from the queue
 */
export async function processNotificationQueue(): Promise<void> {
  try {
    const supabase = await createClient()

    // Get pending notifications that are ready to send
    // Include the specific notification we just created if we have its ID
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('channel', 'email')
      .lte('scheduled_for', new Date().toISOString())
      .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(50) // Process in batches

    if (error || !notifications || notifications.length === 0) {
      if (error) {
        console.error('[Notifications] Error fetching notifications:', error)
      }
      return
    }

    console.log(`[Notifications] Processing ${notifications.length} pending notification(s)`)

    for (const notification of notifications) {
      try {
        // Get user email - try profiles first, then auth.users
        let userEmail: string | null = null
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', notification.user_id)
          .maybeSingle()
        
        userEmail = profile?.email || null
        
        // If not found in profiles, try auth.users via service role
        if (!userEmail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const { createClient: createAdminClient } = await import('@supabase/supabase-js')
            const adminSupabase = createAdminClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { persistSession: false } }
            )
            const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(notification.user_id)
            if (!authError && authUser?.user?.email) {
              userEmail = authUser.user.email
              console.log(`[Notifications] Found email from auth.users for user ${notification.user_id}: ${userEmail}`)
            }
          } catch (adminError) {
            console.warn(`[Notifications] Could not get email from auth.users for user ${notification.user_id}:`, adminError)
          }
        }
        
        // Also check if email is stored in metadata
        if (!userEmail && notification.metadata?.userEmail) {
          userEmail = notification.metadata.userEmail
        }

        if (!userEmail) {
          console.error(`[Notifications] Email not found for user ${notification.user_id}`)
          await supabase.rpc('mark_notification_failed', {
            p_notification_id: notification.id,
            p_error_message: 'User email not found',
            p_retry: false
          })
          continue
        }

        // Send email using the fixed sendEmail function
        const { sendEmail } = await import('@/lib/email/resend')
        console.log(`[Notifications] Sending email to ${userEmail} for notification ${notification.id} (${notification.notification_type})`)
        const result = await sendEmail({
          to: userEmail,
          subject: notification.subject || 'Notification',
          html: notification.body_html || '',
          text: notification.body_text || '',
          // Tags are optional - only include if we have valid values
          ...(notification.notification_type ? {
            tags: ['notification', notification.notification_type].filter(Boolean)
          } : {}),
          metadata: {
            notification_id: notification.id,
            notification_type: notification.notification_type
          }
        })

        if (result.success) {
          console.log(`[Notifications] ✅ Email sent successfully for notification ${notification.id} to ${userEmail}`)
          // Mark as sent
          await supabase.rpc('mark_notification_sent', {
            p_notification_id: notification.id,
            p_provider_message_id: result.messageId,
            p_status: 'sent'
          })
        } else {
          console.error(`[Notifications] ❌ Failed to send email for notification ${notification.id}:`, result.error)
          // Mark as failed (will retry if retries remaining)
          await supabase.rpc('mark_notification_failed', {
            p_notification_id: notification.id,
            p_error_message: result.error || 'Failed to send email',
            p_retry: true
          })
        }
      } catch (error: any) {
        console.error(`[Notifications] Error processing notification ${notification.id}:`, error)
        await supabase.rpc('mark_notification_failed', {
          p_notification_id: notification.id,
          p_error_message: error.message || 'Unknown error',
          p_retry: true
        })
      }
    }
  } catch (error) {
    console.error('Error processing notification queue:', error)
  }
}

/**
 * Build template data for email templates
 */
async function buildTemplateData(
  notificationType: NotificationType,
  data: NotificationData,
  supabase: any
): Promise<Record<string, any>> {
  const templateData: Record<string, any> = {}

  // Fetch related data based on notification type
  if (data.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, full_name, email, avatar_url),
        business:businesses(id, name, city, state, phone, email)
      `)
      .eq('id', data.booking_id)
      .single()

    if (booking) {
      templateData.booking = booking
      templateData.customer = booking.customer
      templateData.business = booking.business
    }
  }

  if (data.invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings!invoices_booking_id_fkey(
          *,
          customer:profiles!bookings_customer_id_fkey(id, full_name, email),
          business:businesses(id, name)
        )
      `)
      .eq('id', data.invoice_id)
      .single()

    if (invoice) {
      templateData.invoice = invoice
      templateData.customer = invoice.booking?.customer
      templateData.business = invoice.booking?.business
    }
  }

  if (data.quote_id) {
    const { data: quote } = await supabase
      .from('movers_quotes')
      .select('*')
      .eq('id', data.quote_id)
      .single()

    if (quote) {
      templateData.quote = quote
      // Fetch customer and business if needed
    }
  }

  return templateData
}

/**
 * Get notification subject
 */
function getNotificationSubject(notificationType: NotificationType, data: NotificationData): string {
  const subjects: Record<string, string> = {
    'booking_request': 'New Booking Request',
    'booking_confirmed': 'Booking Confirmed',
    'booking_updated': 'Booking Updated',
    'booking_reminder': 'Upcoming Booking Reminder',
    'booking_cancelled': 'Booking Cancelled',
    'invoice_created': 'New Invoice',
    'invoice_paid': 'Invoice Paid',
    'invoice_overdue': 'Invoice Overdue',
    'message_received': 'New Message',
    'job_created': 'New Job Created',
    'job_updated': 'Job Updated',
    'quote_sent': 'New Quote Received',
    'quote_accepted': 'Quote Accepted',
    'quote_rejected': 'Quote Rejected'
  }
  return subjects[notificationType] || 'Notification'
}

/**
 * Get notification body HTML
 */
function getNotificationBodyHtml(notificationType: NotificationType, data: NotificationData): string {
  // Special handling for job_created notifications
  if (notificationType === 'job_created') {
    const jobId = data.job_id || 'N/A'
    const quoteId = data.quote_id || 'N/A'
    const moveDate = data.move_date || data.message?.match(/scheduled for (.+)/)?.[1] || 'N/A'
    const customerName = data.customer_name || data.full_name || 'Customer'
    const pickupAddress = data.pickup_address || 'N/A'
    const dropoffAddress = data.dropoff_address || 'N/A'
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Job Created</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #f97316, #ea580c); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">New Job Created</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello,</p>
            <p>A new moving job has been scheduled for your company.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
              <h2 style="margin-top: 0; color: #f97316;">Job Details</h2>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Scheduled Date:</strong> ${moveDate}</p>
              <p><strong>Pickup Address:</strong> ${pickupAddress}</p>
              <p><strong>Delivery Address:</strong> ${dropoffAddress}</p>
              ${data.message ? `<p><strong>Note:</strong> ${data.message}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings${jobId !== 'N/A' ? `?job=${jobId}` : ''}" 
                 style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Job Details
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Job ID: ${jobId} | Quote ID: ${quoteId}
            </p>
          </div>
        </body>
      </html>
    `
  }
  
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>${getNotificationSubject(notificationType, data)}</h2>
      <p>You have a new notification.</p>
      ${data.message ? `<p>${data.message}</p>` : ''}
    </div>
  `
}

/**
 * Get notification body text
 */
function getNotificationBodyText(notificationType: NotificationType, data: NotificationData): string {
  if (notificationType === 'job_created') {
    const customerName = data.customer_name || data.full_name || 'Customer'
    const moveDate = data.move_date || data.message?.match(/scheduled for (.+)/)?.[1] || 'N/A'
    const pickupAddress = data.pickup_address || 'N/A'
    const dropoffAddress = data.dropoff_address || 'N/A'
    
    return `New Job Created

A new moving job has been scheduled for your company.

Job Details:
Customer: ${customerName}
Scheduled Date: ${moveDate}
Pickup Address: ${pickupAddress}
Delivery Address: ${dropoffAddress}
${data.message ? `Note: ${data.message}` : ''}

View job details: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings${data.job_id ? `?job=${data.job_id}` : ''}`
  }
  
  return `${getNotificationSubject(notificationType, data)}\n\nYou have a new notification.\n${data.message || ''}`
}

