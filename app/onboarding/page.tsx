'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, User } from 'lucide-react'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        // Redirect based on role
        if (profileData.role === 'provider') {
          router.push('/dashboard/businesses')
        } else if (profileData.role === 'consumer') {
          router.push('/dashboard/bookings')
        } else if (profileData.role === 'admin') {
          router.push('/admin')
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setError('Error loading your profile')
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create a basic consumer profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          role: 'consumer',
          full_name: user.user_metadata?.full_name || 'User',
        })

      if (error) {
        setError('Failed to create profile: ' + error.message)
        return
      }

      // Redirect to consumer dashboard
      router.push('/dashboard/bookings')
    } catch (error) {
      setError('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome!</CardTitle>
          <CardDescription className="text-gray-600">
            Let's set up your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                It looks like your profile wasn't created properly. Let's fix that!
              </p>
              <Button onClick={createProfile} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" />
                Create My Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}