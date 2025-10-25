import type { Metadata } from "next"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { SEOMetadata } from "@/components/seo-metadata"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Haulers.app - Transparent Moving & Hauling Services",
  description: "A nonprofit, transparent directory and marketplace for local moving and hauling services.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile for role
  let userRole = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    userRole = profile?.role
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SEOMetadata />
      </head>
      <body suppressHydrationWarning>
        <Navigation user={user ? { id: user.id, role: userRole || "customer" } : null} />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
