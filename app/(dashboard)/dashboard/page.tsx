"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  role: 'consumer' | 'provider' | 'admin'
  full_name: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No user found, redirecting to signin')
          router.push('/auth/signin')
          return
        }

        console.log('User found:', user.email)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.log('Profile error:', profileError.message)
          if (profileError.code === 'PGRST116') {
            // No profile found
            console.log('No profile found, redirecting to onboarding')
            setRedirecting(true)
            router.push('/onboarding')
            return
          }
        }

        if (profileData) {
          setProfile(profileData)
          console.log('Profile data:', profileData)
          setRedirecting(true)
          
          // Redirect based on role
          if (profileData.role === 'provider') {
            console.log('Redirecting provider to /dashboard/businesses')
            router.push('/dashboard/businesses')
          } else if (profileData.role === 'consumer') {
            console.log('Redirecting consumer to /dashboard/bookings')
            router.push('/dashboard/bookings')
          } else if (profileData.role === 'admin') {
            console.log('Redirecting admin to /admin')
            router.push('/admin')
          } else {
            console.log('Unknown role:', profileData.role)
            // Default to consumer dashboard for unknown roles
            router.push('/dashboard/bookings')
          }
        } else {
          console.log('No profile data found for user:', user.id)
          setRedirecting(true)
          router.push('/onboarding')
        }
      } catch (error) {
        console.error('Error in getUser:', error)
        setRedirecting(true)
        router.push('/onboarding')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, supabase])

  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading your dashboard...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    )
  }

  return null // Will redirect based on role
}
