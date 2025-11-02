'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Plus, 
  Trash2,
  Loader2,
  Clock,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface AvailabilityTemplate {
  id: string
  name: string
  weekday: number
  start_time: string
  end_time: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  max_concurrent: number
  auto_generate_weeks_ahead: number
  is_active: boolean
}

const weekdays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export default function AvailabilitySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([])
  const [businessId, setBusinessId] = useState<string>('')
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [weekday, setWeekday] = useState<number>(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [bufferBefore, setBufferBefore] = useState(15)
  const [bufferAfter, setBufferAfter] = useState(15)
  const [maxConcurrent, setMaxConcurrent] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Get user's business
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)

      if (!businesses || businesses.length === 0) {
        router.push('/dashboard/businesses')
        return
      }

      setBusinessId(businesses[0].id)

      // Load templates
      const response = await fetch(`/api/availability/templates?businessId=${businesses[0].id}`)
      const data = await response.json()

      if (response.ok) {
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!name || !startTime || !endTime || !durationMinutes) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/availability/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name,
          weekday,
          startTime,
          endTime,
          durationMinutes,
          bufferBeforeMinutes: bufferBefore,
          bufferAfterMinutes: bufferAfter,
          maxConcurrent
        })
      })

      const data = await response.json()

      if (response.ok) {
        await loadData()
        setShowAddDialog(false)
        // Reset form
        setName('')
        setWeekday(1)
        setStartTime('09:00')
        setEndTime('17:00')
        setDurationMinutes(60)
      } else {
        alert(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Failed to create template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateSlots = async () => {
    if (!businessId) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/availability/slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          startDate: new Date().toISOString().split('T')[0],
          weeksAhead: 4
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully generated ${data.slots_created} availability slots!`)
      } else {
        alert(data.error || 'Failed to generate slots')
      }
    } catch (error) {
      console.error('Error generating slots:', error)
      alert('Failed to generate slots')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Availability Settings</h1>
            <p className="text-muted-foreground mt-2">
              Set up recurring availability patterns for automatic slot generation
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Availability Template</DialogTitle>
                <DialogDescription>
                  Set up a recurring availability pattern. Slots will be automatically generated based on this template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Weekday 9am-5pm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weekday">Day of Week *</Label>
                    <Select value={weekday.toString()} onValueChange={(v) => setWeekday(parseInt(v))}>
                      <SelectTrigger id="weekday">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekdays.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
                    <Input
                      id="bufferBefore"
                      type="number"
                      min="0"
                      value={bufferBefore}
                      onChange={(e) => setBufferBefore(parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bufferAfter">Buffer After (min)</Label>
                    <Input
                      id="bufferAfter"
                      type="number"
                      min="0"
                      value={bufferAfter}
                      onChange={(e) => setBufferAfter(parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxConcurrent">Max Concurrent</Label>
                    <Input
                      id="maxConcurrent"
                      type="number"
                      min="1"
                      value={maxConcurrent}
                      onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTemplate}
                    disabled={submitting}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Generate Slots */}
        <Card className="border-2 border-orange-200 bg-orange-50/30 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Generate Availability Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Generate availability slots for the next 4 weeks based on your active templates.
            </p>
            <Button
              onClick={handleGenerateSlots}
              disabled={submitting || templates.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Generate Slots Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Active Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-4">No templates created yet</p>
                <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            <Badge variant="outline">
                              {weekdays.find(d => d.value === template.weekday)?.label}
                            </Badge>
                            {!template.is_active && (
                              <Badge variant="outline" className="border-gray-300">Inactive</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{template.start_time} - {template.end_time}</span>
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {template.duration_minutes} min
                            </div>
                            <div>
                              <span className="font-medium">Buffers:</span> {template.buffer_before_minutes}/{template.buffer_after_minutes} min
                            </div>
                            <div>
                              <span className="font-medium">Max:</span> {template.max_concurrent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

