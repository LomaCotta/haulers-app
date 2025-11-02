import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/availability/templates - List availability templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
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

    // Get templates
    const { data: templates, error } = await supabase
      .from('availability_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('weekday', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json(templates || [])
  } catch (error) {
    console.error('Error in GET /api/availability/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/availability/templates - Create availability template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      businessId,
      name,
      weekday,
      startTime,
      endTime,
      durationMinutes,
      patternType = 'weekly',
      bufferBeforeMinutes = 15,
      bufferAfterMinutes = 15,
      maxConcurrent = 1,
      validFrom,
      validUntil,
      autoGenerateWeeksAhead = 4
    } = body

    if (!businessId || !name || weekday === undefined || !startTime || !endTime || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Create template
    const { data: template, error } = await supabase
      .from('availability_templates')
      .insert({
        business_id: businessId,
        name,
        weekday,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        pattern_type: patternType,
        buffer_before_minutes: bufferBeforeMinutes,
        buffer_after_minutes: bufferAfterMinutes,
        max_concurrent: maxConcurrent,
        valid_from: validFrom || new Date().toISOString().split('T')[0],
        valid_until: validUntil || null,
        auto_generate_weeks_ahead: autoGenerateWeeksAhead,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error in POST /api/availability/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

