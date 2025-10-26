"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  role: string
  email: string
}

// Global cache to prevent multiple requests
let authCache: {
  user: AuthUser | null
  timestamp: number
  loading: boolean
} = {
  user: null,
  timestamp: 0,
  loading: false
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(authCache.user)
  const [loading, setLoading] = useState(authCache.loading)
  const supabase = createClient()

  const checkAuth = useCallback(async () => {
    // Return cached data if still valid
    if (authCache.user && Date.now() - authCache.timestamp < CACHE_DURATION) {
      setUser(authCache.user)
      setLoading(false)
      return
    }

    // Prevent multiple simultaneous requests
    if (authCache.loading) {
      return
    }

    authCache.loading = true
    setLoading(true)

    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.log('Auth error:', error)
        authCache.user = null
        setUser(null)
      } else if (authUser) {
        const userData = {
          id: authUser.id,
          role: "consumer", // Default role to avoid database calls
          email: authUser.email || ""
        }
        authCache.user = userData
        authCache.timestamp = Date.now()
        setUser(userData)
      } else {
        authCache.user = null
        setUser(null)
      }
    } catch (error) {
      console.log('Auth check failed:', error)
      authCache.user = null
      setUser(null)
    } finally {
      authCache.loading = false
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Only check auth if we don't have cached data
    if (!authCache.user || Date.now() - authCache.timestamp >= CACHE_DURATION) {
      // Debounce the auth check
      const timer = setTimeout(checkAuth, 100)
      return () => clearTimeout(timer)
    } else {
      setUser(authCache.user)
      setLoading(false)
    }
  }, [checkAuth])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      authCache.user = null
      authCache.timestamp = 0
      setUser(null)
    } catch (error) {
      console.log('Sign out error:', error)
    }
  }, [supabase])

  return {
    user,
    loading,
    signOut,
    refreshAuth: checkAuth
  }
}
