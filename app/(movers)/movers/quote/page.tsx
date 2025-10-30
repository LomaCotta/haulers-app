"use client";

import { useState } from 'react'

export default function MoversQuoteDemo() {
  const [crewSize, setCrewSize] = useState(2)
  const [hours, setHours] = useState(3)
  const [miles, setMiles] = useState(12)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getQuote = async () => {
    setLoading(true)
    const res = await fetch('/api/movers/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewSize, estimatedHours: hours, distanceMiles: miles })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Movers Instant Quote (Demo)</h1>
      <label className="block">Crew size
        <input type="number" min={1} max={10} value={crewSize} onChange={e=>setCrewSize(parseInt(e.target.value))} className="border p-2 w-full" />
      </label>
      <label className="block">Estimated hours
        <input type="number" min={2} max={12} value={hours} onChange={e=>setHours(parseInt(e.target.value))} className="border p-2 w-full" />
      </label>
      <label className="block">Distance (miles)
        <input type="number" min={0} value={miles} onChange={e=>setMiles(parseInt(e.target.value))} className="border p-2 w-full" />
      </label>
      <button onClick={getQuote} disabled={loading} className="px-4 py-2 bg-black text-white rounded">{loading? 'Calculating...' : 'Get Quote'}</button>
      {result && (
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  )
}


