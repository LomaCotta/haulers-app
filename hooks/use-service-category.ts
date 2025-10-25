"use client"

import { useEffect, useState } from 'react'
import { ServiceCategory, getCategoryBySubdomain } from '@/config/service-categories'

export function useServiceCategory(): ServiceCategory | null {
  const [category, setCategory] = useState<ServiceCategory | null>(null)

  useEffect(() => {
    // Check if we're on a subdomain
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const subdomain = hostname.split('.')[0]
      
      // Check for category in URL params (for development)
      const urlParams = new URLSearchParams(window.location.search)
      const categoryParam = urlParams.get('category')
      
      if (categoryParam) {
        const foundCategory = getCategoryBySubdomain(categoryParam)
        if (foundCategory) {
          setCategory(foundCategory)
          return
        }
      }
      
      // Check subdomain
      if (subdomain !== 'www' && subdomain !== 'localhost') {
        const foundCategory = getCategoryBySubdomain(subdomain)
        if (foundCategory) {
          setCategory(foundCategory)
        }
      }
    }
  }, [])

  return category
}
