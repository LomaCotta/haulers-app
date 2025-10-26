import type { Metadata } from "next"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { createClient } from "@/lib/supabase/server"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Haulers.app - Transparent Moving & Hauling Services",
  description: "A nonprofit, transparent directory and marketplace for local moving and hauling services.",
  keywords: ["moving", "hauling", "services", "nonprofit", "transparent", "local", "marketplace", "directory"],
  authors: [{ name: "Haulers.app" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: "Haulers.app - Transparent Moving & Hauling Services",
    description: "A nonprofit, transparent directory and marketplace for local moving and hauling services.",
    siteName: "Haulers.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Haulers.app - Transparent Moving & Hauling Services",
    description: "A nonprofit, transparent directory and marketplace for local moving and hauling services.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PWSR301L6D"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PWSR301L6D');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <Navigation />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
