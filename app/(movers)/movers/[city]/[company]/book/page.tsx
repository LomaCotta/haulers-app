"use client";

export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import { useParams } from 'next/navigation'
import MoversBookingWizard from '@/app/(movers)/movers/book/page'

function BookingPageWithParams() {
  const params = useParams()
  const city = params.city as string
  const company = params.company as string
  
  // Extract businessId from URL or use the booking wizard
  // The booking wizard will handle businessId via query params
  return <MoversBookingWizard />
}

export default function CityCompanyBookingPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <BookingPageWithParams />
    </Suspense>
  )
}
