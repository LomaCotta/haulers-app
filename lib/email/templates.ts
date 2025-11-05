import { formatPrice } from '@/lib/utils'

export type EmailTemplate = 'booking-confirmation' | 'booking-reminder' | 'booking-update' | 'invoice' | 'quote'

export interface TemplateData {
  subject: string
  html: string
  text: string
}

/**
 * Get email template for a given type
 */
export function getEmailTemplate(template: EmailTemplate, data: Record<string, any>): TemplateData {
  switch (template) {
    case 'booking-confirmation':
      return getBookingConfirmationTemplate(data)
    case 'booking-reminder':
      return getBookingReminderTemplate(data)
    case 'booking-update':
      return getBookingUpdateTemplate(data)
    case 'invoice':
      return getInvoiceTemplate(data)
    case 'quote':
      return getQuoteTemplate(data)
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

/**
 * Booking Confirmation Email Template
 */
function getBookingConfirmationTemplate(data: any): TemplateData {
  const { booking, customer, business } = data
  const bookingDate = booking.requested_date 
    ? new Date(booking.requested_date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'TBD'
  const totalDue = booking.total_price_cents 
    ? formatPrice(booking.total_price_cents)
    : 'TBD'

  return {
    subject: `Booking Confirmed - ${business?.name || 'Service Provider'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #f97316, #ea580c); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">Booking Confirmed! 🎉</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello ${customer?.full_name || 'Valued Customer'},</p>
            <p>Your booking has been confirmed with <strong>${business?.name || 'Service Provider'}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
              <h2 style="margin-top: 0; color: #f97316;">Booking Details</h2>
              <p><strong>Date:</strong> ${bookingDate}</p>
              ${booking.requested_time ? `<p><strong>Time:</strong> ${booking.requested_time}</p>` : ''}
              ${booking.service_address ? `<p><strong>Service Address:</strong> ${booking.service_address}</p>` : ''}
              <p><strong>Total Due:</strong> ${totalDue}</p>
              ${booking.service_type ? `<p><strong>Service Type:</strong> ${booking.service_type}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}" 
                 style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Booking Details
              </a>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, please contact ${business?.name || 'us'} directly.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Booking Confirmed!

Hello ${customer?.full_name || 'Valued Customer'},

Your booking has been confirmed with ${business?.name || 'Service Provider'}.

Booking Details:
- Date: ${bookingDate}
${booking.requested_time ? `- Time: ${booking.requested_time}` : ''}
${booking.service_address ? `- Service Address: ${booking.service_address}` : ''}
- Total Due: ${totalDue}
${booking.service_type ? `- Service Type: ${booking.service_type}` : ''}

View your booking: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}

If you have any questions, please contact ${business?.name || 'us'} directly.
    `
  }
}

/**
 * Booking Reminder Email Template
 */
function getBookingReminderTemplate(data: any): TemplateData {
  const { booking, customer, business } = data
  const bookingDate = booking.requested_date 
    ? new Date(booking.requested_date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'TBD'

  return {
    subject: `Reminder: Your booking is ${data.hoursUntil ? `in ${data.hoursUntil} hours` : 'soon'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">Upcoming Booking Reminder ⏰</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello ${customer?.full_name || 'Valued Customer'},</p>
            <p>This is a friendly reminder about your upcoming booking with <strong>${business?.name || 'Service Provider'}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h2 style="margin-top: 0; color: #3b82f6;">Booking Details</h2>
              <p><strong>Date:</strong> ${bookingDate}</p>
              ${booking.requested_time ? `<p><strong>Time:</strong> ${booking.requested_time}</p>` : ''}
              ${booking.service_address ? `<p><strong>Service Address:</strong> ${booking.service_address}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Booking Details
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Upcoming Booking Reminder

Hello ${customer?.full_name || 'Valued Customer'},

This is a friendly reminder about your upcoming booking with ${business?.name || 'Service Provider'}.

Booking Details:
- Date: ${bookingDate}
${booking.requested_time ? `- Time: ${booking.requested_time}` : ''}
${booking.service_address ? `- Service Address: ${booking.service_address}` : ''}

View your booking: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}
    `
  }
}

/**
 * Booking Update Email Template
 */
function getBookingUpdateTemplate(data: any): TemplateData {
  const { booking, customer, business, updates } = data

  return {
    subject: `Booking Update - ${business?.name || 'Service Provider'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">Booking Updated</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello ${customer?.full_name || 'Valued Customer'},</p>
            <p>Your booking with <strong>${business?.name || 'Service Provider'}</strong> has been updated.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2 style="margin-top: 0; color: #10b981;">Updates</h2>
              ${updates ? `<p>${updates}</p>` : '<p>Please check your booking details for the latest information.</p>'}
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Updated Booking
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Booking Update

Hello ${customer?.full_name || 'Valued Customer'},

Your booking with ${business?.name || 'Service Provider'} has been updated.

${updates || 'Please check your booking details for the latest information.'}

View your booking: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/bookings/${booking.id}
    `
  }
}

/**
 * Invoice Email Template
 */
function getInvoiceTemplate(data: any): TemplateData {
  const { invoice, customer, business } = data
  const totalDue = invoice.total_amount_cents 
    ? formatPrice(invoice.total_amount_cents)
    : 'TBD'

  return {
    subject: `Invoice #${invoice.invoice_number || invoice.id} from ${business?.name || 'Service Provider'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #8b5cf6, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">Invoice</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello ${customer?.full_name || 'Valued Customer'},</p>
            <p>Please find your invoice from <strong>${business?.name || 'Service Provider'}</strong> below.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
              <h2 style="margin-top: 0; color: #8b5cf6;">Invoice Details</h2>
              <p><strong>Invoice #:</strong> ${invoice.invoice_number || invoice.id}</p>
              <p><strong>Date:</strong> ${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Total Due:</strong> ${totalDue}</p>
              <p><strong>Status:</strong> ${invoice.status || 'Pending'}</p>
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/invoices/${invoice.id}" 
                 style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View & Pay Invoice
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Invoice

Hello ${customer?.full_name || 'Valued Customer'},

Please find your invoice from ${business?.name || 'Service Provider'} below.

Invoice Details:
- Invoice #: ${invoice.invoice_number || invoice.id}
- Date: ${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
- Total Due: ${totalDue}
- Status: ${invoice.status || 'Pending'}

View & Pay Invoice: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/invoices/${invoice.id}
    `
  }
}

/**
 * Quote Email Template
 */
function getQuoteTemplate(data: any): TemplateData {
  const { quote, customer, business } = data
  const totalAmount = quote.total_price_cents 
    ? formatPrice(quote.total_price_cents)
    : 'TBD'

  return {
    subject: `Quote from ${business?.name || 'Service Provider'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0;">Service Quote</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello ${customer?.full_name || 'Valued Customer'},</p>
            <p>You have received a quote from <strong>${business?.name || 'Service Provider'}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h2 style="margin-top: 0; color: #f59e0b;">Quote Details</h2>
              <p><strong>Quote Amount:</strong> ${totalAmount}</p>
              ${quote.valid_until ? `<p><strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}</p>` : ''}
              ${quote.quote_message ? `<p><strong>Message:</strong> ${quote.quote_message}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/quotes/${quote.id}" 
                 style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Quote
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Service Quote

Hello ${customer?.full_name || 'Valued Customer'},

You have received a quote from ${business?.name || 'Service Provider'}.

Quote Details:
- Quote Amount: ${totalAmount}
${quote.valid_until ? `- Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}` : ''}
${quote.quote_message ? `- Message: ${quote.quote_message}` : ''}

View Quote: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/quotes/${quote.id}
    `
  }
}

