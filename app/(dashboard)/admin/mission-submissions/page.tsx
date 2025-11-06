'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Archive,
  MessageSquare,
  DollarSign,
  CheckSquare,
  Users,
  MapPin,
  Code,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'

interface MissionSubmission {
  id: string
  submission_type: string
  name: string | null
  email: string
  phone: string | null
  organization: string | null
  message: string | null
  additional_data: any
  status: 'pending' | 'reviewed' | 'completed' | 'archived'
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  discord_join: { label: 'Discord Join', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  category_vote: { label: 'Category Vote', icon: CheckSquare, color: 'bg-purple-100 text-purple-700' },
  donation: { label: 'Donation', icon: DollarSign, color: 'bg-green-100 text-green-700' },
  founding_supporter: { label: 'Founding Supporter', icon: Users, color: 'bg-yellow-100 text-yellow-700' },
  city_node_pilot: { label: 'City Node Pilot', icon: MapPin, color: 'bg-indigo-100 text-indigo-700' },
  white_label_demo: { label: 'White-Label Demo', icon: Code, color: 'bg-pink-100 text-pink-700' },
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
}

export default function MissionSubmissionsPage() {
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<MissionSubmission | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [status, setStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('mission_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (submissionId: string, newStatus: string, notes?: string) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      }

      if (notes !== undefined) {
        updateData.admin_notes = notes || null
      }

      const { error } = await supabase
        .from('mission_submissions')
        .update(updateData)
        .eq('id', submissionId)

      if (error) throw error

      await loadSubmissions()
      setNotesDialogOpen(false)
      setSelectedSubmission(null)
    } catch (error) {
      console.error('Error updating submission:', error)
      alert('Failed to update submission')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenNotesDialog = (submission: MissionSubmission) => {
    setSelectedSubmission(submission)
    setAdminNotes(submission.admin_notes || '')
    setStatus(submission.status)
    setNotesDialogOpen(true)
  }

  const handleSaveNotes = () => {
    if (!selectedSubmission) return
    handleUpdateStatus(selectedSubmission.id, status, adminNotes)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mission Submissions</h1>
        <p className="text-gray-600 mt-2">Manage submissions from the Mission page</p>
      </div>

      <div className="grid gap-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No submissions yet</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => {
            const typeInfo = TYPE_LABELS[submission.submission_type] || { label: submission.submission_type, icon: MessageSquare, color: 'bg-gray-100 text-gray-700' }
            const TypeIcon = typeInfo.icon

            return (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={typeInfo.color}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                        <Badge className={STATUS_COLORS[submission.status]}>
                          {submission.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{submission.email}</span>
                        </div>
                        {submission.name && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{submission.name}</span>
                          </div>
                        )}
                        {submission.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{submission.phone}</span>
                          </div>
                        )}
                        {submission.organization && (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span>{submission.organization}</span>
                          </div>
                        )}
                        {submission.message && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.message}</p>
                          </div>
                        )}
                        {submission.additional_data && Object.keys(submission.additional_data).length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs font-medium text-blue-900 mb-1">Additional Info:</p>
                            <pre className="text-xs text-blue-700 whitespace-pre-wrap">
                              {JSON.stringify(submission.additional_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {submission.admin_notes && (
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs font-medium text-orange-900 mb-1">Admin Notes:</p>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{submission.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenNotesDialog(submission)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Submission</DialogTitle>
            <DialogDescription>
              Update status and add admin notes for this submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this submission..."
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

