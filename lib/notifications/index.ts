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
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (!profile?.email) {
        return {
          success: false,
          error: 'User email not found'
        }
      }
      userEmail = profile.email
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
        p_metadata: options?.metadata || {},
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
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('channel', 'email')
      .lte('scheduled_for', new Date().toISOString())
      .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
      .limit(50) // Process in batches

    if (error || !notifications || notifications.length === 0) {
      return
    }

    for (const notification of notifications) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', notification.user_id)
          .single()

        if (!profile?.email) {
          await supabase.rpc('mark_notification_failed', {
            p_notification_id: notification.id,
            p_error_message: 'User email not found',
            p_retry: false
          })
          continue
        }

        // Send email using the fixed sendEmail function
        const { sendEmail } = await import('@/lib/email/resend')
        const result = await sendEmail({
          to: profile.email,
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
          // Mark as sent
          await supabase.rpc('mark_notification_sent', {
            p_notification_id: notification.id,
            p_provider_message_id: result.messageId,
            p_status: 'sent'
          })
        } else {
          // Mark as failed (will retry if retries remaining)
          await supabase.rpc('mark_notification_failed', {
            p_notification_id: notification.id,
            p_error_message: result.error || 'Failed to send email',
            p_retry: true
          })
        }
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error)
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
  return `${getNotificationSubject(notificationType, data)}\n\nYou have a new notification.\n${data.message || ''}`
}

