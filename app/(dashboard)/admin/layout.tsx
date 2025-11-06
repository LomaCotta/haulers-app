'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  Edit3,
  Star,
  FileText
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

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
  const pathname = usePathname()
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
    { name: 'Reviews', href: '/admin/reviews', icon: Star },
    { name: 'Mission Submissions', href: '/admin/mission-submissions', icon: FileText },
    { name: 'Platform Ledger', href: '/admin/ledger', icon: BarChart3 },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - Enhanced Design */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-200">Admin Panel</span>
            </Link>
          </div>

          {/* User Profile Section */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar 
                  src={profile.avatar_url} 
                  alt={profile.full_name}
                  size="md"
                  className="ring-2 ring-red-100"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{profile.full_name}</p>
                <p className="text-xs text-red-600 font-medium">Administrator</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                    active
                      ? "bg-gradient-to-r from-red-50 to-red-50/50 text-red-600 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  style={active ? { borderLeft: '4px solid rgb(239 68 68)' } : undefined}
                >
                  <item.icon 
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      active 
                        ? "text-red-600" 
                        : "text-gray-500 group-hover:text-red-500"
                    )} 
                  />
                  <span className={cn(
                    "font-medium text-sm",
                    active ? "font-semibold text-red-600" : "text-gray-700 group-hover:text-gray-900"
                  )}>
                    {item.name}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-2">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200" asChild>
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                <span className="font-medium">User Dashboard</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="font-medium">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <main className="p-8 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}