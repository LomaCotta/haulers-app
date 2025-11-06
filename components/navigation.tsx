"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Menu, X, User, Building2, BookOpen, Shield, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

interface NavigationProps {
  user?: {
    id: string
    role: string
  } | null
}

export function Navigation({ user: propUser }: NavigationProps) {
  const { user, loading, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Hide navigation on dashboard/admin pages (they have their own sidebar)
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null
  }

  // Use prop user if provided, otherwise use auth hook
  const currentUser = propUser || user

  const isActive = (path: string) => pathname === path

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/find", label: "Find Services" },
    { href: "/categories", label: "All Categories" },
    { href: "/mission", label: "Mission" },
    { href: "/transparency", label: "Transparency" },
    { href: "/pricing", label: "Pricing" },
  ]

  const dashboardLinks = user?.role === "admin" ? [
    { href: "/admin", label: "Admin Dashboard", icon: Shield },
    { href: "/admin/businesses", label: "Businesses", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: User },
    { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
    { href: "/admin/ledger", label: "Ledger", icon: DollarSign },
  ] : user?.role === "provider" ? [
    { href: "/dashboard", label: "Dashboard", icon: User },
    { href: "/dashboard/businesses", label: "My Businesses", icon: Building2 },
    { href: "/dashboard/bookings", label: "Bookings", icon: BookOpen },
  ] : [
    { href: "/dashboard", label: "Dashboard", icon: User },
    { href: "/dashboard/bookings", label: "My Bookings", icon: BookOpen },
  ]

  const authLinks = currentUser ? [] : [
    { href: "/auth/signin", label: "Sign In" },
    { href: "/auth/signup", label: "Sign Up" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-bold text-xl text-gray-800">Haulers.app</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8 ml-8">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-base font-bold transition-all duration-200 hover:text-primary hover:scale-105",
                isActive(link.href) ? "text-primary" : "text-gray-800"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          {/* User Menu */}
          {currentUser ? (
                        <div className="hidden md:flex items-center space-x-6">
                          <Link href="/dashboard">
                            <Button variant="outline" size="sm" className="font-bold border-2 border-orange-500 text-orange-600 hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-500 hover:text-white hover:border-orange-600 transition-all duration-200">
                              Dashboard
                            </Button>
                          </Link>
                          <Button 
                            onClick={signOut}
                            variant="ghost" 
                            size="sm" 
                            className="font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
                          >
                            Sign Out
                          </Button>
                        </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm" className="font-semibold hover:bg-gray-100 transition-all duration-200">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu - Premium Design */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden hover:bg-orange-50 hover:text-orange-600">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-gradient-to-br from-white to-gray-50 border-l border-gray-200">
              <SheetHeader className="pb-6 border-b border-gray-200">
                <SheetTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col space-y-6 pt-6">
                {/* Public Links */}
                <div className="space-y-2">
                  {publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center px-4 py-3 text-base rounded-lg transition-all duration-200 min-h-[44px]",
                        isActive(link.href) 
                          ? "bg-gradient-to-r from-orange-50 to-orange-50/50 text-orange-600 shadow-sm border-l-4 border-orange-500 font-semibold" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <span>{link.label}</span>
                      {isActive(link.href) && (
                        <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Dashboard Links */}
                {currentUser && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider px-3 mb-2">Dashboard</h3>
                    {dashboardLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3 text-base rounded-lg transition-all duration-200 min-h-[44px]",
                          isActive(link.href) 
                            ? "bg-gradient-to-r from-orange-50 to-orange-50/50 text-orange-600 shadow-sm border-l-4 border-orange-500 font-semibold" 
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.icon && (
                          <link.icon className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isActive(link.href) ? "text-orange-600" : "text-gray-500"
                          )} />
                        )}
                        <span>{link.label}</span>
                        {isActive(link.href) && (
                          <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Account Actions */}
                {authLinks.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider px-3 mb-2">Account</h3>
                    {authLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center px-4 py-3 text-base rounded-lg transition-all duration-200 min-h-[44px]",
                          isActive(link.href) 
                            ? "bg-gradient-to-r from-orange-50 to-orange-50/50 text-orange-600 shadow-sm border-l-4 border-orange-500 font-semibold" 
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <span>{link.label}</span>
                        {isActive(link.href) && (
                          <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                
                {/* Sign Out Button */}
                {currentUser && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        signOut()
                        setIsOpen(false)
                      }}
                      className="flex items-center w-full text-left px-4 py-3 text-base rounded-lg transition-all duration-200 min-h-[44px] text-gray-700 hover:bg-red-50 hover:text-red-600 font-medium"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
