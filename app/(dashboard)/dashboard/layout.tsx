'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Building, 
  Calendar, 
  MessageSquare, 
  Star, 
  Settings, 
  LogOut,
  User
} from 'lucide-react'

interface Profile {
  id: string
  role: 'consumer' | 'provider' | 'admin'
  full_name: string
  avatar_url?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
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
      }
    }

    getUser()
    setLoading(false)
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    ...(profile.role === 'provider' ? [
      { name: 'My Businesses', href: '/dashboard/businesses', icon: Building },
      { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    ] : []),
    ...(profile.role === 'consumer' ? [
      { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    ] : []),
    ...(profile.role === 'admin' ? [
      { name: 'Verify Providers', href: '/admin/verify', icon: Building },
      { name: 'Ledger', href: '/admin/ledger', icon: Star },
    ] : []),
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Haulers.app</span>
            </div>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-10 h-10 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{profile.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-6 border-t">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
