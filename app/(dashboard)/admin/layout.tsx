'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Building, 
  Users,
  BarChart3,
  Settings, 
  LogOut,
  User,
  Shield,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  Edit3
} from 'lucide-react'

interface Profile {
  id: string
  role: 'consumer' | 'provider' | 'admin'
  full_name: string
  avatar_url?: string
}

export default function AdminLayout({
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
        if (profileData.role !== 'admin') {
          router.push('/admin/setup')
          return
        }
        setProfile(profileData)
      } else {
        // No profile found, redirect to setup
        router.push('/admin/setup')
        return
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
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Verify Businesses', href: '/admin/verify', icon: Shield },
    { name: 'Edit Requests', href: '/admin/edit-requests', icon: Edit3 },
    { name: 'Manage Users', href: '/admin/users', icon: Users },
    { name: 'All Bookings', href: '/admin/bookings', icon: Building },
    { name: 'Platform Ledger', href: '/admin/ledger', icon: BarChart3 },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Admin Panel</span>
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
                <p className="text-sm text-red-600 font-medium">Administrator</p>
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
            <div className="mb-4">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  User Dashboard
                </Link>
              </Button>
            </div>
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