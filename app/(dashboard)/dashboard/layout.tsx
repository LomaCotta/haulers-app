'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Building, 
  Calendar, 
  CalendarDays,
  MessageSquare, 
  Star, 
  Settings, 
  LogOut,
  User,
  Globe,
  Users
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  role: 'consumer' | 'provider' | 'admin'
  full_name: string
  avatar_url?: string
}

const HAPPY_QUOTES = [
  "You're doing great! 💪",
  "Today is your day! ✨",
  "You've got this! 🌟",
  "Keep shining! ☀️",
  "You're amazing! 🎉",
  "Stay positive! 😊",
  "Dream big! 🌈",
  "You're awesome! 🚀",
  "Be yourself! 💫",
  "You matter! ❤️",
  "Keep going! 🎯",
  "You're unstoppable! 🔥",
  "Stay grateful! 🙏",
  "You're loved! 💕",
  "Be kind today! 🌸",
  "Smile! 😄",
  "You're capable! 💪",
  "Today's a gift! 🎁",
  "You're enough! ✨",
  "Spread joy! 🌺",
  "You're brilliant! 🌟",
  "Stay hopeful! 🌈",
  "You're wonderful! 💛",
  "Be present! 🧘",
  "You're strong! 💪",
  "Choose happiness! 😊",
  "You're special! ⭐",
  "Keep believing! 🙌",
  "You're valued! 💎",
  "Be authentic! ✨",
  "You're powerful! 🔥",
  "Stay curious! 🧐",
  "You're inspiring! 💡",
  "Be patient! ⏳",
  "You're growing! 🌱",
  "Stay positive! ☀️",
  "You're blessed! 🙏",
  "Be gentle! 🌸",
  "You're learning! 📚",
  "Stay focused! 🎯",
  "You're resilient! 💪",
  "Be confident! 🌟",
  "You're beautiful! 💜",
  "Stay motivated! 🚀",
  "You're creative! 🎨",
  "Be brave! 🦁",
  "You're evolving! 🌱",
  "Stay true! 💎",
  "You're magnetic! ⚡",
  "Be joyful! 😄"
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dailyQuote, setDailyQuote] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Generate a random quote on mount
    const randomQuote = HAPPY_QUOTES[Math.floor(Math.random() * HAPPY_QUOTES.length)]
    setDailyQuote(randomQuote)
  }, [])

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Loading your profile...</p>
          <p className="text-sm text-gray-500">
            If this takes too long, you may not be logged in.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.href = '/auth/signin'}
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    ...(profile.role === 'provider' ? [
      { name: 'My Businesses', href: '/dashboard/businesses', icon: Building },
      { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Calendar', href: '/dashboard/bookings?view=calendar', icon: CalendarDays },
      { name: 'Clients', href: '/dashboard/clients', icon: Users },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    ] : []),
    ...(profile.role === 'consumer' ? [
      { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Calendar', href: '/dashboard/bookings?view=calendar', icon: CalendarDays },
      { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
    ] : []),
    ...(profile.role === 'admin' ? [
      { name: 'Verify Providers', href: '/admin/verify', icon: Building },
      { name: 'Ledger', href: '/admin/ledger', icon: Star },
    ] : []),
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - Enhanced Design with Mobile Support */}
        <div className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Sidebar Header with Logo and Mobile Close Button */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100/50 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="font-bold text-lg sm:text-xl text-gray-800 truncate">Haulers.app</span>
            </Link>
            
            {/* Mobile Close Button - Inside sidebar header */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Happy Quote Section - Replaces Logo */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
            <div className="text-center">
              {dailyQuote && (
                <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed break-words">
                  {dailyQuote}
                </p>
              )}
            </div>
          </div>

          {/* User Profile Section */}
          <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative flex-shrink-0">
                <Avatar 
                  src={profile.avatar_url} 
                  alt={profile.full_name}
                  size="md"
                  className="ring-2 ring-orange-100"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base text-gray-900 truncate mb-1">{profile.full_name}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{profile.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-5 py-4 sm:py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-200 group relative min-h-[44px]",
                    active
                      ? "bg-gradient-to-r from-orange-50 to-orange-50/50 text-orange-600 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  style={active ? { borderLeft: '4px solid rgb(249 115 22)' } : undefined}
                >
                  <item.icon 
                    className={cn(
                      "w-5 h-5 transition-all duration-200 flex-shrink-0",
                      active 
                        ? "text-orange-600" 
                        : "text-gray-500 group-hover:text-orange-500"
                    )} 
                  />
                  <span className={cn(
                    "font-medium text-sm leading-relaxed truncate",
                    active ? "font-semibold text-orange-600" : "text-gray-700 group-hover:text-gray-900"
                  )}>
                    {item.name}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                  )}
                </Link>
              )
            })}
          </nav>


          {/* Sign Out Button */}
          <div className="px-3 sm:px-5 py-4 sm:py-6 border-t border-gray-200 bg-gray-50/50">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 py-3 min-h-[44px]"
            >
              <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto w-full">
          {/* Mobile Header with Logo and Menu Button */}
          <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              {/* Haulers Logo - Always visible on mobile */}
              <Link href="/" className="flex items-center space-x-2 flex-shrink-0 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="font-bold text-lg text-gray-800">Haulers.app</span>
              </Link>
              
              {/* Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 min-h-[44px] min-w-[44px] justify-center"
              >
                <svg className="w-6 h-6 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
