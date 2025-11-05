# Notification System

A comprehensive notification system that sends emails based on user preferences and events.

## Features

- ✅ User preference management (email, SMS, push - future)
- ✅ Notification queue with retry logic
- ✅ Quiet hours support
- ✅ Automatic email sending via Resend
- ✅ Integrates with booking, invoice, message, and job creation
- ✅ Respects user preferences

## Setup

1. **Run the database migration:**
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: db/migrations/034_notification_system.sql
   ```

2. **Configure Resend:**
   Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=Haulers.app
   ```

3. **Set up cron job (optional but recommended):**
   
   **Option A: Vercel Cron**
   Add to `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/notifications/process",
       "schedule": "*/5 * * * *"
     }]
   }
   ```

   **Option B: External cron service**
   Call `POST /api/notifications/process` every 5 minutes with:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   ```

## Integration Points

### Booking Creation
- ✅ `/api/bookings` - Sends notifications to business owner and customer
- ✅ `/api/movers/reservations/create` - Sends notifications to provider and customer

### Invoice Creation
- ✅ `/api/invoices` - Sends notification to customer when invoice is created

### Messages
- ✅ `/api/messages/send` - Sends notification to recipient when message is received

### Future Integrations
- Job creation notifications
- Quote notifications
- Booking update notifications

## Usage

### Send a Notification

```typescript
import { sendNotification } from '@/lib/notifications'

await sendNotification(
  userId,
  'booking_request',
  'email',
  {
    booking_id: '123',
    message: 'You have a new booking request'
  }
)
```

### Get User Preferences

```typescript
// From client-side
const response = await fetch('/api/notifications/preferences')
const { preferences } = await response.json()
```

### Update User Preferences

```typescript
const response = await fetch('/api/notifications/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email_enabled: true,
    email_booking_requests: true,
    email_messages: false,
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '08:00:00'
  })
})
```

## Notification Types

- `booking_request` - New booking request received
- `booking_confirmed` - Booking confirmed
- `booking_updated` - Booking details updated
- `booking_reminder` - Reminder before booking
- `booking_cancelled` - Booking cancelled
- `invoice_created` - New invoice created
- `invoice_paid` - Invoice paid
- `invoice_overdue` - Invoice overdue
- `message_received` - New message received
- `job_created` - New job created
- `job_updated` - Job updated
- `quote_sent` - Quote sent
- `quote_accepted` - Quote accepted
- `quote_rejected` - Quote rejected

## User Preferences

Users can control:
- Which notification types they receive via email
- Quiet hours (no notifications during these times)
- SMS preferences (future)
- Push notification preferences (future)
- Digest mode (group notifications) (future)

Defaults: All email notifications are enabled by default.

## Processing Queue

The notification queue is processed automatically when:
1. A notification is queued with `scheduled_for` in the past
2. A cron job calls `/api/notifications/process` (recommended)

The queue processor:
- Sends emails via Resend
- Retries failed notifications (exponential backoff: 1min, 5min, 15min)
- Marks notifications as sent/failed
- Moves sent notifications to history

## Monitoring

Check queue status:
```bash
GET /api/notifications/process
```

Returns:
```json
{
  "queue": {
    "pending": 5,
    "sent": 100,
    "failed": 2
  }
}
```

