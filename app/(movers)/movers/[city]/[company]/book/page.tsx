"use client";

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from "react"
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MoveDetails = {
  pickupAddress: string
  deliveryAddress: string
  firstName: string
  lastName: string
  phone: string
  email: string
  moveDate: string
}

function WizardInner() {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState<MoveDetails>({
    pickupAddress: "",
    deliveryAddress: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    moveDate: "",
  })
  const [teamSize, setTeamSize] = useState(2)
  const [distanceMi, setDistanceMi] = useState<number | null>(null)
  const [loadingDistance, setLoadingDistance] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [businessId, setBusinessId] = useState<string | undefined>(undefined)
  const [providerName, setProviderName] = useState<string>("")
  const supabase = createClient()
  const params = useParams()
  const citySlug = (params?.city as string) || ''
  const companySlug = (params?.company as string) || ''

  // Resolve business by city/name slug
  useEffect(() => {
    (async () => {
      const companyGuess = companySlug.replace(/-/g, ' ')
      const cityGuess = citySlug.replace(/-/g, ' ')
      const { data } = await supabase
        .from('businesses')
        .select('id,name,city')
        .ilike('name', companyGuess)
        .ilike('city', cityGuess)
        .limit(1)
      const b = data?.[0]
      if (b?.id) {
        setBusinessId(b.id)
        setProviderName(b.name)
      }
    })()
  }, [citySlug, companySlug, supabase])

  const [tiers, setTiers] = useState<Array<{ crew_size: number; hourly_rate_cents: number; min_hours: number }>>([])

  useEffect(() => {
    (async () => {
      if (!businessId) return
      try {
        const res = await fetch(`/api/movers/provider-config?businessId=${businessId}`)
        const data = await res.json()
        if (data?.config?.tiers) setTiers(data.config.tiers)
      } catch {}
    })()
  }, [businessId])

  const hourlyRate = useMemo(() => {
    const tier = tiers.find(t => t.crew_size === teamSize) || tiers.reduce((best, t) => (Math.abs(t.crew_size - teamSize) < Math.abs((best?.crew_size ?? 99) - teamSize) ? t : best), tiers[0])
    if (tier) return Math.round((tier.hourly_rate_cents || 0) / 100)
    const rates: Record<number, number> = { 2: 100, 3: 150, 4: 200, 5: 250, 6: 300, 7: 350, 8: 400 }
    return rates[teamSize] ?? Math.max(2, teamSize) * 50
  }, [teamSize, tiers])

  async function computeDistance() {
    setLoadingDistance(true)
    setDistanceMi(null)
    const payload = {
      pickup_address: details.pickupAddress,
      dropoff_address: details.deliveryAddress,
      move_size: `${teamSize}-bedroom`,
      move_date: details.moveDate ? new Date(details.moveDate).toISOString() : undefined,
      packing_help: 'none',
      storage: 'none',
      ins_coverage: 'basic',
      mover_team: teamSize,
      hourly_rate: hourlyRate,
      full_name: `${details.firstName} ${details.lastName}`.trim(),
      email: details.email,
      phone: details.phone,
    }
    const res = await fetch('/api/movers/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, businessId }) })
    const data = await res.json()
    setLoadingDistance(false)
    if (data?.trip_distances?.distance != null) setDistanceMi(Math.round(data.trip_distances.distance))
    setQuote(data)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <ol className="flex items-center text-sm gap-3">
          {[1,2,3,4,5,6,7].map(n => (
            <li key={n} className={`px-3 py-1 rounded-full border transition-colors ${n===step? 'bg-orange-600 text-white border-orange-600 shadow-sm':'border-orange-200 text-orange-700 hover:bg-orange-50'}`}>Step {n}</li>
          ))}
        </ol>
      </div>

      {step !== 2 && step !== 3 && step !== 4 && (
        <section>
          <h1 className="text-2xl font-semibold mb-2">{providerName ? `Book with ${providerName}` : 'Start your booking'}</h1>
          <p className="text-gray-600 mb-6">Answer a few quick questions and we’ll craft a fair, transparent quote—then secure your crew in minutes.</p>
          <button className="px-6 py-3 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>setStep(2)}>Begin →</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-3xl font-semibold mb-4">What size is your move?</h1>
          <p className="text-gray-600 mb-6">We'll recommend the perfect team size for your move.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {label:'Studio', movers:2},
              {label:'1 Bedroom', movers:2},
              {label:'2 Bedroom', movers:3},
              {label:'3 Bedroom', movers:4},
              {label:'4+ Bedroom', movers:5},
              {label:'Custom Size', movers:3},
            ].map(opt => (
              <button key={opt.label} onClick={()=>setTeamSize(opt.movers)} className={`p-6 border rounded text-left ${teamSize===opt.movers? 'border-orange-500 shadow':''}`}>
                <div className="text-lg font-semibold">{opt.label}</div>
                <div className="text-orange-600 mt-1">{opt.movers} Movers</div>
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 border rounded flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Team Size</span>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={() => setTeamSize(s => Math.max(1, s - 1))}>−</button>
                <input type="number" min={1} max={10} value={teamSize} onChange={e => setTeamSize(Math.min(10, Math.max(1, parseInt(e.target.value || '1'))))} className="w-16 text-center border rounded p-1" />
                <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={() => setTeamSize(s => Math.min(10, s + 1))}>+</button>
              </div>
            </div>
            <div className="text-xl font-bold">${hourlyRate}/hr</div>
          </div>
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(1)}>← Back</button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>setStep(3)}>Continue →</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="text-3xl font-semibold mb-4">Moving Details</h1>
          <div className="mb-4 p-3 border rounded bg-blue-50 text-sm">Important: Please type your full address and pick a suggestion to ensure accurate quotes.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Pickup Address *" className="border p-3 rounded" value={details.pickupAddress} onChange={e=>setDetails(d=>({...d,pickupAddress:e.target.value}))} />
            <input placeholder="Delivery Address *" className="border p-3 rounded" value={details.deliveryAddress} onChange={e=>setDetails(d=>({...d,deliveryAddress:e.target.value}))} />
            <input placeholder="Apt / Suite (Pickup)" className="border p-3 rounded" />
            <input placeholder="Apt / Suite (Delivery)" className="border p-3 rounded" />
            <input placeholder="First Name *" className="border p-3 rounded" value={details.firstName} onChange={e=>setDetails(d=>({...d,firstName:e.target.value}))} />
            <input placeholder="Last Name *" className="border p-3 rounded" value={details.lastName} onChange={e=>setDetails(d=>({...d,lastName:e.target.value}))} />
            <input placeholder="Phone" className="border p-3 rounded" value={details.phone} onChange={e=>setDetails(d=>({...d,phone:e.target.value}))} />
            <input placeholder="Email" className="border p-3 rounded" value={details.email} onChange={e=>setDetails(d=>({...d,email:e.target.value}))} />
            <input placeholder="Move Date" type="date" className="border p-3 rounded md:col-span-2" value={details.moveDate} onChange={e=>setDetails(d=>({...d,moveDate:e.target.value}))} />
          </div>
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(2)}>← Back</button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>{computeDistance(); setStep(4)}}>Continue →</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h1 className="text-3xl font-semibold mb-4">Distance & Estimate</h1>
          <div className="mb-4">Pickup: <span className="font-medium">{details.pickupAddress || '—'}</span></div>
          <div className="mb-4">Delivery: <span className="font-medium">{details.deliveryAddress || '—'}</span></div>
          <button onClick={computeDistance} className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow disabled:opacity-50" disabled={loadingDistance || !details.pickupAddress || !details.deliveryAddress}>
            {loadingDistance ? 'Computing distance…' : 'Get Distance'}
          </button>
          {distanceMi != null && (
            <div className="mt-6 p-4 border rounded">
              <div className="text-sm text-gray-600">Estimated Distance</div>
              <div className="text-xl font-semibold">{distanceMi} mi</div>
            </div>
          )}
          {quote?.price && (
            <div className="mt-6 p-4 border rounded">
              <div className="text-lg font-semibold mb-2">Estimated Total: ${quote.price.amount}</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Base hourly: ${quote.price.breakdown.base_hourly}</div>
                <div>Insurance: ${quote.price.breakdown.insurance}</div>
                <div>Packing: ${quote.price.breakdown.packing}</div>
                <div>Storage: ${quote.price.breakdown.storage}</div>
                <div>Destination fee: ${quote.price.destination_fee}</div>
                <div className="font-medium">Total: ${quote.price.breakdown.total}</div>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(3)}>← Back</button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow disabled:opacity-50" onClick={()=>setStep(5)} disabled={distanceMi==null}>Continue →</button>
          </div>
        </section>
      )}
    </div>
  )
}

export default function MoversBookingWizardSlug() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <WizardInner />
    </Suspense>
  )
}







