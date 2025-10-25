"use client"

import Head from "next/head"
import { useServiceCategory } from "@/hooks/use-service-category"

interface SEOMetadataProps {
  title?: string
  description?: string
  keywords?: string[]
}

export function SEOMetadata({ title, description, keywords }: SEOMetadataProps) {
  const serviceCategory = useServiceCategory()

  // Use category-specific metadata if available
  const finalTitle = title || (serviceCategory ? serviceCategory.seoTitle : "Haulers.app - Transparent Service Marketplace")
  const finalDescription = description || (serviceCategory ? serviceCategory.seoDescription : "A nonprofit, transparent directory and marketplace for local services.")
  const finalKeywords = keywords || (serviceCategory ? serviceCategory.keywords : ["services", "marketplace", "transparent", "nonprofit"])

  return (
    <Head>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords.join(", ")} />
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      
      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="Haulers.app" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
    </Head>
  )
}
