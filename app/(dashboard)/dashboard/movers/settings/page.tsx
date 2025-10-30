"use client";

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tier = { id?: string; crew_size: number; min_hours: number; base_rate_cents: number; hourly_rate_cents: number; per_mile_cents: number; active?: boolean }

export default function MoversSettingsPage() {
  const supabase = createClient()
  const search = useSearchParams()
  const businessIdFromQuery = search.get('businessId') || undefined
  const [providerId, setProviderId] = useState<string>('')
  const [baseZip, setBaseZip] = useState('')
  const [radius, setRadius] = useState<number>(25)
  const [minLead, setMinLead] = useState<number>(0)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load or create provider for the given business
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let prov: any = null
      if (businessIdFromQuery) {
        const { data } = await supabase.from('movers_providers').select('*').eq('business_id', businessIdFromQuery).maybeSingle()
        prov = data
        if (!prov) {
          const { data: created } = await supabase.from('movers_providers').insert({ business_id: businessIdFromQuery, owner_user_id: user.id, title: 'Movers' }).select('*').single()
          prov = created
        }
      } else {
        const { data } = await supabase.from('movers_providers').select('*').eq('owner_user_id', user.id).limit(1).maybeSingle()
        prov = data
      }
      if (!prov) return
      setProviderId(prov.id)
      setBaseZip(prov.base_zip || '')
      setRadius(prov.service_radius_miles || 25)
      setMinLead(prov.min_lead_minutes || 0)
      const { data: t } = await supabase.from('movers_pricing_tiers').select('*').eq('provider_id', prov.id).order('crew_size')
      setTiers((t || []).map((x: any) => ({ ...x })))
    })()
  }, [])

  const addTier = () => setTiers(prev => [...prev, { crew_size: (prev.at(-1)?.crew_size || 1) + 1, min_hours: 2, base_rate_cents: 0, hourly_rate_cents: 15000, per_mile_cents: 300 }])

  const saveAll = async () => {
    if (!providerId) return
    setSaving(true)
    await supabase.from('movers_providers').update({ base_zip: baseZip, service_radius_miles: radius, min_lead_minutes: minLead }).eq('id', providerId)
    // Upsert tiers
    const rows = tiers.map(t => ({ ...t, provider_id: providerId }))
    await supabase.from('movers_pricing_tiers').upsert(rows, { onConflict: 'id' })
    setSaving(false)
  }

  if (!providerId) return <div className="p-6">Create or select a Movers provider to configure settings.</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Movers Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Policies & Service Area</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border p-3 rounded" placeholder="Base ZIP" value={baseZip} onChange={e=>setBaseZip(e.target.value)} />
          <input className="border p-3 rounded" placeholder="Radius (miles)" type="number" value={radius} onChange={e=>setRadius(parseInt(e.target.value||'0'))} />
          <input className="border p-3 rounded" placeholder="Min lead (minutes)" type="number" value={minLead} onChange={e=>setMinLead(parseInt(e.target.value||'0'))} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Labor/Travel Tiers</h2>
          <button className="px-3 py-1 border rounded" onClick={addTier}>+ Add Tier</button>
        </div>
        <div className="space-y-2">
          {tiers.map((t, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 border p-3 rounded">
              <input type="number" className="border p-2 rounded" value={t.crew_size} onChange={e=>setTiers(v=>v.map((x,i)=>i===idx?{...x, crew_size: parseInt(e.target.value)}:x))} />
              <input type="number" className="border p-2 rounded" value={t.min_hours} onChange={e=>setTiers(v=>v.map((x,i)=>i===idx?{...x, min_hours: parseInt(e.target.value)}:x))} />
              <input type="number" className="border p-2 rounded" value={t.base_rate_cents} onChange={e=>setTiers(v=>v.map((x,i)=>i===idx?{...x, base_rate_cents: parseInt(e.target.value)}:x))} />
              <input type="number" className="border p-2 rounded" value={t.hourly_rate_cents} onChange={e=>setTiers(v=>v.map((x,i)=>i===idx?{...x, hourly_rate_cents: parseInt(e.target.value)}:x))} />
              <input type="number" className="border p-2 rounded" value={t.per_mile_cents} onChange={e=>setTiers(v=>v.map((x,i)=>i===idx?{...x, per_mile_cents: parseInt(e.target.value)}:x))} />
              <div className="self-center text-sm text-gray-500">crew/minH/baseC/hrC/miC</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={saveAll} disabled={saving} className="px-4 py-2 bg-black text-white rounded">{saving? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  )
}


