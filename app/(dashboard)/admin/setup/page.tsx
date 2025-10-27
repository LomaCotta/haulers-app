'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Shield, Database } from 'lucide-react'

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const createAdminUser = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Create the admin user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'info@oneshotmove.com',
        password: 'admin123456', // You can change this
        options: {
          data: {
            full_name: 'Admin User',
            role: 'admin'
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setMessage('Admin user already exists. Updating profile...')
          
          // Get the existing user and update their profile
          const { data: { user } } = await supabase.auth.signInWithPassword({
            email: 'info@oneshotmove.com',
            password: 'admin123456'
          })

          if (user) {
            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                role: 'admin',
                full_name: 'Admin User',
                phone: '(555) 123-4567'
              })

            if (updateError) {
              setMessage('Error updating profile: ' + updateError.message)
            } else {
              setMessage('✅ Admin user updated successfully! You can now access the admin dashboard.')
              setIsAdmin(true)
            }
          }
        } else {
          setMessage('Error creating admin user: ' + authError.message)
        }
      } else {
        setMessage('✅ Admin user created successfully! Check your email for verification.')
        setIsAdmin(true)
      }
    } catch (error) {
      setMessage('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const createSampleData = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Get current user to use as owner for businesses
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('You must be logged in to create sample data')
        setLoading(false)
        return
      }

      // Create sample businesses with the current user as owner
      const sampleBusinesses = [
        {
          owner_id: user.id,
          name: 'Elite Moving Services',
          description: 'Professional moving services with 10+ years experience. We handle residential and commercial moves with care.',
          phone: '(555) 123-4567',
          service_type: 'moving_services',
          verified: false,
          rating_avg: 4.8,
          rating_count: 24,
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90210',
          service_radius_km: 50
        },
        {
          owner_id: user.id,
          name: 'Quick Junk Removal',
          description: 'Fast and reliable junk removal services. We haul away anything you don\'t need.',
          phone: '(555) 987-6543',
          service_type: 'junk_haul',
          verified: true,
          rating_avg: 4.2,
          rating_count: 8,
          address: '456 Oak Ave',
          city: 'Santa Monica',
          state: 'CA',
          postal_code: '90401',
          service_radius_km: 25
        },
        {
          owner_id: user.id,
          name: 'Professional Packing Co',
          description: 'Expert packing and unpacking services for your move.',
          phone: '(555) 456-7890',
          service_type: 'packing_services',
          verified: false,
          rating_avg: 4.9,
          rating_count: 15,
          address: '789 Pine St',
          city: 'Beverly Hills',
          state: 'CA',
          postal_code: '90210',
          service_radius_km: 30
        }
      ]

      // Create sample bookings
      const sampleBookings = [
        {
          consumer_id: user.id,
          business_id: null, // Will be updated after businesses are created
          status: 'completed',
          move_date: '2024-10-15',
          details: { size: '2-bedroom apartment', notes: 'Fragile items included' },
          quote_cents: 120000, // $1200
          deposit_cents: 30000, // $300
        },
        {
          consumer_id: user.id,
          business_id: null,
          status: 'scheduled',
          move_date: '2024-10-28',
          details: { items: 'Old furniture and electronics', notes: 'Basement cleanup' },
          quote_cents: 45000, // $450
          deposit_cents: 10000, // $100
        },
        {
          consumer_id: user.id,
          business_id: null,
          status: 'quoted',
          move_date: '2024-11-05',
          details: { rooms: '3-bedroom house', packing_needed: true },
          quote_cents: 85000, // $850
          deposit_cents: 20000, // $200
        }
      ]

      // Insert businesses first
      const businessIds = []
      for (const business of sampleBusinesses) {
        const { data, error } = await supabase
          .from('businesses')
          .insert(business)
          .select()
          .single()
        
        if (error) {
          console.error('Error creating business:', error)
        } else {
          businessIds.push(data.id)
        }
      }

      // Update bookings with business IDs
      for (let i = 0; i < sampleBookings.length; i++) {
        if (businessIds[i]) {
          sampleBookings[i].business_id = businessIds[i]
        }
      }

      // Insert bookings
      for (const booking of sampleBookings) {
        if (booking.business_id) {
          const { error } = await supabase
            .from('bookings')
            .insert(booking)
          
          if (error) {
            console.error('Error creating booking:', error)
          }
        }
      }

      setMessage('✅ Sample data created successfully! Refresh the admin dashboard to see the data.')
    } catch (error) {
      setMessage('Error creating sample data: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Check admin status on load
  useState(() => {
    checkAdminStatus()
  })

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Setup Complete</h1>
            <p className="text-gray-600">You are now an admin user!</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Admin Access Confirmed
            </CardTitle>
            <CardDescription>You have full administrative access to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">Admin credentials:</p>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p><strong>Email:</strong> info@oneshotmove.com</p>
                <p><strong>Password:</strong> admin123456</p>
              </div>
              <p className="text-gray-700">You can now access:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Admin Dashboard at <code className="bg-gray-100 px-2 py-1 rounded">/admin</code></li>
                <li>Business verification tools</li>
                <li>User management</li>
                <li>Platform analytics</li>
              </ul>
              <div className="flex gap-2">
                <Button asChild>
                  <a href="/admin">Go to Admin Dashboard</a>
                </Button>
                <Button variant="outline" onClick={createSampleData} disabled={loading}>
                  <Database className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Add Sample Data'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-8 h-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Setup</h1>
          <p className="text-gray-600">Create admin user for info@oneshotmove.com</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Admin User</CardTitle>
          <CardDescription>Set up the admin account for platform management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Admin Account Details:</h4>
            <p className="text-blue-800"><strong>Email:</strong> info@oneshotmove.com</p>
            <p className="text-blue-800"><strong>Password:</strong> admin123456</p>
            <p className="text-blue-800"><strong>Role:</strong> admin</p>
          </div>
          
          <p className="text-gray-600">
            This will create an admin user account that can manage the entire platform.
          </p>
          
          <Button 
            onClick={createAdminUser} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Admin User...' : 'Create Admin User'}
          </Button>
        </CardContent>
      </Card>

      {/* Status Message */}
      {message && (
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${
              message.includes('✅') ? 'text-green-600' : 'text-red-600'
            }`}>
              {message.includes('✅') ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
