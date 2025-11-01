# Testing Reservation Creation

## Steps to Test

1. **Make a Reservation** through the frontend:
   - Go to a movers booking page
   - Fill out the form
   - Submit the reservation

2. **Check the Response** in browser console:
   - Look for the API response from `/api/movers/reservations/create`
   - Should include: `reservation_id`, `quote_id`, `booking_id`, and `references` object

3. **Run the SQL Query**:
   - Run `027_check_reservation_creation.sql` to see all created records
   - Verify all links are correct

4. **Check Provider Dashboard**:
   - Log in as the provider
   - Go to `/dashboard/bookings`
   - Should see the reservation in calendar and list view

5. **Check Customer Dashboard**:
   - Log in as the customer who made the reservation
   - Go to `/dashboard/bookings`
   - Should see the booking in calendar and list view

## Expected Results

### API Response Should Include:
```json
{
  "success": true,
  "reservation_id": "uuid-here",
  "scheduled_job_id": "uuid-here",
  "quote_id": "uuid-here",
  "booking_id": "uuid-here",
  "references": {
    "scheduled_job_id": "uuid-here",
    "quote_id": "uuid-here",
    "booking_id": "uuid-here",
    "provider_id": "uuid-here",
    "business_id": "uuid-here"
  }
}
```

### Database Records Created:

1. **movers_scheduled_jobs** ✅
   - Should have `quote_id` populated
   - Provider should see this

2. **movers_quotes** ✅
   - Should have status 'confirmed'
   - Should be linked to scheduled job

3. **bookings** ✅
   - Should have `customer_id` set
   - Should have `service_details` with `quote_id` and `scheduled_job_id`
   - Customer should see this

4. **notifications** ✅
   - Provider should get a notification

## Troubleshooting

### If Customer Can't See Reservation:
- Check if `booking_id` was returned in API response
- Run SQL query to check if booking record was created
- Check if customer is logged in (`userId` must be set)

### If Provider Can't See Reservation:
- Check if `scheduled_job_id` was returned
- Run SQL query to check scheduled_jobs table
- Check if provider owns the business

### If Quote ID is Missing:
- Check logs for quote creation errors
- Quote should always be created (even if optional in request)

