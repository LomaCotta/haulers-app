import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      submission_type, 
      name, 
      email, 
      phone, 
      organization, 
      message,
      additional_data 
    } = body

    if (!submission_type || !email) {
      return NextResponse.json(
        { error: "Submission type and email are required" },
        { status: 400 }
      )
    }

    const validTypes = [
      'discord_join',
      'category_vote',
      'donation',
      'founding_supporter',
      'city_node_pilot',
      'white_label_demo'
    ]

    if (!validTypes.includes(submission_type)) {
      return NextResponse.json(
        { error: "Invalid submission type" },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS for public form submissions
    // We validate all data server-side, so this is safe
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('mission_submissions')
      .insert({
        submission_type,
        name: name || null,
        email,
        phone: phone || null,
        organization: organization || null,
        message: message || null,
        additional_data: additional_data || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json(
        { error: "Failed to submit form" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      id: data.id,
      message: "Thank you! We'll be in touch soon." 
    })
  } catch (error) {
    console.error('Error in mission submission:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

