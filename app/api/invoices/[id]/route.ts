import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invoices/[id] - Get single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(*),
        business:businesses(id, name, phone, email),
        customer:profiles(id, full_name, email),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify access
    const isBusinessOwner = invoice.business?.owner_id === user.id
    const isCustomer = invoice.customer_id === user.id

    if (!isBusinessOwner && !isCustomer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error in GET /api/invoices/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/invoices/[id] - Update invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes, items } = body

    // Get invoice and verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, business:businesses(owner_id)')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const business = invoice.business as any
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only business owner can update invoice' }, { status: 403 })
    }

    // Update invoice
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
      
      // If marking as sent, set sent date
      if (status === 'sent' && !invoice.email_sent_at) {
        updateData.email_sent_at = new Date().toISOString()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id)

      // Insert new items
      if (items.length > 0) {
        const invoiceItems = items.map((item: any, index: number) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.unit_price_cents * (item.quantity || 1),
          item_type: item.item_type || 'service',
          display_order: index
        }))

        await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        // Recalculate totals
        const subtotal = items.reduce((sum: number, item: any) => {
          return sum + (item.unit_price_cents * (item.quantity || 1))
        }, 0)

        await supabase
          .from('invoices')
          .update({
            subtotal_cents: subtotal,
            total_cents: subtotal,
            balance_cents: subtotal - (updatedInvoice.paid_cents || 0)
          })
          .eq('id', id)
      }
    }

    // Reload invoice with items
    const { data: finalInvoice } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json(finalInvoice)
  } catch (error) {
    console.error('Error in PATCH /api/invoices/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

