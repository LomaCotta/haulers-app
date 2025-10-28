"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Business {
  id: string
  name: string
  description: string
  phone: string
  service_type: string
  verified: boolean
  verification_status?: string
  verification_notes?: string
  rejection_reason?: string
  verified_by?: string
  verified_at?: string
  rating_avg: number
  rating_count: number
  address: string
  city: string
  state: string
  postal_code: string
  service_radius_km: number
  created_at: string
  updated_at: string
  owner: {
    id: string
    full_name: string
  }
  donation_badge?: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  is_active: boolean
}

export default function AdminVerifyPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingBusiness, setEditingBusiness] = useState<Partial<Business>>({})
  const [saving, setSaving] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch businesses and categories in parallel
      const [businessesResult, categoriesResult] = await Promise.all([
        supabase
          .from('businesses')
          .select(`
            *,
            owner:profiles!businesses_owner_id_fkey(id, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ])

      if (businessesResult.error) {
        console.error('Error fetching businesses:', businessesResult.error)
        return
      }

      if (categoriesResult.error) {
        console.error('Error fetching categories:', categoriesResult.error)
        return
      }

      setBusinesses(businessesResult.data || [])
      setCategories(categoriesResult.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBusinessClick = (business: Business) => {
    setSelectedBusiness(business)
    setEditingBusiness(business)
    setShowEditModal(true)
  }

  const handleSaveBusiness = async () => {
    if (!selectedBusiness) return

    try {
      setSaving(true)
      
      // Prepare the update data
      const updateData = {
        name: editingBusiness.name,
        description: editingBusiness.description,
        phone: editingBusiness.phone,
        service_type: editingBusiness.service_type,
        address: editingBusiness.address,
        city: editingBusiness.city,
        state: editingBusiness.state,
        postal_code: editingBusiness.postal_code,
        service_radius_km: editingBusiness.service_radius_km,
        verified: editingBusiness.verified,
        donation_badge: editingBusiness.donation_badge
        // updated_at will be automatically set by database trigger
      }

      console.log('Updating business with data:', updateData)
      console.log('Business ID:', selectedBusiness.id)

      const { data, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', selectedBusiness.id)
        .select()

      console.log('Update result:', { data, error })

      if (error) {
        console.error('Detailed error:', error)
        setSuccessMessage(`Error updating business: ${error.message}. Please check the console for details.`)
        setShowSuccessModal(true)
        return
      }

      // Refresh the businesses list
      await fetchData()
      setShowEditModal(false)
      setSelectedBusiness(null)
      setSuccessMessage('Business updated successfully! ✅')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Unexpected error:', error)
      setSuccessMessage(`Unexpected error: ${error}. Please check the console for details.`)
      setShowSuccessModal(true)
    } finally {
      setSaving(false)
    }
  }

  const handleApproveBusiness = async (businessId: string) => {
    try {
      const { error } = await supabase.rpc('approve_business_verification', {
        business_uuid: businessId,
        admin_notes: adminNotes || null
      })

      if (error) {
        console.error('Error approving business:', error)
        setSuccessMessage(`Error approving business: ${error.message}`)
        setShowSuccessModal(true)
        return
      }

      setSuccessMessage('Business approved successfully! 🎉')
      setShowSuccessModal(true)
      setAdminNotes('')
      await fetchData()
    } catch (error) {
      console.error('Error:', error)
      setSuccessMessage('An unexpected error occurred')
      setShowSuccessModal(true)
    }
  }

  const handleRejectBusiness = async (businessId: string) => {
    if (!rejectionReason.trim()) {
      setSuccessMessage('Please provide a reason for rejection')
      setShowSuccessModal(true)
      return
    }

    try {
      const { error } = await supabase.rpc('reject_business_verification', {
        business_uuid: businessId,
        rejection_reason_text: rejectionReason,
        admin_notes: adminNotes || null
      })

      if (error) {
        console.error('Error rejecting business:', error)
        setSuccessMessage(`Error rejecting business: ${error.message}`)
        setShowSuccessModal(true)
        return
      }

      setSuccessMessage('Business rejected successfully! The owner will receive feedback. 📝')
      setRejectionReason('')
      setAdminNotes('')
      setShowRejectModal(false)
      setShowSuccessModal(true)
      await fetchData()
    } catch (error) {
      console.error('Error:', error)
      setSuccessMessage('An unexpected error occurred')
      setShowSuccessModal(true)
    }
  }

  const openRejectModal = (business: Business) => {
    setSelectedBusiness(business)
    setRejectionReason('')
    setAdminNotes('')
    setShowRejectModal(true)
  }

  const handleDonationBadgeToggle = async (businessId: string, donationBadge: boolean) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          donation_badge: !donationBadge
          // updated_at will be automatically set by database trigger
        })
        .eq('id', businessId)

      if (error) {
        console.error('Error updating donation badge:', error)
        return
      }

      await fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getServiceTypeLabel = (serviceType: string) => {
    const category = categories.find(cat => cat.slug === serviceType)
    return category ? category.name : serviceType
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading businesses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Business Verification
          </h1>
          <p className="text-gray-600 mt-2">
            Click on businesses to edit them, verify status, and manage donation badges
          </p>
        </div>

        {/* Business List */}
        <div className="space-y-4">
          {businesses.map((business) => (
            <div 
              key={business.id} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-orange-200"
              onClick={() => handleBusinessClick(business)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
                    {business.donation_badge && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        💚 Donation Partner
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-1">Owner: {business.owner?.full_name}</p>
                  <p className="text-sm text-gray-500 mb-2">{business.city}, {business.state}</p>
                  <p className="text-gray-700 mb-2">{business.description}</p>
                  <div className="text-sm text-gray-500">
                    <span>Phone: {business.phone}</span>
                    <span className="ml-4">Service: {getServiceTypeLabel(business.service_type)}</span>
                    <span className="ml-4">Radius: {business.service_radius_km}km</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {/* Verification Status */}
                  <div className={`px-3 py-1 rounded text-sm font-medium ${
                    business.verification_status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : business.verification_status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {business.verification_status === 'approved' ? '✓ Approved' : 
                     business.verification_status === 'rejected' ? '✗ Rejected' : 
                     '⏳ Pending'}
                  </div>

                  {/* Action Buttons */}
                  {business.verification_status !== 'approved' && (
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApproveBusiness(business.id)
                        }}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openRejectModal(business)
                        }}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Rejection Reason Display */}
                  {business.verification_status === 'rejected' && business.rejection_reason && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      <strong>Rejection Reason:</strong> {business.rejection_reason}
                    </div>
                  )}
                  
                  {/* Donation Badge Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDonationBadgeToggle(business.id, business.donation_badge || false)
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      business.donation_badge
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {business.donation_badge ? '💚 Donation Partner' : 'Add Donation Badge'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {businesses.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-600">No businesses have been registered yet.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Business</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={editingBusiness.name || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingBusiness.description || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingBusiness.phone || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    value={editingBusiness.service_type || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, service_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a service type</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editingBusiness.address || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* City, State, Postal Code */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editingBusiness.city || ''}
                      onChange={(e) => setEditingBusiness(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={editingBusiness.state || ''}
                      onChange={(e) => setEditingBusiness(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={editingBusiness.postal_code || ''}
                      onChange={(e) => setEditingBusiness(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Service Radius */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                  <input
                    type="number"
                    value={editingBusiness.service_radius_km || ''}
                    onChange={(e) => setEditingBusiness(prev => ({ ...prev, service_radius_km: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Verification Status */}
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingBusiness.verified || false}
                      onChange={(e) => setEditingBusiness(prev => ({ ...prev, verified: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Verified Business</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingBusiness.donation_badge || false}
                      onChange={(e) => setEditingBusiness(prev => ({ ...prev, donation_badge: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">💚 Donation Partner</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBusiness}
                  disabled={saving}
                  className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Reject Business Verification</h2>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  Rejecting verification for: <strong>{selectedBusiness.name}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  The business owner will receive this feedback and can resubmit after making changes.
                </p>
              </div>

              <div className="space-y-4">
                {/* Rejection Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejection (e.g., 'Missing business license', 'Incomplete contact information', 'Service area too large')"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes for other admins (not visible to business owner)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectBusiness(selectedBusiness.id)}
                  disabled={!rejectionReason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  successMessage.includes('Error') 
                    ? 'bg-red-100' 
                    : 'bg-green-100'
                }`}>
                  {successMessage.includes('Error') ? (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <h3 className={`text-lg font-semibold mb-2 ${
                  successMessage.includes('Error') ? 'text-red-900' : 'text-green-900'
                }`}>
                  {successMessage.includes('Error') ? 'Error' : 'Success!'}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {successMessage}
                </p>
                
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={`w-full px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    successMessage.includes('Error') 
                      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' 
                      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {successMessage.includes('Error') ? 'Try Again' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}