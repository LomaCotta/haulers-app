import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate invoice number
async function generateInvoiceNumber(businessId: string, issueDate: Date): Promise<string> {
  const supabase = await createClient()
  const year = issueDate.getFullYear()
  
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('issue_date', new Date(year, 0, 1).toISOString())
    .lt('issue_date', new Date(year + 1, 0, 1).toISOString())
  
  const invoiceNum = `INV-${year}-${String((count || 0) + 1).padStart(5, '0')}`
  return invoiceNum
}

// GET /api/invoices - List invoices (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(id, booking_status, review_requested_at),
        business:businesses(id, name),
        customer:profiles(id, full_name)
      `)
      .order('created_at', { ascending: false })

    // Business owners see their invoices
    if (businessId) {
      query = query.eq('business_id', businessId)
      
      // Verify ownership
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single()

      if (!business || business.owner_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } 
    // Customers see their invoices
    else if (customerId) {
      if (customerId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      query = query.eq('customer_id', customerId)
    } 
    // Default: show all invoices user has access to
    else {
      // Get user's businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)

      const businessIds = businesses?.map(b => b.id) || []
      
      // If user owns businesses, fetch invoices separately and combine
      if (businessIds.length > 0) {
        // Build queries for business invoices
        let businessQuery = supabase
          .from('invoices')
          .select(`
            *,
            booking:bookings(*),
            business:businesses(id, name),
            customer:profiles(id, full_name)
          `)
          .in('business_id', businessIds)

        // Apply status filter if provided
        if (status) {
          businessQuery = businessQuery.eq('status', status)
        }

        const { data: businessInvoices, error: businessError } = await businessQuery
          .order('created_at', { ascending: false })

        // Build queries for customer invoices
        let customerQuery = supabase
          .from('invoices')
          .select(`
            *,
            booking:bookings(*),
            business:businesses(id, name),
            customer:profiles(id, full_name)
          `)
          .eq('customer_id', user.id)

        // Apply status filter if provided
        if (status) {
          customerQuery = customerQuery.eq('status', status)
        }

        const { data: customerInvoices, error: customerError } = await customerQuery
          .order('created_at', { ascending: false })

        if (businessError || customerError) {
          console.error('Error fetching invoices:', { businessError, customerError })
          return NextResponse.json({ 
            error: 'Failed to fetch invoices',
            details: businessError?.message || customerError?.message
          }, { status: 500 })
        }

        // Combine and deduplicate invoices
        const allInvoices = [...(businessInvoices || []), ...(customerInvoices || [])]
        const uniqueInvoices = Array.from(
          new Map(allInvoices.map(inv => [inv.id, inv])).values()
        )
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        // Check which invoices have reviews
        const bookingIds = uniqueInvoices
          .filter(inv => inv.booking_id)
          .map(inv => inv.booking_id)
        
        let reviewsMap = new Map()
        if (bookingIds.length > 0) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('booking_id')
            .in('booking_id', bookingIds)
          
          if (reviews) {
            reviews.forEach((review: any) => {
              reviewsMap.set(review.booking_id, true)
            })
          }
        }

        // Add review_exists flag to each invoice
        const invoicesWithReviewStatus = uniqueInvoices.map(inv => ({
          ...inv,
          review_exists: inv.booking_id ? reviewsMap.has(inv.booking_id) : false
        }))

        return NextResponse.json(invoicesWithReviewStatus)
      } else {
        // Only show invoices where they are the customer
        query = query.eq('customer_id', user.id)
      }
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error: JSON.stringify(error, null, 2)
      })
      
      // Check if table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Invoices table not found. Please run the migration first.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch invoices',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    // Check which invoices have reviews (for single query path)
    const bookingIds = (invoices || [])
      .filter(inv => inv.booking_id)
      .map(inv => inv.booking_id)
    
    let reviewsMap = new Map()
    if (bookingIds.length > 0) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds)
      
      if (reviews) {
        reviews.forEach((review: any) => {
          reviewsMap.set(review.booking_id, true)
        })
      }
    }

    // Add review_exists flag to each invoice
    const invoicesWithReviewStatus = (invoices || []).map(inv => ({
      ...inv,
      review_exists: inv.booking_id ? reviewsMap.has(inv.booking_id) : false
    }))

    return NextResponse.json(invoicesWithReviewStatus)
  } catch (error) {
    console.error('Error in GET /api/invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      bookingId,
      businessId,
      customerId,
      invoiceType = 'one_time',
      issueDate,
      dueDate,
      paymentTermsDays = 30,
      notes,
      items = [] // Array of {description, quantity, unit_price_cents, item_type}
    } = body

    if (!businessId || !customerId) {
      return NextResponse.json({ error: 'Missing businessId or customerId' }, { status: 400 })
    }

    // Verify business ownership
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single()

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get booking data if provided
    let subtotalCents = 0
    let bookingTotal = 0
    
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_price_cents, additional_fees_cents, base_price_cents, hourly_rate_cents, estimated_duration_hours')
        .eq('id', bookingId)
        .single()

      if (booking) {
        bookingTotal = booking.total_price_cents || 0
      }
    }

    // Calculate totals from items
    if (items.length > 0) {
      subtotalCents = items.reduce((sum: number, item: any) => {
        return sum + (item.unit_price_cents * (item.quantity || 1))
      }, 0)
    } else if (bookingTotal > 0) {
      subtotalCents = bookingTotal
    }

    const totalCents = subtotalCents // Add tax calculation later
    const balanceCents = totalCents

    // Generate invoice number
    const issueDateObj = issueDate ? new Date(issueDate) : new Date()
    const invoiceNumber = await generateInvoiceNumber(businessId, issueDateObj)

    // Calculate due date
    const dueDateObj = dueDate ? new Date(dueDate) : new Date(issueDateObj)
    dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays)

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        booking_id: bookingId || null,
        business_id: businessId,
        customer_id: customerId,
        invoice_type: invoiceType,
        status: 'draft',
        issue_date: issueDateObj.toISOString().split('T')[0],
        due_date: dueDateObj.toISOString().split('T')[0],
        payment_terms_days: paymentTermsDays,
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
        balance_cents: balanceCents,
        notes: notes || null
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Send notification to customer about new invoice
    if (invoice?.customer_id) {
      try {
        const { sendNotification } = await import('@/lib/notifications')
        await sendNotification(
          invoice.customer_id,
          'invoice_created',
          'email',
          {
            invoice_id: invoice.id,
            booking_id: bookingId || undefined,
            message: 'A new invoice has been created for you'
          }
        )
      } catch (notifError) {
        console.error('Error sending invoice notification:', notifError)
        // Don't fail invoice creation if notification fails
      }
    }

    // Create invoice items
    if (items.length > 0) {
      const invoiceItems = items.map((item: any, index: number) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.unit_price_cents * (item.quantity || 1),
        item_type: item.item_type || 'service',
        display_order: index
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError)
        // Don't fail - invoice is created, items can be added later
      }
    }

    // If booking exists, link items from booking
    if (bookingId) {
      const { data: bookingItems } = await supabase
        .from('booking_items')
        .select('*')
        .eq('booking_id', bookingId)

      if (bookingItems && bookingItems.length > 0) {
        const invoiceItems = bookingItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.item_name,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.total_price_cents,
          item_type: item.item_category,
          booking_item_id: item.id,
          display_order: index + (items.length || 0)
        }))

        await supabase
          .from('invoice_items')
          .insert(invoiceItems)
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error in POST /api/invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

