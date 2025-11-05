# Email Integration with Resend

This application uses [Resend](https://resend.com) for sending transactional emails.

## Setup

1. **Get your Resend API key:**
   - Sign up at https://resend.com
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

2. **Configure environment variables:**
   Add these to your `.env.local` file:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com  # Use your verified domain
   RESEND_FROM_NAME=Haulers.app
   ```

3. **Verify your domain (optional but recommended):**
   - Go to Resend dashboard > Domains
   - Add your domain
   - Follow DNS verification steps
   - Once verified, update `RESEND_FROM_EMAIL` to use your domain

## Usage Examples

### Simple Email (Raw HTML/Text)

```typescript
import { sendEmail } from '@/lib/email'

// From an API route or server component
const result = await sendEmail({
  to: 'customer@example.com',
  subject: 'Welcome to Haulers.app',
  html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  text: 'Welcome! Thanks for joining.',
  tags: ['welcome', 'onboarding']
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Failed:', result.error)
}
```

### Using Email Templates

```typescript
import { sendTransactionalEmail } from '@/lib/email'

// Booking confirmation email
const result = await sendTransactionalEmail(
  'customer@example.com',
  'booking-confirmation',
  {
    booking: {
      id: '123',
      requested_date: '2025-11-10',
      requested_time: '10:00',
      service_address: '123 Main St',
      total_price_cents: 95800
    },
    customer: {
      full_name: 'John Doe'
    },
    business: {
      name: 'Raul Moving Service'
    }
  }
)
```

### Available Templates

- `booking-confirmation` - Sent when a booking is confirmed
- `booking-reminder` - Sent as a reminder before the booking
- `booking-update` - Sent when booking details are updated
- `invoice` - Sent when an invoice is created
- `quote` - Sent when a quote is sent to a customer

### Using the API Route

```typescript
// From client-side or server-side
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Test Email',
    html: '<p>Hello from Haulers!</p>',
    // Or use template:
    // template: 'booking-confirmation',
    // templateData: { booking, customer, business }
  })
})

const data = await response.json()
```

### From Booking Actions

```typescript
// Example: Send confirmation email when booking is confirmed
import { sendTransactionalEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function confirmBooking(bookingId: string) {
  const supabase = await createClient()
  
  // Get booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, customer:profiles(*), business:businesses(*)')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  // Update booking status
  await supabase
    .from('bookings')
    .update({ booking_status: 'confirmed' })
    .eq('id', bookingId)

  // Send confirmation email
  await sendTransactionalEmail(
    booking.customer_email || booking.customer?.email,
    'booking-confirmation',
    {
      booking,
      customer: booking.customer,
      business: booking.business
    }
  )
}
```

## Testing

To test email configuration:

```bash
curl http://localhost:3000/api/email/send
```

This will return:
```json
{
  "configured": true,
  "hasApiKey": true
}
```

## Notes

- In development, Resend will send emails to your verified email address
- Make sure to verify your domain in Resend for production use
- All emails are logged in Resend dashboard for debugging
- Rate limits: Resend free tier allows 3,000 emails/month

