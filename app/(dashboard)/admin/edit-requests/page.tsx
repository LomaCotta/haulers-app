'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  Calendar,
  AlertCircle,
  Eye,
  Check,
  X
} from 'lucide-react'

interface EditRequest {
  id: string
  business_id: string
  requester_id: string
  status: 'pending' | 'approved' | 'rejected'
  proposed_changes: any
  reviewed_by?: string
  reviewed_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  business: {
    id: string
    name: string
  }
  requester: {
    id: string
    full_name: string
  }
  reviewer?: {
    id: string
    full_name: string
  }
}

export default function AdminEditRequestsPage() {
  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null)
  const [currentBusinessData, setCurrentBusinessData] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{show: boolean, type: 'success' | 'error', message: string}>({
    show: false,
    type: 'success',
    message: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchEditRequests()
  }, [])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message })
    setTimeout(() => {
      setToast({ show: false, type: 'success', message: '' })
    }, 4000)
  }

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const fetchCurrentBusinessData = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      if (error) {
        console.error('Error fetching current business data:', error)
        return
      }

      setCurrentBusinessData(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchEditRequests = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('business_edit_requests')
        .select(`
          *,
          business:businesses(id, name),
          requester:profiles!requester_id(id, full_name),
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching edit requests:', error)
        // If table doesn't exist, show empty state
        if (error.code === '42P01') {
          console.log('business_edit_requests table does not exist yet. Please run the SQL script.')
          setEditRequests([])
          return
        }
        alert('Error fetching edit requests: ' + error.message)
        return
      }

      setEditRequests(data || [])
    } catch (error) {
      console.error('Error:', error)
      alert('An unexpected error occurred while fetching edit requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(true)
      
      // Validate that we have current business data
      if (!currentBusinessData) {
        alert('Please wait for business data to load before approving.')
        return
      }
      
      const { data, error } = await supabase.rpc('apply_business_edit_request', {
        edit_request_id: requestId
      })

      if (error) {
        console.error('Error approving request:', error)
        console.error('Detailed error:', error)
        showToast('error', `Failed to approve request: ${error.message}`)
        return
      }

      // Check if the function returned an error
      if (data && data.startsWith('ERROR:')) {
        console.error('Function returned error:', data)
        showToast('error', `Failed to approve request: ${data}`)
        return
      }

      if (data && data.startsWith('SUCCESS:')) {
        console.log('Function returned success:', data)
      }

      await fetchEditRequests()
      setShowModal(false)
      setSelectedRequest(null)
      setCurrentBusinessData(null)
      setAdminNotes('')
      showToast('success', '✅ Edit request approved successfully!')
    } catch (error) {
      console.error('Error:', error)
      showToast('error', 'An unexpected error occurred: ' + (error as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setProcessing(true)
      
      const { data, error } = await supabase.rpc('reject_business_edit_request', {
        edit_request_id: requestId,
        admin_notes: adminNotes || null
      })

      if (error) {
        console.error('Error rejecting request:', error)
        console.error('Detailed error:', error)
        showToast('error', `Failed to reject request: ${error.message}`)
        return
      }

      // Check if the function returned an error
      if (data && data.startsWith('ERROR:')) {
        console.error('Function returned error:', data)
        showToast('error', `Failed to reject request: ${data}`)
        return
      }

      if (data && data.startsWith('SUCCESS:')) {
        console.log('Function returned success:', data)
      }

      await fetchEditRequests()
      setShowModal(false)
      setSelectedRequest(null)
      setCurrentBusinessData(null)
      setAdminNotes('')
      showToast('success', '❌ Edit request rejected.')
    } catch (error) {
      console.error('Error:', error)
      showToast('error', 'An unexpected error occurred: ' + (error as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderChangeValue = (key: string, value: any) => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
          ))}
        </div>
      )
    }
    
    if (typeof value === 'object' && value !== null) {
      return <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
    }
    
    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>
    }
    
    return <span className="text-sm">{String(value)}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading edit requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Edit Requests</h1>
        <p className="text-gray-600">Review and approve business profile changes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {editRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {editRequests.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {editRequests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Requests List */}
      <div className="space-y-4">
        {editRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{request.business.name}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {request.requester.full_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(request.created_at)}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>Changes:</strong> {Object.keys(request.proposed_changes).length} fields modified</p>
                    {request.admin_notes && (
                      <p><strong>Admin Notes:</strong> {request.admin_notes}</p>
                    )}
                    {request.reviewer && (
                      <p><strong>Reviewed by:</strong> {request.reviewer.full_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSelectedRequest(request)
                      await fetchCurrentBusinessData(request.business_id)
                      setShowModal(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                  
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setSelectedRequest(request)
                          await fetchCurrentBusinessData(request.business_id)
                          setShowModal(true)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {editRequests.length === 0 && !loading && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No edit requests</h3>
          <p className="text-gray-500 mb-4">
            No business edit requests have been submitted yet.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> If you're seeing this and expect requests to exist, 
              make sure the <code>business_edit_requests</code> table has been created 
              by running the SQL script.
            </p>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Review Edit Request - {selectedRequest.business.name}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Request Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Request Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Requested by:</strong> {selectedRequest.requester.full_name}
                    </div>
                    <div>
                      <strong>Submitted:</strong> {formatDate(selectedRequest.created_at)}
                    </div>
                    <div>
                      <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div>
                      <strong>Fields Changed:</strong> {Object.keys(selectedRequest.proposed_changes).length}
                      {currentBusinessData && (
                        <span className="ml-2 text-sm text-blue-600">
                          ({Object.entries(selectedRequest.proposed_changes).filter(([key, proposedValue]) => {
                            const currentValue = currentBusinessData[key]
                            return JSON.stringify(currentValue) !== JSON.stringify(proposedValue)
                          }).length} actual changes)
                        </span>
                      )}
                    </div>
                    {selectedRequest.reviewer && (
                      <div>
                        <strong>Reviewed by:</strong> {selectedRequest.reviewer.full_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Changes Comparison */}
                <div>
                  <h3 className="font-semibold mb-4">Changes Comparison</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedRequest.proposed_changes).map(([key, proposedValue]) => {
                      const currentValue = currentBusinessData?.[key]
                      const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(proposedValue)
                      
                      return (
                        <div key={key} className={`border rounded-lg p-4 ${hasChanged ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium capitalize text-gray-900">
                              {key.replace(/_/g, ' ')}
                            </h4>
                            {hasChanged && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                CHANGED
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Current Value */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-600">Current Value:</div>
                              <div className={`p-3 rounded border ${hasChanged ? 'bg-red-50 border-red-200' : 'bg-gray-100'}`}>
                                <span className={`text-sm ${hasChanged ? 'text-red-700' : 'text-gray-700'}`}>
                                  {formatFieldValue(currentValue)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Proposed Value */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-600">Proposed Value:</div>
                              <div className={`p-3 rounded border ${hasChanged ? 'bg-green-50 border-green-200' : 'bg-gray-100'}`}>
                                <span className={`text-sm ${hasChanged ? 'text-green-700' : 'text-gray-700'}`}>
                                  {formatFieldValue(proposedValue)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {hasChanged && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                              <div className="text-xs text-blue-700">
                                <strong>Change Summary:</strong> {formatFieldValue(currentValue)} → {formatFieldValue(proposedValue)}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedRequest.status === 'pending' && (
                  <div>
                    <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="admin_notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes for the business owner..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    disabled={processing}
                  >
                    Close
                  </Button>
                  
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processing}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {processing ? 'Rejecting...' : 'Reject Request'}
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {processing ? 'Approving...' : 'Approve Request'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg border backdrop-blur-sm ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toast.type === 'success' ? (
                 <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, type: 'success', message: '' })}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 ${
                toast.type === 'success' ? 'hover:bg-green-100' : 'hover:bg-red-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
