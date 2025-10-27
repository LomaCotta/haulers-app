'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User:', user)
      console.log('User Error:', userError)
      
      setUser(user)

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        console.log('Profile:', profileData)
        console.log('Profile Error:', profileError)
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInAsAdmin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'info@oneshotmove.com',
        password: 'admin123456'
      })

      if (error) {
        console.error('Sign in error:', error)
        alert('Sign in failed: ' + error.message)
      } else {
        console.log('Sign in success:', data)
        alert('Successfully signed in!')
        checkAuth()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      alert('Sign in error: ' + error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current User Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {user.created_at}</p>
                <p><strong>Last Sign In:</strong> {user.last_sign_in_at}</p>
              </div>
            ) : (
              <p className="text-red-600">No user logged in</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-2">
                <p><strong>Name:</strong> {profile.full_name}</p>
                <p><strong>Role:</strong> {profile.role}</p>
                <p><strong>Phone:</strong> {profile.phone}</p>
                <p><strong>Created:</strong> {profile.created_at}</p>
              </div>
            ) : (
              <p className="text-red-600">No profile found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={signInAsAdmin}>
              Sign In as Admin (info@oneshotmove.com)
            </Button>
            <Button variant="outline" onClick={checkAuth}>
              Refresh Auth Status
            </Button>
            {user && (
              <Button 
                variant="outline" 
                onClick={() => {
                  supabase.auth.signOut()
                  setUser(null)
                  setProfile(null)
                }}
              >
                Sign Out
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {user && profile ? (
              <div className="space-y-2">
                <p className="text-green-600">✅ You are logged in!</p>
                <p>Your role: <strong>{profile.role}</strong></p>
                {profile.role === 'admin' ? (
                  <p className="text-blue-600">You should be redirected to /admin</p>
                ) : (
                  <p className="text-blue-600">You should be redirected to /dashboard/businesses or /dashboard/bookings</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600">❌ Not logged in</p>
                <p>Click "Sign In as Admin" above to login</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
