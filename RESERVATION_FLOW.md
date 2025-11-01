# Reservation Creation Flow

## What Happens When a Client Makes a Reservation

When a client submits a reservation through `/api/movers/reservations/create`, the following database rows are created:

### 1. **`movers_scheduled_jobs` Table** ⭐ PRIMARY RECORD
This is the MAIN table that stores the reservation. It's what appears on calendars and dashboards.

**Columns created:**
- `id` (UUID) - Unique reservation ID
- `provider_id` (UUID) - Which moving company/provider
- `quote_id` (UUID) - Link to the quote (optional, can be created later)
- `scheduled_date` (DATE) - When the move is scheduled
- `time_slot` (TEXT) - 'morning', 'afternoon', or 'full_day'
- `scheduled_start_time` (TIME) - Start time (e.g., '08:00:00' or '12:00:00')
- `scheduled_end_time` (TIME) - End time (e.g., '12:00:00' or '17:00:00')
- `crew_size` (INT) - Number of movers (e.g., 2, 3, 4)
- `status` (TEXT) - 'scheduled', 'in_progress', 'completed', 'cancelled'
- `created_at` (TIMESTAMPTZ) - When reservation was created
- `updated_at` (TIMESTAMPTZ) - Last update time

**How it's created:**
- Uses RPC function `create_movers_scheduled_job()` (bypasses RLS)
- This is the **PRIMARY** record that links everything together

### 2. **`movers_quotes` Table** (Optional, created if quote doesn't exist)
Stores the quote/estimate details that the customer selected.

**Columns created:**
- `id` (UUID) - Quote ID
- `provider_id` (UUID) - Which provider
- `customer_id` (UUID) - Customer's user ID (if logged in, else null)
- `full_name` (TEXT) - Customer's name
- `email` (TEXT) - Customer's email
- `phone` (TEXT) - Customer's phone
- `pickup_address` (TEXT) - Pickup location
- `dropoff_address` (TEXT) - Delivery location
- `move_date` (DATE) - Move date
- `crew_size` (INT) - Team size
- `price_total_cents` (INT) - Total price in cents
- `status` (TEXT) - 'draft', 'confirmed', etc.
- `breakdown` (JSONB) - Detailed pricing breakdown
- `created_at` (TIMESTAMPTZ) - When quote was created

**When it's created:**
- If `quoteId` is provided in the request, it updates the existing quote
- If `quoteId` is missing/null, it creates a NEW quote record

### 3. **`notifications` Table** (Optional)
Creates a notification for the provider about the new reservation.

**Columns created:**
- `user_id` (UUID) - Provider owner's user ID
- `title` (TEXT) - "New Reservation"
- `message` (TEXT) - Details about the reservation
- `type` (TEXT) - 'reservation'
- `related_id` (UUID) - Link to the scheduled job ID
- `is_read` (BOOLEAN) - false

---

## The Problem: Why Reservations "Disappear"

The reservation is stored in **`movers_scheduled_jobs`**, but there are TWO separate dashboard views:

### For Providers (Moving Companies):
- **Calendar View**: Fetches from `movers_scheduled_jobs` table via `/api/movers/availability/scheduled`
- **List View**: Fetches from `movers_scheduled_jobs` table (same source)

### For Customers:
- **Calendar View**: Fetches from `bookings` table (NOT `movers_scheduled_jobs`)
- **List View**: Fetches from `bookings` table

### The Issue:
When a reservation is made through `/api/movers/reservations/create`, it creates a row in `movers_scheduled_jobs`, but **NOT** in the `bookings` table.

So:
- ✅ **Provider sees it** (because they query `movers_scheduled_jobs`)
- ❌ **Customer doesn't see it** (because they query `bookings`)

---

## Solution: What Needs to Happen

When a reservation is created, we need to ALSO create a row in the `bookings` table so customers can see their reservations.

### What Should Be Created in `bookings` Table:

```sql
INSERT INTO bookings (
  customer_id,          -- Customer's user ID (if authenticated)
  business_id,          -- Provider's business ID
  service_type,         -- 'moving' or similar
  booking_status,       -- 'pending' or 'confirmed'
  requested_date,       -- Move date
  requested_time,       -- Start time
  service_address,      -- Pickup address
  service_city,         -- City
  service_state,        -- State
  service_postal_code,  -- ZIP
  total_price_cents,    -- Total price
  customer_phone,       -- Phone
  customer_email,       -- Email
  service_details       -- JSONB with all details
) VALUES (...)
```

---

## Current Flow vs Ideal Flow

### Current Flow (Broken):
1. Customer makes reservation → Creates `movers_scheduled_jobs` row ✅
2. Provider sees it ✅
3. Customer doesn't see it ❌ (no `bookings` row)

### Ideal Flow (Fixed):
1. Customer makes reservation → Creates `movers_scheduled_jobs` row ✅
2. Customer makes reservation → **ALSO creates `bookings` row** ✅
3. Provider sees it ✅ (queries `movers_scheduled_jobs`)
4. Customer sees it ✅ (queries `bookings`)

---

## Database Tables Involved

| Table | Purpose | Who Queries It |
|-------|---------|----------------|
| `movers_scheduled_jobs` | Provider's calendar/dashboard | Providers ✅ |
| `bookings` | Customer's calendar/dashboard | Customers ✅ (but missing rows!) |
| `movers_quotes` | Quote/estimate details | Both (via scheduled job) |
| `notifications` | Provider notifications | Providers |

---

## Query to Check What Was Created

Run this to see all reservations:

```sql
-- See all scheduled jobs (what providers see)
SELECT 
  msj.id,
  msj.scheduled_date,
  msj.time_slot,
  msj.status,
  mq.full_name,
  mq.email,
  mq.phone,
  mp.business_id
FROM movers_scheduled_jobs msj
LEFT JOIN movers_quotes mq ON msj.quote_id = mq.id
LEFT JOIN movers_providers mp ON msj.provider_id = mp.id
ORDER BY msj.created_at DESC;

-- See all bookings (what customers see)
SELECT 
  b.id,
  b.requested_date,
  b.booking_status,
  b.customer_id,
  b.business_id,
  b.total_price_cents
FROM bookings b
ORDER BY b.created_at DESC;
```

If `movers_scheduled_jobs` has rows but `bookings` doesn't for the same reservation, that's why customers can't see them!

