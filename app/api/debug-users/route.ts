import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile error', details: profileError }, { status: 500 })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not admin' }, { status: 403 })
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json({ error: 'Users error', details: usersError }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      userCount: users?.length || 0,
      users: users || [],
      currentUser: {
        id: user.id,
        role: profile?.role
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
