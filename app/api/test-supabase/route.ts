import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Test database connection
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data: {
        user: user ? { id: user.id, email: user.email } : null,
        userError,
        profilesCount: profiles?.length || 0,
        profilesError,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Supabase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
