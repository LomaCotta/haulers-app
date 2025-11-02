import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/availability/slots/generate - Generate slots from templates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, startDate, weeksAhead = 4 } = body

    if (!businessId || !startDate) {
      return NextResponse.json({ error: 'Missing businessId or startDate' }, { status: 400 })
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

    // Call the database function to generate slots
    const { data, error } = await supabase.rpc('generate_availability_slots_from_templates', {
      p_business_id: businessId,
      p_start_date: startDate,
      p_weeks_ahead: weeksAhead
    })

    if (error) {
      console.error('Error generating slots:', error)
      // If function doesn't exist, generate manually
      return NextResponse.json({ 
        error: 'Generation function not available. Please run the migration first.',
        slots_created: 0
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      slots_created: data || 0
    })
  } catch (error) {
    console.error('Error in POST /api/availability/slots/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

