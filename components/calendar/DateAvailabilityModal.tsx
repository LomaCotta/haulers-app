'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, Lock, Unlock, Plus, Save, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface DateAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  providerId: string | null
  businessId: string | null
  availabilityRules: Array<{
    weekday: number
    morning_jobs: number
    afternoon_jobs: number
    morning_start: string
    afternoon_start: string
    afternoon_end: string
  }>
  selectedSlot?: 'morning' | 'afternoon' | null
}

interface AvailabilitySlot {
  date: string
  timeSlot: 'morning' | 'afternoon'
  available: boolean
  maxJobs: number
  currentBookings: number
}

interface Override {
  id?: string
  date: string
  kind: 'block' | 'extra'
  time_slot?: 'morning' | 'afternoon' | 'full_day' | null
  start_time?: string | null
  end_time?: string | null
  max_concurrent_jobs?: number | null
  note?: string | null
}

export function DateAvailabilityModal({
  isOpen,
  onClose,
  date,
  providerId,
  businessId,
  availabilityRules,
  selectedSlot = null,
}: DateAvailabilityModalProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [override, setOverride] = useState<Override | null>(null)
  const [allOverrides, setAllOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showExtraWindow, setShowExtraWindow] = useState(false)
  const [extraWindowData, setExtraWindowData] = useState({
    startTime: '',
    endTime: '',
    maxJobs: '',
    note: '',
  })

  const dateStr = date ? date.toISOString().split('T')[0] : ''
  const weekday = date ? date.getDay() : 0
  const rule = availabilityRules.find(r => r.weekday === weekday)

  useEffect(() => {
    if (isOpen && dateStr && (providerId || businessId)) {
      fetchAvailability()
    }
  }, [isOpen, dateStr, providerId, businessId])

  const fetchAvailability = async () => {
    if (!dateStr || (!providerId && !businessId)) return

    setLoading(true)
    try {
      // Fetch availability slots
      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)
      params.set('startDate', dateStr)
      params.set('endDate', dateStr)

      const slotsRes = await fetch(`/api/movers/availability/slots?${params}`)
      const slotsData = await slotsRes.json()
      if (slotsData.slots) {
        setSlots(slotsData.slots)
      }

      // Fetch override
      const overrideParams = new URLSearchParams()
      if (providerId) overrideParams.set('providerId', providerId)
      if (businessId) overrideParams.set('businessId', businessId)
      overrideParams.set('date', dateStr)

      const overrideRes = await fetch(`/api/movers/availability/overrides?${overrideParams}`)
      const overrideData = await overrideRes.json()
      
      // Check for full-day block or slot-specific blocks
      // Ignore 'extra' kind overrides - they're not displayed anymore
      if (overrideData.allOverrides && overrideData.allOverrides.length > 0) {
        // Filter out 'extra' kind overrides
        const blockOverrides = overrideData.allOverrides.filter((o: any) => o.kind === 'block')
        setAllOverrides(blockOverrides)
        const fullDayBlock = blockOverrides.find((o: any) => o.time_slot === 'full_day' || o.time_slot === null)
        
        if (fullDayBlock) {
          setOverride(fullDayBlock)
        } else {
          setOverride(null)
        }
        setShowExtraWindow(false)
      } else {
        setAllOverrides([])
        setOverride(null)
        setShowExtraWindow(false)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlockDate = async () => {
    if (!dateStr || (!providerId && !businessId)) return

    setSaving(true)
    try {
      const res = await fetch('/api/movers/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          businessId,
          date: dateStr,
          kind: 'block',
          timeSlot: 'full_day',
        }),
      })

      const data = await res.json()
      if (data.success) {
        await fetchAvailability()
        // Refresh parent component's availability slots
        window.dispatchEvent(new CustomEvent('availabilityUpdated'))
      } else {
        alert('Error blocking date: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error blocking date:', error)
      alert('Error blocking date')
    } finally {
      setSaving(false)
    }
  }

  const handleBlockSlot = async (timeSlot: 'morning' | 'afternoon') => {
    if (!dateStr || (!providerId && !businessId)) return

    setSaving(true)
    try {
      console.log(`[Modal] Blocking ${timeSlot} slot for date ${dateStr}`)
      const res = await fetch('/api/movers/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          businessId,
          date: dateStr,
          kind: 'block',
          timeSlot: timeSlot, // Explicitly pass the timeSlot
        }),
      })

      const data = await res.json()
      console.log(`[Modal] Block response:`, data)
      if (data.success) {
        await fetchAvailability()
        window.dispatchEvent(new CustomEvent('availabilityUpdated'))
      } else {
        alert(`Error blocking ${timeSlot} slot: ` + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error(`Error blocking ${timeSlot} slot:`, error)
      alert(`Error blocking ${timeSlot} slot`)
    } finally {
      setSaving(false)
    }
  }

  const handleUnblockSlot = async (timeSlot: 'morning' | 'afternoon') => {
    if (!dateStr || (!providerId && !businessId)) return

    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)
      params.set('date', dateStr)
      params.set('timeSlot', timeSlot)

      const res = await fetch(`/api/movers/availability/overrides?${params}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        await fetchAvailability()
        window.dispatchEvent(new CustomEvent('availabilityUpdated'))
      } else {
        alert(`Error unblocking ${timeSlot} slot: ` + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error(`Error unblocking ${timeSlot} slot:`, error)
      alert(`Error unblocking ${timeSlot} slot`)
    } finally {
      setSaving(false)
    }
  }

  const handleUnblockDate = async () => {
    if (!dateStr || (!providerId && !businessId)) return

    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (providerId) params.set('providerId', providerId)
      if (businessId) params.set('businessId', businessId)
      params.set('date', dateStr)

      const res = await fetch(`/api/movers/availability/overrides?${params}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        await fetchAvailability()
        // Refresh parent component's availability slots
        window.dispatchEvent(new CustomEvent('availabilityUpdated'))
      } else {
        alert('Error unblocking date: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error unblocking date:', error)
      alert('Error unblocking date')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExtraWindow = async () => {
    if (!dateStr || (!providerId && !businessId)) return

    setSaving(true)
    try {
      const res = await fetch('/api/movers/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          businessId,
          date: dateStr,
          kind: 'extra',
          startTime: extraWindowData.startTime || null,
          endTime: extraWindowData.endTime || null,
          maxConcurrentJobs: extraWindowData.maxJobs ? parseInt(extraWindowData.maxJobs) : null,
          note: extraWindowData.note || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        await fetchAvailability()
        setShowExtraWindow(false)
        // Refresh parent component's availability slots
        window.dispatchEvent(new CustomEvent('availabilityUpdated'))
      } else {
        alert('Error saving extra window: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving extra window:', error)
      alert('Error saving extra window')
    } finally {
      setSaving(false)
    }
  }

  const morningSlot = slots.find(s => s.date === dateStr && s.timeSlot === 'morning')
  const afternoonSlot = slots.find(s => s.date === dateStr && s.timeSlot === 'afternoon')
  const isBlocked = override?.kind === 'block' && (override?.time_slot === 'full_day' || override?.time_slot === null)
  const morningBlocked = allOverrides.some(o => o.kind === 'block' && o.time_slot === 'morning') || isBlocked
  const afternoonBlocked = allOverrides.some(o => o.kind === 'block' && o.time_slot === 'afternoon') || isBlocked

  if (!isOpen || !date) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 bg-white">
        <CardHeader className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Availability</CardTitle>
                <p className="text-sm text-gray-600 mt-0.5">
                  {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="rounded-full hover:bg-gray-100 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-gray-600">Loading availability...</p>
            </div>
          ) : (
            <>
              {/* Blocked Status */}
              {isBlocked && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                      <Lock className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">Date Blocked</h3>
                      <p className="text-sm text-red-700">This date is currently blocked and unavailable for bookings.</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUnblockDate}
                    disabled={saving}
                    variant="outline"
                    className="w-full bg-white border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-medium"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    {saving ? 'Unblocking...' : 'Unblock Date'}
                  </Button>
                </div>
              )}

              {/* Availability Slots */}
              {!isBlocked && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Morning Slot */}
                    <Card className={`border rounded-lg bg-white ${
                      selectedSlot === 'morning' 
                        ? 'border-orange-500 ring-2 ring-orange-200' 
                        : morningBlocked
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}>
                      <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
                          <Clock className="w-4 h-4 text-gray-600" />
                          Morning Slot
                          {morningBlocked && (
                            <Badge className="ml-auto bg-red-100 text-red-800">
                              <Lock className="w-3 h-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                            {rule && !morningBlocked && (
                              <span className="text-xs font-normal text-gray-500 ml-auto">
                                {rule.morning_start} - {rule.afternoon_start || rule.afternoon_end}
                              </span>
                            )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1.5">Current Bookings</div>
                            <Badge 
                              variant={morningSlot?.available ? 'default' : 'destructive'}
                              className="text-sm font-semibold"
                            >
                              {morningSlot?.currentBookings || 0} / {morningSlot?.maxJobs || rule?.morning_jobs || 0}
                            </Badge>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1.5">Available</div>
                            <span className="text-lg font-bold text-gray-900">
                              {morningBlocked ? 0 : (morningSlot?.maxJobs || rule?.morning_jobs || 0) - (morningSlot?.currentBookings || 0)}
                            </span>
                          </div>
                        </div>
                        {morningBlocked ? (
                          <Button
                            onClick={() => handleUnblockSlot('morning')}
                            disabled={saving}
                            variant="outline"
                            size="sm"
                            className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 font-medium"
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            {saving ? 'Unblocking...' : 'Unblock Morning Slot'}
                          </Button>
                        ) : (
                          <>
                            {morningSlot && morningSlot.currentBookings >= morningSlot.maxJobs && morningSlot.maxJobs > 0 && (
                              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                <AlertCircle className="w-4 h-4" />
                                <span>Fully booked</span>
                              </div>
                            )}
                            {morningSlot && morningSlot.maxJobs > 0 && (
                              <Button
                                onClick={() => handleBlockSlot('morning')}
                                disabled={saving}
                                variant="outline"
                                size="sm"
                                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium"
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Block Morning Slot
                              </Button>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Afternoon Slot */}
                    <Card className={`border rounded-lg bg-white ${
                      selectedSlot === 'afternoon' 
                        ? 'border-orange-500 ring-2 ring-orange-200' 
                        : afternoonBlocked
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}>
                      <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
                          <Clock className="w-4 h-4 text-gray-600" />
                          Afternoon Slot
                          {afternoonBlocked && (
                            <Badge className="ml-auto bg-red-100 text-red-800">
                              <Lock className="w-3 h-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                            {rule && !afternoonBlocked && (
                              <span className="text-xs font-normal text-gray-500 ml-auto">
                                {rule.afternoon_start || rule.morning_start} - {rule.afternoon_end}
                              </span>
                            )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1.5">Current Bookings</div>
                            <Badge 
                              variant={afternoonSlot?.available ? 'default' : 'destructive'}
                              className="text-sm font-semibold"
                            >
                              {afternoonSlot?.currentBookings || 0} / {afternoonSlot?.maxJobs || rule?.afternoon_jobs || 0}
                            </Badge>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-1.5">Available</div>
                            <span className="text-lg font-bold text-gray-900">
                              {afternoonBlocked ? 0 : (afternoonSlot?.maxJobs || rule?.afternoon_jobs || 0) - (afternoonSlot?.currentBookings || 0)}
                            </span>
                          </div>
                        </div>
                        {afternoonBlocked ? (
                          <Button
                            onClick={() => handleUnblockSlot('afternoon')}
                            disabled={saving}
                            variant="outline"
                            size="sm"
                            className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 font-medium"
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            {saving ? 'Unblocking...' : 'Unblock Afternoon Slot'}
                          </Button>
                        ) : (
                          <>
                            {afternoonSlot && afternoonSlot.currentBookings >= afternoonSlot.maxJobs && afternoonSlot.maxJobs > 0 && (
                              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                <AlertCircle className="w-4 h-4" />
                                <span>Fully booked</span>
                              </div>
                            )}
                            {afternoonSlot && afternoonSlot.maxJobs > 0 && (
                              <Button
                                onClick={() => handleBlockSlot('afternoon')}
                                disabled={saving}
                                variant="outline"
                                size="sm"
                                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium"
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Block Afternoon Slot
                              </Button>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                      {/* Actions */}
                      <div className="space-y-4">
                        {!override && (
                          <Button
                            onClick={handleBlockDate}
                            disabled={saving}
                            variant="outline"
                            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            {saving ? 'Blocking...' : 'Block This Date'}
                          </Button>
                        )}
                      </div>
                </>
              )}

              {/* Default Rule Info */}
              {!isBlocked && rule && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">Weekly Availability Rule</div>
                      <div className="text-xs text-gray-600">
                        Default schedule: <span className="font-semibold">{rule.morning_jobs}</span> morning jobs, <span className="font-semibold">{rule.afternoon_jobs}</span> afternoon jobs
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

