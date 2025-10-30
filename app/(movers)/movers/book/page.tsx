"use client";

import { useMemo, useState } from "react"
import { useSearchParams } from 'next/navigation'

type MoveDetails = {
  pickupAddress: string
  deliveryAddress: string
  firstName: string
  lastName: string
  phone: string
  email: string
  moveDate: string
}

export default function MoversBookingWizard() {
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
  const search = useSearchParams()
  const providerId = search.get('providerId') || undefined

  const hourlyRate = useMemo(() => {
    // Demo: suggest hourly rate by crew size (load from provider tiers later)
    const rates: Record<number, number> = { 2: 100, 3: 150, 4: 200, 5: 250 }
    return rates[teamSize] ?? 100
  }, [teamSize])

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
    const res = await fetch('/api/movers/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, providerId }) })
    const data = await res.json()
    setLoadingDistance(false)
    if (data?.trip_distances?.distance != null) setDistanceMi(Math.round(data.trip_distances.distance))
    setQuote(data)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <ol className="flex items-center text-sm gap-4">
          {[1,2,3,4,5,6,7].map(n => (
            <li key={n} className={`px-3 py-1 rounded-full border ${n===step? 'bg-black text-white border-black':'border-gray-300'}`}>Step {n}</li>
          ))}
        </ol>
      </div>

      {step === 3 && (
        <section>
          <h1 className="text-3xl font-semibold mb-4">Moving Details</h1>
          <div className="mb-4 p-3 border rounded bg-blue-50 text-sm">
            Important: Please type your full address and pick a suggestion to ensure accurate quotes.
          </div>
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
            <button className="px-4 py-2 border rounded" onClick={()=>setStep(2)}>← Back</button>
            <button className="px-4 py-2 bg-black text-white rounded" onClick={()=>setStep(4)}>Continue →</button>
          </div>
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
          <div className="mt-6 p-4 border rounded flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Team Size</div>
              <div className="text-lg font-semibold">{teamSize} Movers</div>
            </div>
            <div className="text-xl font-bold">${hourlyRate}/hr</div>
          </div>
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded" onClick={()=>setStep(1)}>← Back</button>
            <button className="px-4 py-2 bg-black text-white rounded" onClick={()=>setStep(3)}>Continue →</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h1 className="text-3xl font-semibold mb-4">Distance & Estimate</h1>
          <div className="mb-4">Pickup: <span className="font-medium">{details.pickupAddress || '—'}</span></div>
          <div className="mb-4">Delivery: <span className="font-medium">{details.deliveryAddress || '—'}</span></div>
          <button onClick={computeDistance} className="px-4 py-2 bg-black text-white rounded" disabled={loadingDistance || !details.pickupAddress || !details.deliveryAddress}>
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
            <button className="px-4 py-2 border rounded" onClick={()=>setStep(3)}>← Back</button>
            <button className="px-4 py-2 bg-black text-white rounded" onClick={()=>setStep(5)} disabled={distanceMi==null}>Continue →</button>
          </div>
        </section>
      )}

      {step !== 2 && step !== 3 && step !== 4 && (
        <section>
          <h1 className="text-2xl font-semibold mb-2">Start your booking</h1>
          <p className="text-gray-600 mb-6">Follow the steps to receive an instant quote and reserve your team.</p>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={()=>setStep(2)}>Begin →</button>
        </section>
      )}
    </div>
  )
}


