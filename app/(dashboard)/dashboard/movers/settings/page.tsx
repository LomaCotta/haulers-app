"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tier = { id?: string; crew_size: number; min_hours: number; base_rate_cents: number; hourly_rate_cents: number; per_mile_cents: number; active?: boolean }
type HeavyTier = { id?: string; min_weight_lbs: number; max_weight_lbs: number; price_cents: number; active?: boolean }
type Material = { id?: string; name: string; price_cents: number; included: boolean }

export default function MoversSettingsPage() {
  const supabase = createClient()
  const search = useSearchParams()
  const providerIdFromQuery = search.get('providerId') || undefined
  const businessIdFromQuery = search.get('businessId') || undefined
  const [providerId, setProviderId] = useState<string>('')
  const [baseZip, setBaseZip] = useState('')
  const [radius, setRadius] = useState<number>(25)
  const [minLead, setMinLead] = useState<number>(0)
  const [destinationFeePerMile, setDestinationFeePerMile] = useState<number>(230) // Default $2.30/mile in cents
  const [maxTravelDistance, setMaxTravelDistance] = useState<number | null>(null) // No limit by default
  const [tiers, setTiers] = useState<Tier[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const loadingRef = useRef(false)
  const [heavyTiers, setHeavyTiers] = useState<HeavyTier[]>([])
  const [packingEnabled, setPackingEnabled] = useState(false)
  const [packingPerRoom, setPackingPerRoom] = useState<number>(0)
  const [materialsIncluded, setMaterialsIncluded] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [stairsIncluded, setStairsIncluded] = useState(true)
  const [stairsPerFlight, setStairsPerFlight] = useState<number>(0)

  const loadProviderAndTiers = async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let prov: any = null
      if (providerIdFromQuery) {
        const { data: provExact } = await supabase.from('movers_providers').select('*').eq('id', providerIdFromQuery).maybeSingle()
        prov = provExact
      } else if (!businessIdFromQuery) {
        // Require explicit businessId to avoid creating duplicate providers
        return
      }
      // Upsert-like behavior enforced by unique index on business_id
      const { data: existing } = await supabase
        .from('movers_providers')
        .select('*')
        .eq('business_id', businessIdFromQuery as string)
        .maybeSingle()
      if (existing) {
        prov = existing
      } else {
        const { data: created } = await supabase
          .from('movers_providers')
          .insert({ business_id: businessIdFromQuery as string, owner_user_id: user.id, title: 'Movers' })
          .select('*')
          .single()
        prov = created
      }
      if (!prov) return
      setProviderId(prov.id)
      // Try consolidated config first
      const { data: cfg } = await supabase
        .from('movers_provider_config')
        .select('policies, tiers, heavy_item_tiers, packing')
        .eq('provider_id', prov.id)
        .maybeSingle()
      if (cfg) {
        const pol = (cfg as any).policies || {}
        setBaseZip(pol.base_zip || '')
        setRadius(pol.service_radius_miles || 25)
        setMinLead(pol.min_lead_minutes || 0)
        setDestinationFeePerMile(pol.destination_fee_per_mile_cents ?? 230)
        setMaxTravelDistance(pol.max_travel_distance_miles ?? null)
        const stairs = pol.stairs || { included: true, per_flight_cents: 0 }
        setStairsIncluded(Boolean(stairs.included))
        setStairsPerFlight(stairs.per_flight_cents ?? 0)
        setTiers(((cfg as any).tiers || []) as any)
        setHeavyTiers(((cfg as any).heavy_item_tiers || []) as any)
        const pack = (cfg as any).packing || {}
        setPackingEnabled(Boolean(pack.enabled))
        setPackingPerRoom(pack.per_room_cents ?? 0)
        setMaterialsIncluded(Boolean(pack.materials_included))
        const mats = (pack.materials || []) as any
        setMaterials((mats && mats.length > 0) ? mats : [])
      } else {
        // Fallback to legacy tables
        setBaseZip(prov.base_zip || '')
        setRadius(prov.service_radius_miles || 25)
        setMinLead(prov.min_lead_minutes || 0)
        setDestinationFeePerMile(230) // Default
        setMaxTravelDistance(null) // Default no limit
        const { data: t } = await supabase.from('movers_pricing_tiers').select('*').eq('provider_id', prov.id).order('crew_size')
        setTiers((t || []).map((x: any) => ({ ...x })))
        const { data: hi } = await supabase.from('movers_heavy_item_tiers').select('*').eq('provider_id', prov.id).order('min_weight_lbs')
        setHeavyTiers((hi || []).map((x: any) => ({ ...x })))
        const { data: packPol } = await supabase.from('movers_packing_policies').select('*').eq('provider_id', prov.id).maybeSingle()
        setPackingEnabled(Boolean(packPol?.packing_enabled))
        setPackingPerRoom(packPol?.per_room_cents ?? 0)
        setMaterialsIncluded(Boolean(packPol?.materials_included))
        const { data: mats } = await supabase.from('movers_packing_materials').select('*').eq('provider_id', prov.id).order('name')
        setMaterials((mats && mats.length > 0) ? (mats || []).map((x: any) => ({ ...x })) : [])
        const { data: stairs } = await supabase.from('movers_stairs_policies').select('*').eq('provider_id', prov.id).maybeSingle()
        setStairsIncluded(Boolean(stairs?.included))
        setStairsPerFlight(stairs?.per_flight_cents ?? 0)
      }
      setDirty(false)
    } finally {
      loadingRef.current = false
    }
  }

  useEffect(() => {
    loadProviderAndTiers()
  }, [])

  const addTier = () => {
    setTiers(prev => [
      ...prev,
      { crew_size: (prev.at(-1)?.crew_size || 1) + 1, min_hours: 2, base_rate_cents: 0, hourly_rate_cents: 15000, per_mile_cents: 300 }
    ])
    setDirty(true)
  }

  const saveAll = async () => {
    if (!providerId) return
    setSaving(true)
    const { error: provErr, data: provUpdate } = await supabase
      .from('movers_providers')
      .update({ base_zip: baseZip, service_radius_miles: radius, min_lead_minutes: minLead })
      .eq('id', providerId)
      .select('id')
    if (provErr) {
      setSaving(false)
      alert(`Failed to save policies: ${provErr.message}`)
      return
    }
    // consolidated upsert only
    const payload = {
      policies: {
        base_zip: baseZip,
        service_radius_miles: radius,
        min_lead_minutes: minLead,
        destination_fee_per_mile_cents: destinationFeePerMile,
        max_travel_distance_miles: maxTravelDistance,
        stairs: { included: stairsIncluded, per_flight_cents: stairsPerFlight }
      },
      tiers: tiers.map(t => ({ crew_size: t.crew_size, min_hours: t.min_hours, base_rate_cents: t.base_rate_cents, hourly_rate_cents: t.hourly_rate_cents, per_mile_cents: t.per_mile_cents })),
      heavy_item_tiers: heavyTiers.map(t => ({ min_weight_lbs: t.min_weight_lbs, max_weight_lbs: t.max_weight_lbs, price_cents: t.price_cents })),
      packing: { enabled: packingEnabled, per_room_cents: packingPerRoom, materials_included: materialsIncluded, materials: materials.map(m => ({ name: m.name, price_cents: m.price_cents, included: m.included })) }
    }
    const { error: cfgErr } = await supabase.from('movers_provider_config').upsert({ provider_id: providerId, ...payload, updated_at: new Date().toISOString() })
    if (cfgErr) { setSaving(false); alert(`Failed to save config: ${cfgErr.message}`); return }
    // Keep current state (optimistic). A full reload will rehydrate from DB.
    setSaving(false)
    setDirty(false)
    setLastSavedAt(new Date().toLocaleTimeString())
  }

  // Mark dirty when key fields change (manual save only)
  useEffect(() => {
    if (!providerId) return
    if (!dirty) return
    // Manual save mode: no autosave
  }, [baseZip, radius, minLead, tiers, providerId, dirty])

  // Realtime: refetch if updated elsewhere
  useEffect(() => {
    if (!providerId) return
    const channel = supabase.channel('movers-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movers_pricing_tiers', filter: `provider_id=eq.${providerId}` }, () => {
        // refetch tiers
        supabase.from('movers_pricing_tiers').select('*').eq('provider_id', providerId).order('crew_size').then(({ data }) => setTiers((data || []).map(x => ({ ...x }))))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [providerId, supabase])

  const previewRows = useMemo(() => {
    const sizes = Array.from({ length: 7 }, (_, i) => i + 2) // 2..8
    return sizes.map(size => {
      const tier = tiers.find(t => t.crew_size === size) || tiers.reduce((best, t) => (Math.abs(t.crew_size - size) < Math.abs((best?.crew_size ?? 99) - size) ? t : best), tiers[0])
      if (!tier) return { size, text: '—' }
      const base = (tier.base_rate_cents || 0) / 100
      const hourly = (tier.hourly_rate_cents || 0) / 100
      return { size, text: `min ${tier.min_hours}h • $${hourly.toFixed(2)}/hr • base $${base.toFixed(2)}` }
    })
  }, [tiers])

  if (!providerIdFromQuery && !businessIdFromQuery) return <div className="p-6">Open settings with a provider or business context. Example: /dashboard/movers/settings?providerId=PROVIDER_ID</div>
  if (!providerId) return <div className="p-6">Preparing your Movers provider configuration…</div>

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Movers Settings</h1>
      <div className="rounded border p-4 bg-white">
        <div className="text-xs text-gray-500 mb-1">Provider ID</div>
        <code className="block font-mono text-sm px-2 py-1 bg-gray-50 border rounded select-all break-all text-gray-900">
          {providerId}
        </code>
        <div className="text-xs text-gray-500 mt-1">Use this ID in booking links and support requests.</div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Policies & Service Area</h2>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-xs text-orange-600">Unsaved changes…</span>
            )}
            {!dirty && lastSavedAt && (
              <span className="text-xs text-gray-500">Saved {lastSavedAt}</span>
            )}
            <button
              className="px-3 py-1 border rounded"
              onClick={saveAll}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Base ZIP</label>
            <input className="border p-3 rounded w-full" value={baseZip} onChange={e=>{setBaseZip(e.target.value); setDirty(true)}} />
            <p className="text-xs text-gray-500 mt-1">Used to estimate travel and destination ranges.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service radius (miles)</label>
            <input className="border p-3 rounded w-full" type="number" value={radius} onChange={e=>{setRadius(parseInt(e.target.value||'0')); setDirty(true)}} />
            <p className="text-xs text-gray-500 mt-1">Standard service area (no destination fee).</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min lead time (minutes)</label>
            <input className="border p-3 rounded w-full" type="number" value={minLead} onChange={e=>{setMinLead(parseInt(e.target.value||'0')); setDirty(true)}} />
            <p className="text-xs text-gray-500 mt-1">Earliest you accept bookings.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Destination fee per mile (cents)</label>
            <input className="border p-3 rounded w-full" type="number" value={destinationFeePerMile} onChange={e=>{setDestinationFeePerMile(parseInt(e.target.value||'230')); setDirty(true)}} />
            <p className="text-xs text-gray-500 mt-1">Charged per mile beyond service radius (e.g., 230 = $2.30/mile).</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max travel distance (miles)</label>
            <input className="border p-3 rounded w-full" type="number" value={maxTravelDistance || ''} onChange={e=>{setMaxTravelDistance(e.target.value ? parseInt(e.target.value) : null); setDirty(true)}} placeholder="No limit" />
            <p className="text-xs text-gray-500 mt-1">Maximum distance you'll travel. Leave empty for no limit.</p>
          </div>
        </div>
        {!saving && lastSavedAt && <p className="text-xs text-gray-500">Last saved {lastSavedAt}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Labor & Travel Pricing</h2>
          <button className="px-3 py-1 border rounded" onClick={addTier}>+ Add Tier</button>
        </div>

        <p className="text-sm text-gray-600">Add a tier per crew size. Each box is one clear pricing tier your instant quote will use.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
          {tiers.map((t, idx) => {
            const baseUsd = (t.base_rate_cents || 0) / 100
            const hourlyUsd = (t.hourly_rate_cents || 0) / 100
            const preview = `min ${t.min_hours || 0}h @ $${hourlyUsd.toFixed(2)} → base $${baseUsd.toFixed(2)}`
            return (
              <div key={idx} className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Crew size</label>
                    <input type="number" className="border p-2 rounded w-full" value={t.crew_size} onChange={e=>{setTiers(v=>v.map((x,i)=>i===idx?{...x, crew_size: parseInt(e.target.value)}:x)); setDirty(true)}} />
                    <p className="text-xs text-gray-500 mt-1">e.g. 2, 3, 4 movers</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Minimum hours</label>
                    <input type="number" className="border p-2 rounded w-full" value={t.min_hours} onChange={e=>{setTiers(v=>v.map((x,i)=>i===idx?{...x, min_hours: parseInt(e.target.value)}:x)); setDirty(true)}} />
                    <p className="text-xs text-gray-500 mt-1">Charged at least this many hours</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base one-time ($)</label>
                    <div className="flex items-center">
                      <span className="px-2 text-gray-500">$</span>
                      <input type="number" className="border p-2 rounded w-full" value={(t.base_rate_cents||0)/100} onChange={e=>{setTiers(v=>v.map((x,i)=>i===idx?{...x, base_rate_cents: Math.round(parseFloat(e.target.value||'0')*100)}:x)); setDirty(true)}} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hourly after min ($/hr)</label>
                    <div className="flex items-center">
                      <span className="px-2 text-gray-500">$</span>
                      <input type="number" className="border p-2 rounded w-full" value={(t.hourly_rate_cents||0)/100} onChange={e=>{setTiers(v=>v.map((x,i)=>i===idx?{...x, hourly_rate_cents: Math.round(parseFloat(e.target.value||'0')*100)}:x)); setDirty(true)}} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Travel beyond area ($/mi)</label>
                    <div className="flex items-center">
                      <span className="px-2 text-gray-500">$</span>
                      <input type="number" className="border p-2 rounded w-full" value={(t.per_mile_cents||0)/100} onChange={e=>{setTiers(v=>v.map((x,i)=>i===idx?{...x, per_mile_cents: Math.round(parseFloat(e.target.value||'0')*100)}:x)); setDirty(true)}} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Optional. Distance fees.</p>
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <div className="text-sm text-gray-700 bg-gray-50 border rounded p-2 w-full">
                      <span className="font-medium mr-1">Preview:</span> {preview}
                    </div>
                  </div>
                  <div className="flex items-end justify-end">
                    <button className="text-red-600" onClick={()=>{setTiers(v=>v.filter((_,i)=>i!==idx)); setDirty(true)}}>Remove tier</button>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
          {/* Sticky live preview */}
          <aside className="lg:col-span-1 top-24 lg:sticky h-fit border rounded p-3 bg-white">
            <h3 className="font-medium mb-2">What customers see</h3>
            <ul className="space-y-1 text-sm">
              {previewRows.map(row => (
                <li key={row.size} className="flex items-center justify-between">
                  <span>{row.size} movers</span>
                  <span className="text-gray-700">{row.text}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <p className="text-xs text-gray-500">Tip: "Base" is a one-time amount. "Hourly" applies after the minimum hours. Travel is used for distance beyond your threshold.</p>
      </section>

      {/* Heavy item charges */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Heavy Item Charges</h2>
          <button className="px-3 py-1 border rounded" onClick={() => { setHeavyTiers(v => [...v, { min_weight_lbs: (v.at(-1)?.max_weight_lbs || 0) + 1, max_weight_lbs: (v.at(-1)?.max_weight_lbs || 0) + 200, price_cents: 0 }]); setDirty(true) }}>+ Add Band</button>
        </div>
        <p className="text-sm text-gray-600">Set a flat charge per weight band. Example bands: 200–400, 400–600, 600–800 lbs.</p>
        <div className="space-y-2">
          {heavyTiers.map((t, idx) => (
            <div key={t.id || idx} className="grid grid-cols-5 gap-3 border rounded p-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Min weight (lbs)</label>
                <input type="number" className="border p-2 rounded w-full" value={t.min_weight_lbs}
                  onChange={e=>{ const val = parseInt(e.target.value||'0'); setHeavyTiers(v=>v.map((x,i)=>i===idx?{...x, min_weight_lbs: val}:x)); setDirty(true) }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max weight (lbs)</label>
                <input type="number" className="border p-2 rounded w-full" value={t.max_weight_lbs}
                  onChange={e=>{ const val = parseInt(e.target.value||'0'); setHeavyTiers(v=>v.map((x,i)=>i===idx?{...x, max_weight_lbs: val}:x)); setDirty(true) }} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Charge ($)</label>
                <div className="flex items-center">
                  <span className="px-2 text-gray-500">$</span>
                  <input type="number" className="border p-2 rounded w-full" value={(t.price_cents||0)/100}
                    onChange={e=>{ const val = Math.round(parseFloat(e.target.value||'0')*100); setHeavyTiers(v=>v.map((x,i)=>i===idx?{...x, price_cents: val}:x)); setDirty(true) }} />
                </div>
              </div>
              <div className="flex justify-end">
                <button className="text-red-600" onClick={()=>{ setHeavyTiers(v=>v.filter((_,i)=>i!==idx)); setDirty(true) }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Packing settings */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Packing Options & Materials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input id="packing-enabled" type="checkbox" checked={packingEnabled} onChange={e=>{ setPackingEnabled(e.target.checked); setDirty(true) }} />
            <label htmlFor="packing-enabled" className="text-sm">Offer packing service</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Per room labor ($)</label>
            <div className="flex items-center">
              <span className="px-2 text-gray-500">$</span>
              <input type="number" className="border p-2 rounded w-full" value={packingPerRoom/100}
                onChange={e=>{ setPackingPerRoom(Math.round(parseFloat(e.target.value||'0')*100)); setDirty(true) }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="materials-included" type="checkbox" checked={materialsIncluded} onChange={e=>{ setMaterialsIncluded(e.target.checked); setDirty(true) }} />
            <label htmlFor="materials-included" className="text-sm">Materials included by default</label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <h3 className="font-medium">Materials Catalog</h3>
          <button className="px-3 py-1 border rounded" onClick={()=>{ setMaterials(v=>[...v, { name: 'Boxes', price_cents: 0, included: false }]); setDirty(true) }}>+ Add Material</button>
        </div>
        <div className="space-y-2">
          {materials.map((m, idx) => (
            <div key={m.id || idx} className="grid grid-cols-5 gap-3 border rounded p-3 items-end">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input className="border p-2 rounded w-full" value={m.name} onChange={e=>{ const val = e.target.value; setMaterials(v=>v.map((x,i)=>i===idx?{...x, name: val}:x)); setDirty(true) }} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Price ($)</label>
                <div className="flex items-center">
                  <span className="px-2 text-gray-500">$</span>
                  <input type="number" className="border p-2 rounded w-full" value={(m.price_cents||0)/100}
                    onChange={e=>{ const val = Math.round(parseFloat(e.target.value||'0')*100); setMaterials(v=>v.map((x,i)=>i===idx?{...x, price_cents: val}:x)); setDirty(true) }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={m.included} onChange={e=>{ const val = e.target.checked; setMaterials(v=>v.map((x,i)=>i===idx?{...x, included: val}:x)); setDirty(true) }} />
                <span className="text-sm">Included</span>
              </div>
              <div className="flex justify-end">
                <button className="text-red-600" onClick={()=>{ setMaterials(v=>v.filter((_,i)=>i!==idx)); setDirty(true) }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stairs policy */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Stairs Policy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex items-center gap-2">
            <input id="stairs-included" type="checkbox" checked={stairsIncluded} onChange={e=>{ setStairsIncluded(e.target.checked); setDirty(true) }} />
            <label htmlFor="stairs-included" className="text-sm">Stairs are included in hourly rate</label>
          </div>
          {!stairsIncluded && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Charge per flight ($)</label>
              <div className="flex items-center">
                <span className="px-2 text-gray-500">$</span>
                <input type="number" className="border p-2 rounded w-full" value={stairsPerFlight/100} onChange={e=>{ setStairsPerFlight(Math.round(parseFloat(e.target.value||'0')*100)); setDirty(true) }} />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-orange-600">Unsaved changes…</span>}
        {!dirty && lastSavedAt && <span className="text-xs text-gray-500">Saved {lastSavedAt}</span>}
        <button onClick={saveAll} disabled={saving} className="px-4 py-2 bg-black text-white rounded">{saving? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  )
}


