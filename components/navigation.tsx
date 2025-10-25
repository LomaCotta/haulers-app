"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, User, Building2, BookOpen, Shield, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationProps {
  user?: {
    id: string
    role: string
  } | null
}

export function Navigation({ user }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/find", label: "Find Services" },
    { href: "/categories", label: "All Categories" },
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

  const authLinks = user ? [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/auth/signout", label: "Sign Out" },
  ] : [
    { href: "/auth/signin", label: "Sign In" },
    { href: "/auth/signup", label: "Sign Up" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <span className="font-bold text-xl">Haulers.app</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 ml-8">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive(link.href) ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          {/* User Menu */}
          {user ? (
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/auth/signout">
                <Button variant="ghost" size="sm">
                  Sign Out
                </Button>
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">Menu</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Public Links */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">Public</h3>
                  {publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block px-3 py-2 text-sm rounded-md transition-colors",
                        isActive(link.href) 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Dashboard Links */}
                {user && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Dashboard</h3>
                    {dashboardLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors",
                          isActive(link.href) 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        {link.icon && <link.icon className="h-4 w-4" />}
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Auth Links */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">Account</h3>
                  {authLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block px-3 py-2 text-sm rounded-md transition-colors",
                        isActive(link.href) 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
