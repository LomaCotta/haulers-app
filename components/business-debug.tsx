'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BusinessDebugProps {
  businessId: string
}

export default function BusinessDebug({ businessId }: BusinessDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const runDebug = async () => {
      try {
        setLoading(true)
        
        // Test 1: Check if business ID is valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isValidUUID = uuidRegex.test(businessId)
        
        // Test 2: Try simple business query
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, verified')
          .eq('id', businessId)
          .single()
        
        // Test 3: Try without RLS (if possible)
        const { data: allBusinesses, error: allError } = await supabase
          .from('businesses')
          .select('id, name, verified')
          .limit(5)
        
        // Test 4: Check auth status
        const { data: { user } } = await supabase.auth.getUser()
        
        setDebugInfo({
          businessId,
          isValidUUID,
          businessData,
          businessError: businessError ? {
            message: businessError.message,
            code: businessError.code,
            details: businessError.details,
            hint: businessError.hint
          } : null,
          allBusinesses,
          allError: allError ? {
            message: allError.message,
            code: allError.code,
            details: allError.details,
            hint: allError.hint
          } : null,
          user: user ? { id: user.id, email: user.email } : null,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          businessId,
          timestamp: new Date().toISOString()
        })
      } finally {
        setLoading(false)
      }
    }
    
    runDebug()
  }, [businessId])

  if (loading) {
    return <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">Loading debug info...</div>
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded text-xs">
      <h3 className="font-bold mb-2">Debug Information</h3>
      <pre className="whitespace-pre-wrap overflow-auto max-h-96">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  )
}
