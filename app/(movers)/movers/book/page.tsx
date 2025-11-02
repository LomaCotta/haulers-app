"use client";

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AddressDetails = {
  address: string
  aptSuite: string
  city: string
  state: string
  zip: string
  country: string
}

type MoveDetails = {
  pickupAddresses: AddressDetails[]
  deliveryAddresses: AddressDetails[]
  firstName: string
  lastName: string
  phone: string
  email: string
  moveDate: string
}

// Modern Calendar Component
function ModernCalendar({ selectedDate, onDateSelect, minDate }: { selectedDate?: Date | string; onDateSelect: (date: Date) => void; minDate: Date }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const days = getDaysInMonth(currentMonth)

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
  }

  const isDateDisabled = (date: Date) => {
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    const minDateOnly = new Date(minDate)
    minDateOnly.setHours(0, 0, 0, 0)
    return dateOnly < minDateOnly
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    
    // Parse selectedDate in local timezone to avoid UTC shift issues
    let selectedOnly: Date
    if (selectedDate instanceof Date) {
      selectedOnly = new Date(selectedDate)
      selectedOnly.setHours(0, 0, 0, 0)
    } else if (typeof selectedDate === 'string') {
      // If it's a string like "2025-11-13", parse it as local date
      const [year, month, day] = selectedDate.split('-').map(Number)
      selectedOnly = new Date(year, month - 1, day) // month is 0-indexed
      selectedOnly.setHours(0, 0, 0, 0)
    } else {
      selectedOnly = new Date(selectedDate)
      selectedOnly.setHours(0, 0, 0, 0)
    }
    
    return dateOnly.getTime() === selectedOnly.getTime()
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-lg font-bold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-12" />
            }

            const disabled = isDateDisabled(date)
            const selected = isSelected(date)
            const todayDate = isToday(date)

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => !disabled && onDateSelect(date)}
                disabled={disabled}
                className={`
                  h-12 w-full rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center
                  ${disabled 
                    ? 'text-gray-300 cursor-not-allowed font-normal' 
                    : selected
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105 font-bold'
                      : todayDate
                        ? 'bg-orange-50 text-orange-700 border-2 border-orange-400 font-bold'
                        : 'text-gray-800 hover:bg-gray-100 hover:border-2 hover:border-gray-300 active:scale-95 font-semibold'
                  }
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Contact Info Step Component
function ContactInfoStep({
  details,
  setDetails,
  quote,
  onBack,
  onContinue,
  supabase
}: {
  details: MoveDetails
  setDetails: React.Dispatch<React.SetStateAction<MoveDetails>>
  quote: any
  onBack: () => void
  onContinue: () => void
  supabase: ReturnType<typeof createClient>
}) {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [additionalContacts, setAdditionalContacts] = useState<Array<{ name: string; email: string; phone: string }>>([])
  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    additionalContacts?: Array<{ name?: string; email?: string; phone?: string }>
  }>({})
  const [savingContacts, setSavingContacts] = useState(false)

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          console.error('Error getting user:', userError)
          setLoading(false)
          return
        }

        // Get email from auth user
        setUserEmail(user.email || '')

        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error loading profile:', profileError)
        } else if (profile) {
          // Parse full_name into firstName and lastName
          const nameParts = (profile.full_name || '').trim().split(' ')
          const firstName = nameParts.length > 0 ? nameParts[0] : ''
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

          // Auto-fill form with profile data
          setDetails(d => ({
            ...d,
            firstName: d.firstName || firstName,
            lastName: d.lastName || lastName,
            email: d.email || (user.email || ''),
            phone: d.phone || (profile.phone || ''),
          }))
        } else {
          // If no profile, at least use email
          setDetails(d => ({
            ...d,
            email: d.email || (user.email || ''),
          }))
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [supabase, setDetails])

  const addAdditionalContact = () => {
    setAdditionalContacts([...additionalContacts, { name: '', email: '', phone: '' }])
  }

  const removeAdditionalContact = (index: number) => {
    setAdditionalContacts(additionalContacts.filter((_, i) => i !== index))
  }

  const updateAdditionalContact = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
    const updated = [...additionalContacts]
    updated[index] = { ...updated[index], [field]: value }
    setAdditionalContacts(updated)
    // Clear errors for this field
    if (errors.additionalContacts && errors.additionalContacts[index]) {
      const updatedErrors = [...(errors.additionalContacts || [])]
      updatedErrors[index] = { ...updatedErrors[index], [field]: undefined }
      setErrors({ ...errors, additionalContacts: updatedErrors })
    }
  }

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Validate phone format (basic - allows various formats)
  const isValidPhone = (phone: string): boolean => {
    return /^[\d\s\(\)\-]+$/.test(phone.replace(/\s/g, '')) && phone.replace(/\D/g, '').length >= 10
  }

  // Validate form and show specific error messages
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Validate first name
    if (!details.firstName || details.firstName.trim() === '') {
      newErrors.firstName = 'First name is required'
    }

    // Validate last name
    if (!details.lastName || details.lastName.trim() === '') {
      newErrors.lastName = 'Last name is required'
    }

    // Validate email
    if (!details.email || details.email.trim() === '') {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(details.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Validate phone
    if (!details.phone || details.phone.trim() === '') {
      newErrors.phone = 'Phone number is required'
    } else if (!isValidPhone(details.phone)) {
      newErrors.phone = 'Please enter a valid phone number (at least 10 digits)'
    }

    // Validate additional contacts
    if (additionalContacts.length > 0) {
      const additionalErrors: Array<{ name?: string; email?: string; phone?: string }> = []
      additionalContacts.forEach((contact, index) => {
        const contactErrors: { name?: string; email?: string; phone?: string } = {}
        
        if (contact.name && contact.name.trim() === '') {
          contactErrors.name = 'Name is required if contact is added'
        }
        
        if (contact.email && contact.email.trim() !== '' && !isValidEmail(contact.email)) {
          contactErrors.email = 'Please enter a valid email address'
        }
        
        if (contact.phone && contact.phone.trim() !== '' && !isValidPhone(contact.phone)) {
          contactErrors.phone = 'Please enter a valid phone number'
        }
        
        if (Object.keys(contactErrors).length > 0) {
          additionalErrors[index] = contactErrors
        }
      })
      
      if (additionalErrors.length > 0) {
        newErrors.additionalContacts = additionalErrors
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Save additional contacts to profile
  const saveAdditionalContacts = async () => {
    if (additionalContacts.length === 0) return

    setSavingContacts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Save each contact that has at least a name
      for (const contact of additionalContacts) {
        if (contact.name && contact.name.trim() !== '') {
          await supabase
            .from('profile_contacts')
            .upsert({
              user_id: user.id,
              name: contact.name.trim(),
              email: contact.email?.trim() || null,
              phone: contact.phone?.trim() || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,name', // Prevent duplicates
            })
        }
      }
    } catch (error) {
      console.error('Error saving additional contacts:', error)
      // Don't block the flow if saving fails
    } finally {
      setSavingContacts(false)
    }
  }

  const handleContinue = async () => {
    if (!validateForm()) {
      // Scroll to first error
      setTimeout(() => {
        const firstErrorElement = document.querySelector('.error-message')
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return
    }

    // Save additional contacts to profile
    await saveAdditionalContacts()
    
    // Continue to next step
    onContinue()
  }

  if (loading) {
    return (
      <section className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your contact information...</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3 text-gray-900">Your Contact Info</h1>
        <p className="text-gray-600 text-base">
          We've pre-filled your information from your profile. You can edit it or add additional contacts.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Primary Contact */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Primary Contact</h3>
              <p className="text-sm text-gray-600">Main contact for this booking</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2.5 text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="First name"
                  className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${
                    errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  value={details.firstName}
                  onChange={e => {
                    setDetails(d => ({ ...d, firstName: e.target.value }))
                    if (errors.firstName) {
                      setErrors({ ...errors, firstName: undefined })
                    }
                  }}
                  required
                />
                {errors.firstName && (
                  <p className="mt-1.5 text-sm text-red-600 error-message flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last name"
                  className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${
                    errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  value={details.lastName}
                  onChange={e => {
                    setDetails(d => ({ ...d, lastName: e.target.value }))
                    if (errors.lastName) {
                      setErrors({ ...errors, lastName: undefined })
                    }
                  }}
                  required
                />
                {errors.lastName && (
                  <p className="mt-1.5 text-sm text-red-600 error-message flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2.5 text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="your.email@example.com"
              className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${
                errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              value={details.email}
              onChange={e => {
                setDetails(d => ({ ...d, email: e.target.value }))
                if (errors.email) {
                  setErrors({ ...errors, email: undefined })
                }
              }}
              required
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-600 error-message flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2.5 text-gray-700">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${
                errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              value={details.phone}
              onChange={e => {
                setDetails(d => ({ ...d, phone: e.target.value }))
                if (errors.phone) {
                  setErrors({ ...errors, phone: undefined })
                }
              }}
              required
            />
            {errors.phone && (
              <p className="mt-1.5 text-sm text-red-600 error-message flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Contacts */}
      {additionalContacts.length > 0 && (
        <div className="mt-6 space-y-4">
          {additionalContacts.map((contact, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Additional Contact {index + 1}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdditionalContact(index)}
                  className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                  aria-label="Remove contact"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
                  <input
                    type="text"
                    placeholder="Contact name"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-gray-400 ${
                      errors.additionalContacts?.[index]?.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    value={contact.name}
                    onChange={e => updateAdditionalContact(index, 'name', e.target.value)}
                  />
                  {errors.additionalContacts?.[index]?.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.additionalContacts[index].name}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-gray-400 ${
                        errors.additionalContacts?.[index]?.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                      value={contact.email}
                      onChange={e => updateAdditionalContact(index, 'email', e.target.value)}
                    />
                    {errors.additionalContacts?.[index]?.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                        {errors.additionalContacts[index].email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Phone</label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-gray-400 ${
                        errors.additionalContacts?.[index]?.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                      value={contact.phone}
                      onChange={e => updateAdditionalContact(index, 'phone', e.target.value)}
                    />
                    {errors.additionalContacts?.[index]?.phone && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                        {errors.additionalContacts[index].phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Additional Contact Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={addAdditionalContact}
          className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 text-gray-700 font-medium flex items-center justify-center gap-2 group"
        >
          <svg className="w-5 h-5 text-gray-500 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Additional Contact</span>
        </button>
      </div>

      <div className="mt-8 flex justify-between">
        <button 
          className="px-6 py-3 border rounded-lg hover:bg-gray-50 border-gray-300 text-gray-700 font-medium transition-colors" 
          onClick={onBack}
        >
          ← Back
        </button>
        <button 
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-lg shadow-lg shadow-orange-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2" 
          onClick={handleContinue}
          disabled={savingContacts}
        >
          {savingContacts ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Continue →'
          )}
        </button>
      </div>
    </section>
  )
}

// Reservation Submission Component
function ReservationSubmissionStep({
  details,
  quote,
  providerId,
  businessId,
  timeSlot,
  onBack,
  // CRITICAL: Pass service details from step 3
  heavySelections,
  hasStairs,
  stairFlights,
  needsPacking,
  packingChoice,
  packingRooms
}: {
  details: MoveDetails
  quote: any
  providerId?: string
  businessId?: string
  timeSlot?: string
  onBack: () => void
  heavySelections?: Array<{ key: string; min: number; max: number; price_cents: number; count: number }>
  hasStairs?: boolean
  stairFlights?: number
  needsPacking?: boolean
  packingChoice?: 'kit' | 'paygo' | 'none'
  packingRooms?: number
}) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reservationData, setReservationData] = useState<any>(null)

  const handleSubmit = async () => {
    console.log('[Reservation Submit] Checking required fields:', {
      quote: quote ? { hasQuote: true, hasQuoteId: !!quote.quote?.id, hasQuoteObject: !!quote.quote, structure: Object.keys(quote || {}) } : null,
      moveDate: details.moveDate,
      timeSlot: timeSlot,
      providerId,
      businessId
    })
    
    // Check if we have a quote ID (could be quote.quote.id or quote.id depending on structure)
    // If quote doesn't have an ID yet (wasn't saved due to RLS), that's okay - reservation API will create it
    const quoteId = quote?.quote?.id || quote?.id || null
    
    if (!details.moveDate || !timeSlot) {
      const missingFields = []
      if (!details.moveDate) missingFields.push('move date')
      if (!timeSlot) missingFields.push('time slot')
      
      setError(`Missing required information: ${missingFields.join(', ')}. Please go back and complete the booking.`)
      console.error('[Reservation Submit] Missing fields:', { moveDate: details.moveDate, timeSlot })
      return
    }
    
    // Validate contact info is filled
    if (!details.firstName || !details.lastName || !details.email || !details.phone) {
      setError('Please fill in all contact information (name, email, and phone) before submitting.')
      console.error('[Reservation Submit] Missing contact info:', { 
        firstName: details.firstName, 
        lastName: details.lastName, 
        email: details.email, 
        phone: details.phone 
      })
      return
    }

    setSubmitting(true)
    setError(null)

    // CRITICAL: Extract all service details from quote AND from component state
    // The quote breakdown might not have all fields, so we use both sources
    const quoteBreakdown = quote?.breakdown || quote?.price?.breakdown || {}
    
    // Use state values if available (they're more accurate), otherwise fall back to quote breakdown
    const selectedHeavy = heavySelections?.filter(s => s.count > 0) || []
    const quoteServiceDetails = {
      heavy_items: selectedHeavy.length > 0 
        ? selectedHeavy.map(s => ({ band: `${s.min}-${s.max}`, count: s.count, price_cents: s.price_cents }))
        : (quoteBreakdown.heavy_items || []),
      heavy_items_count: selectedHeavy.length > 0
        ? selectedHeavy.reduce((sum, s) => sum + s.count, 0)
        : (quoteBreakdown.heavy_items_count || 0),
      heavy_item_band: selectedHeavy.length > 1 
        ? 'multi' 
        : (selectedHeavy.length === 1 ? `${selectedHeavy[0].min}-${selectedHeavy[0].max}` : (quoteBreakdown.heavy_item_band || quoteBreakdown.weight_band || 'none')),
      stairs_flights: (hasStairs && stairFlights !== undefined) 
        ? stairFlights 
        : (quoteBreakdown.stairs_flights !== undefined ? quoteBreakdown.stairs_flights : 0),
      packing_help: needsPacking 
        ? (packingChoice === 'kit' ? 'kit' : (packingChoice === 'paygo' ? 'paygo' : 'none'))
        : (quoteBreakdown.packing_help || quoteBreakdown.packing || 'none'),
      packing_rooms: (needsPacking && packingRooms !== undefined) 
        ? packingRooms 
        : (quoteBreakdown.packing_rooms !== undefined ? quoteBreakdown.packing_rooms : 0),
      packing_materials: quoteBreakdown.packing_materials || [],
    }
    
    console.log('[Reservation Submit] Service details from state:', {
      heavySelections: selectedHeavy.length,
      hasStairs,
      stairFlights,
      needsPacking,
      packingChoice,
      packingRooms
    })
    console.log('[Reservation Submit] Sending service details:', JSON.stringify(quoteServiceDetails, null, 2))
    console.log('[Reservation Submit] Quote breakdown:', JSON.stringify(quoteBreakdown, null, 2))

    try {
      const res = await fetch('/api/movers/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          businessId,
          quoteId: quote?.quote?.id || quote?.id,  // Handle different quote structures
          moveDate: details.moveDate,
          timeSlot,
          fullName: `${details.firstName} ${details.lastName}`.trim(),
          email: details.email,
          phone: details.phone,
          pickupAddresses: details.pickupAddresses.map(addr => {
            const parts = [addr.address, addr.aptSuite, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
            return parts.join(', ')
          }),
          deliveryAddresses: details.deliveryAddresses.map(addr => {
            const parts = [addr.address, addr.aptSuite, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
            return parts.join(', ')
          }),
          teamSize: quote.price.mover_team || 2,
          totalPriceCents: Math.round(parseFloat(quote.price.amount) * 100),
          // CRITICAL: Send all service details so they're saved to database
          ...quoteServiceDetails,
          quoteBreakdown: quoteBreakdown, // Send full breakdown
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Include more details in the error
        const errorMsg = data.error || 'Failed to create reservation'
        const errorDetails = data.details ? ` (${data.details})` : ''
        const fullError = new Error(errorMsg + errorDetails)
        ;(fullError as any).details = data
        throw fullError
      }

      // Store reservation data including quote_id for display
      setReservationData(data)
      setSuccess(true)
    } catch (e) {
      console.error('Error submitting reservation:', e)
      // Extract more detailed error message from response if available
      let errorMessage = 'Failed to create reservation. Please try again.'
      if (e instanceof Error) {
        errorMessage = e.message
      }
      // If the error has details, include them
      if (e && typeof e === 'object' && 'details' in e) {
        const errorObj = e as any
        errorMessage = `${errorObj.message || errorMessage}\nDetails: ${JSON.stringify(errorObj.details)}`
      }
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    // Use booking ID as the unified order number - this is the ONE number everyone uses
    const bookingId = reservationData?.booking_id || reservationData?.references?.booking_id
    const quoteId = reservationData?.quote_id || reservationData?.references?.quote_id
    const reservationId = reservationData?.reservation_id || reservationData?.scheduled_job_id // Internal reference only
    
    return (
      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Reservation Confirmed!
            </h1>
            <p className="text-xl text-gray-600 max-w-xl mx-auto leading-relaxed">
              Your move has been scheduled. We'll send you a confirmation email shortly.
            </p>
          </div>
          
          {/* Elegant Details Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl mb-8 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 sm:px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Your Reservation Details</h2>
            </div>
            
            {/* Card Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Unified Order Number - This is the ONE number to use */}
              {bookingId && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b-2 border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Order Number</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">#{bookingId.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500 mt-1">Use this number for all inquiries</p>
                    </div>
                  </div>
                  {quoteId && (
                    <a
                      href={`/quotes/${quoteId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium text-sm transition-colors border border-orange-200 hover:border-orange-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Quote & Receipt
                    </a>
                  )}
                </div>
              )}
              
              {/* Internal References - Hidden by default, only shown if user wants details */}
              {(quoteId || reservationId) && (
                <details className="py-4 border-b border-gray-100">
                  <summary className="text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 mb-2">
                    Technical Details (for support)
                  </summary>
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                    {quoteId && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-gray-600 font-medium">Quote ID:</span>
                        <code className="text-xs font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">{quoteId}</code>
                      </div>
                    )}
                    {reservationId && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-gray-600 font-medium">Reservation ID:</span>
                        <code className="text-xs font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">{reservationId}</code>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {quoteId && (
              <button
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                onClick={() => window.location.href = `/quotes/${quoteId}`}
              >
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Quote & Receipt
              </button>
            )}
            <button
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-base shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/dashboard/bookings'}
            >
              View My Bookings
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Confirm Reservation</h1>
      
      {quote && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Booking Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold text-gray-900">{details.moveDate ? (() => {
                // Parse date string in local timezone to avoid UTC shift when displaying
                const [year, month, day] = details.moveDate.split('-').map(Number)
                const date = new Date(year, month - 1, day)
                return date.toLocaleDateString()
              })() : 'Not set'}</span>
            </div>
            {timeSlot && (
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-semibold text-gray-900 capitalize">{timeSlot}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold text-gray-900">${quote.price.breakdown.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold text-gray-900">{details.firstName} {details.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold text-gray-900">{details.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-semibold text-gray-900">{details.phone}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-2">{error}</p>
              <p className="text-red-700 text-sm mb-3">
                Would you like to go back and select a different date or time?
              </p>
              {/* Show error details in console and optionally in UI for debugging */}
              <details className="text-red-600 text-xs mt-2">
                <summary className="cursor-pointer hover:text-red-800">Technical Details</summary>
                <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setError(null)
                // Navigate back to step 1 to select a new date/time
                window.location.href = window.location.pathname + window.location.search
              }}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              Select Different Time
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button 
          className="px-6 py-3 border rounded-lg hover:bg-gray-50 border-gray-300 text-gray-700 font-medium transition-colors" 
          onClick={onBack}
          disabled={submitting}
        >
          ← Back
        </button>
        <button 
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-lg shadow-lg shadow-orange-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
          onClick={handleSubmit}
          disabled={submitting || !quote || !details.moveDate || !timeSlot}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : (
            'Confirm Reservation →'
          )}
        </button>
      </div>
    </section>
  )
}

function WizardInner() {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState<MoveDetails>({
    pickupAddresses: [{
      address: "",
      aptSuite: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
    }],
    deliveryAddresses: [{
      address: "",
      aptSuite: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
    }],
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
  const [needsPacking, setNeedsPacking] = useState(false)
  const [packingRooms, setPackingRooms] = useState<number>(0)
  const [heavyBand, setHeavyBand] = useState<string>('none')
  const [hasStairs, setHasStairs] = useState(false)
  const [stairFlights, setStairFlights] = useState<number>(0)
  const [heavyItemsCount, setHeavyItemsCount] = useState<number>(1)
  const [packingChoice, setPackingChoice] = useState<'kit' | 'paygo' | 'none'>('none')
  const [heavySelections, setHeavySelections] = useState<Array<{ key: string; min: number; max: number; price_cents: number; count: number }>>([])
  const [providerConfig, setProviderConfig] = useState<{ base_zip?: string | null; service_radius_miles?: number | null; destination_fee_per_mile_cents?: number | null; max_travel_distance_miles?: number | null } | null>(null)
  const [addressErrors, setAddressErrors] = useState<{ pickup?: string; delivery?: string }>({})
  const [validatingAddresses, setValidatingAddresses] = useState(false)
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<{ pickup: any[]; delivery: any[] }>({ pickup: [], delivery: [] })
  const [autocompleteQuery, setAutocompleteQuery] = useState<{ pickup: string; delivery: string; activeField: string | null }>({ pickup: '', delivery: '', activeField: null })
  const [showAutocomplete, setShowAutocomplete] = useState<{ pickup: number | null; delivery: number | null }>({ pickup: null, delivery: null })
  const search = useSearchParams()
  const providerIdParam = search.get('providerId') || undefined
  const businessIdParam = search.get('businessId') || undefined
  const [providerName, setProviderName] = useState<string>("")
  const [businessInfo, setBusinessInfo] = useState<{ id: string; name: string; city?: string | null; state?: string | null; description?: string | null } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      if (businessIdParam) {
        const { data } = await supabase
          .from('businesses')
          .select('id,name,city,state,description')
          .eq('id', businessIdParam)
          .maybeSingle()
        if (data?.name) setProviderName(data.name)
        if (data) setBusinessInfo(data as any)
        return
      }
      if (providerIdParam) {
        // Resolve via provider -> business
        const { data: prov } = await supabase
          .from('movers_providers')
          .select('business_id')
          .eq('id', providerIdParam)
          .maybeSingle()
        if (prov?.business_id) {
          const { data } = await supabase
            .from('businesses')
            .select('id,name,city,state,description')
            .eq('id', prov.business_id)
            .maybeSingle()
          if (data?.name) setProviderName(data.name)
          if (data) setBusinessInfo(data as any)
        }
      }
    })()
  }, [providerIdParam, businessIdParam, supabase])

  const [tiers, setTiers] = useState<Array<{ crew_size: number; hourly_rate_cents: number; min_hours: number }>>([])
  const [packingCfg, setPackingCfg] = useState<{ enabled: boolean; per_room_cents: number; materials_included: boolean; materials: Array<{ name: string; price_cents: number; included: boolean }> } | null>(null)
  const [heavyTiers, setHeavyTiers] = useState<Array<{ min_weight_lbs: number; max_weight_lbs: number; price_cents: number }>>([])
  const [stairsPolicy, setStairsPolicy] = useState<{ included: boolean; per_flight_cents: number }>({ included: true, per_flight_cents: 0 })
  const defaultHeavyBands = [
    { min_weight_lbs: 200, max_weight_lbs: 400, price_cents: 0 },
    { min_weight_lbs: 400, max_weight_lbs: 600, price_cents: 0 },
    { min_weight_lbs: 600, max_weight_lbs: 800, price_cents: 0 },
  ]

  useEffect(() => {
    (async () => {
      if (!providerIdParam && !businessIdParam) return
      const q = providerIdParam ? `providerId=${providerIdParam}` : `businessId=${businessIdParam}`
      try {
        const res = await fetch(`/api/movers/provider-config?${q}`, { cache: 'no-store' })
        if (!res.ok) {
          console.error('[Provider Config API Error]', { 
            status: res.status, 
            statusText: res.statusText, 
            q,
            url: `/api/movers/provider-config?${q}`
          })
          let errorData = {}
          try {
            const text = await res.text()
            if (text) {
              try {
                errorData = JSON.parse(text)
              } catch {
                errorData = { rawError: text }
              }
            }
          } catch (e) {
            console.error('[Provider Config API] Failed to parse error response:', e)
          }
          console.error('[Provider Config API Error Details]', errorData)
          return
        }
        const data = await res.json()
        console.log('[Provider Config API Response]', { success: data.success, hasConfig: !!data.config, tiersCount: data.config?.tiers?.length })
        if (data?.config?.tiers) setTiers(data.config.tiers)
        if (data?.config?.packing) setPackingCfg(data.config.packing)
        if (data?.config?.policies) {
          const policies = data.config.policies as any
          setProviderConfig({
            base_zip: policies.base_zip,
            service_radius_miles: policies.service_radius_miles,
            destination_fee_per_mile_cents: policies.destination_fee_per_mile_cents,
            max_travel_distance_miles: policies.max_travel_distance_miles
          })
          // Debug: Log loaded provider config
          console.log('[Provider Config Loaded]', {
            base_zip: policies.base_zip,
            service_radius_miles: policies.service_radius_miles,
            fullPolicies: policies
          })
        }
        if ((data?.config?.policies as any)?.stairs) {
          const sp = (data.config.policies as any).stairs
          const perRaw = sp?.per_flight_cents ?? 0
          // Convert to cents: if value < 100, assume it's dollars and convert; otherwise assume it's already in cents
          const perCents = perRaw >= 100 ? perRaw : perRaw * 100
          // included should be explicitly set, but if null, infer from per_flight_cents (if > 0, not included)
          const inferredIncluded = (sp?.included != null) ? Boolean(sp.included) : (perCents > 0 ? false : true)
          setStairsPolicy({ included: inferredIncluded, per_flight_cents: perCents })
        } else {
          // If stairs policy not in API response, try to load it from database
          let pid = providerIdParam
          if (!pid && businessIdParam) {
            const { data: prov } = await supabase.from('movers_providers').select('id').eq('business_id', businessIdParam).maybeSingle()
            pid = prov?.id
          }
          if (pid) {
            const { data: cfg } = await supabase.from('movers_provider_config').select('policies').eq('provider_id', pid).maybeSingle()
            if ((cfg as any)?.policies?.stairs) {
              const sp = (cfg as any).policies.stairs
              const perRaw = sp?.per_flight_cents ?? 0
              const perCents = perRaw >= 100 ? perRaw : perRaw * 100
              const inferredIncluded = (sp?.included != null) ? Boolean(sp.included) : (perCents > 0 ? false : true)
              setStairsPolicy({ included: inferredIncluded, per_flight_cents: perCents })
            }
          }
        }
        if (data?.config?.heavy_item_tiers) {
          setHeavyTiers(data.config.heavy_item_tiers)
          // Only initialize if heavySelections is empty to preserve user selections
          setHeavySelections(prev => {
            if (prev.length > 0) {
              // Preserve existing selections, just update tiers that match
              return prev.map(existing => {
                const matchingTier = (data.config.heavy_item_tiers as any[]).find((t:any) => `${t.min_weight_lbs}-${t.max_weight_lbs}` === existing.key)
                return matchingTier ? { ...existing, min: matchingTier.min_weight_lbs, max: matchingTier.max_weight_lbs, price_cents: matchingTier.price_cents } : existing
              })
            }
            // Initialize with counts at 0 only if no previous selections
            return (data.config.heavy_item_tiers as any[]).map((t:any)=>({ key: `${t.min_weight_lbs}-${t.max_weight_lbs}`, min: t.min_weight_lbs, max: t.max_weight_lbs, price_cents: t.price_cents, count: 0 }))
          })
        }
        // If provider has no tiers, initialize UI with sensible bands so users can enter counts (price shows as — each)
        if (!data?.config?.heavy_item_tiers || (data.config.heavy_item_tiers as any[])?.length === 0) {
          setHeavySelections(prev => {
            if (prev.length > 0) return prev // Preserve existing selections
            return defaultHeavyBands.map(b=>({ key: `${b.min_weight_lbs}-${b.max_weight_lbs}`, min: b.min_weight_lbs, max: b.max_weight_lbs, price_cents: b.price_cents, count: 0 }))
          })
        }

        // Second-chance read directly from consolidated table if API returned empty (guards mismatched contexts)
        const needHeavy = !data?.config?.heavy_item_tiers || data.config.heavy_item_tiers.length === 0
        const needPack = !data?.config?.packing
        const needStairs = !(data?.config?.policies as any)?.stairs
        if ((needHeavy || needPack || needStairs)) {
          let pid = providerIdParam
          if (!pid && businessIdParam) {
            const { data: prov } = await supabase.from('movers_providers').select('id').eq('business_id', businessIdParam).maybeSingle()
            pid = prov?.id
          }
          if (pid) {
            const { data: cfg } = await supabase.from('movers_provider_config').select('packing, heavy_item_tiers, tiers, policies').eq('provider_id', pid).maybeSingle()
            if (cfg?.tiers && (!data?.config?.tiers || data.config.tiers.length===0)) setTiers(cfg.tiers as any)
            if (cfg?.packing && needPack) setPackingCfg(cfg.packing as any)
            if (cfg?.heavy_item_tiers && needHeavy) {
              const tiersArr = (cfg.heavy_item_tiers as any[])
              setHeavyTiers(tiersArr as any)
              // Only initialize if heavySelections is empty to preserve user selections
              setHeavySelections(prev => {
                if (prev.length > 0) {
                  // Preserve existing selections, just update tiers that match
                  return prev.map(existing => {
                    const matchingTier = tiersArr.find((t:any) => `${t.min_weight_lbs}-${t.max_weight_lbs}` === existing.key)
                    return matchingTier ? { ...existing, min: matchingTier.min_weight_lbs, max: matchingTier.max_weight_lbs, price_cents: matchingTier.price_cents } : existing
                  })
                }
                // Initialize with counts at 0 only if no previous selections
                return tiersArr.map((t:any)=>({ key: `${t.min_weight_lbs}-${t.max_weight_lbs}`, min: t.min_weight_lbs, max: t.max_weight_lbs, price_cents: t.price_cents, count: 0 }))
              })
            }
            if ((cfg as any)?.policies?.stairs && needStairs) {
              const sp = (cfg as any).policies.stairs
              const perRaw = sp?.per_flight_cents ?? 0
              const perCents = perRaw >= 100 ? perRaw : perRaw * 100
              const inferredIncluded = (sp?.included != null) ? Boolean(sp.included) : (perCents > 0 ? false : true)
              setStairsPolicy({ included: inferredIncluded, per_flight_cents: perCents })
            }

            // Final fallback: read legacy stairs table directly if still zero or missing
            if (needStairs) {
              const { data: stairsRow } = await supabase.from('movers_stairs_policies').select('included, per_flight_cents').eq('provider_id', pid).maybeSingle()
              if (stairsRow) {
                const perRaw = (stairsRow as any).per_flight_cents ?? 0
                const perCents = perRaw >= 100 ? perRaw : perRaw * 100
                const inferredIncluded = ((stairsRow as any).included != null) ? Boolean((stairsRow as any).included) : (perCents > 0 ? false : true)
                setStairsPolicy({ included: inferredIncluded, per_flight_cents: perCents })
              }
            }
          }
        }
      } catch {}
    })()
  }, [providerIdParam, businessIdParam])

  // Keep heavy selections in sync if provider tiers update later
  // But preserve existing counts to avoid resetting user selections
  useEffect(() => {
    if (heavyTiers && heavyTiers.length > 0) {
      setHeavySelections(prevSelections => {
        // Map new tiers, preserving counts from existing selections where keys match
        const newSelections = heavyTiers.map(t => {
          const key = `${t.min_weight_lbs}-${t.max_weight_lbs}`
          const existing = prevSelections.find(s => s.key === key)
          return {
            key,
            min: t.min_weight_lbs,
            max: t.max_weight_lbs,
            price_cents: (t as any).price_cents,
            count: existing?.count || 0 // Preserve existing count or default to 0
          }
        })
        return newSelections
      })
    }
  }, [heavyTiers])

  const hourlyRate = useMemo(() => {
    if (!tiers || tiers.length === 0) return undefined as unknown as number
    const exact = tiers.find(t => t.crew_size === teamSize)
    const tier = exact || tiers.reduce((best, t) => (Math.abs(t.crew_size - teamSize) < Math.abs((best?.crew_size ?? 99) - teamSize) ? t : best), tiers[0])
    return tier ? Math.round((tier.hourly_rate_cents || 0) / 100) : (undefined as unknown as number)
  }, [teamSize, tiers])

  const selectedTier = useMemo(() => {
    if (!tiers || tiers.length === 0) return undefined as unknown as { crew_size: number; hourly_rate_cents: number; min_hours: number }
    const exact = tiers.find(t => t.crew_size === teamSize)
    return exact || tiers.reduce((best, t) => (Math.abs(t.crew_size - teamSize) < Math.abs((best?.crew_size ?? 99) - teamSize) ? t : best), tiers[0])
  }, [teamSize, tiers])

  const heavySubtotalCents = useMemo(() => {
    return (heavySelections || []).reduce((sum, s) => sum + (s.price_cents || 0) * (s.count || 0), 0)
  }, [heavySelections])

  const stairsSubtotalCents = useMemo(() => {
    if (!hasStairs) return 0
    if (stairsPolicy?.included) return 0
    const per = stairsPolicy?.per_flight_cents || 0
    if (per === 0) return 0
    return Math.max(0, per) * Math.max(0, stairFlights || 0)
  }, [hasStairs, stairFlights, stairsPolicy])

  const extrasSubtotalCents = useMemo(() => {
    return (heavySubtotalCents || 0) + (stairsSubtotalCents || 0)
  }, [heavySubtotalCents, stairsSubtotalCents])

  // Helper function to build full address string from structured fields
  const buildAddressString = (addr: AddressDetails): string => {
    const parts = [
      addr.address,
      addr.aptSuite,
      addr.city,
      addr.state,
      addr.zip,
      addr.country
    ].filter(Boolean)
    return parts.join(', ')
  }

  // Autocomplete address search
  const searchAutocomplete = async (query: string, type: 'pickup' | 'delivery', idx: number) => {
    if (!query || query.length < 3) {
      setAutocompleteSuggestions(prev => ({ ...prev, [type]: [] }))
      setShowAutocomplete(prev => ({ ...prev, [type]: null }))
      return
    }

    try {
      const res = await fetch(`/api/movers/autocomplete-address?q=${encodeURIComponent(query)}&limit=5`)
      const data = await res.json()
      if (data.suggestions) {
        setAutocompleteSuggestions(prev => ({ ...prev, [type]: data.suggestions }))
        setShowAutocomplete(prev => ({ ...prev, [type]: idx }))
      }
    } catch (e) {
      console.error('Autocomplete error:', e)
    }
  }

  // Handle autocomplete selection and autofill fields
  const selectAutocomplete = (suggestion: any, type: 'pickup' | 'delivery', idx: number) => {
    const addressParts = suggestion.place_name.split(',')
    const streetAddress = suggestion.address || addressParts[0] || ''
    
    // Extract apt/suite if in address
    let address = streetAddress
    let aptSuite = ''
    const aptMatch = streetAddress.match(/(?:apt|apartment|suite|unit|#)\s*([\w\d-]+)/i)
    if (aptMatch) {
      address = streetAddress.replace(/\s*(?:apt|apartment|suite|unit|#)\s*[\w\d-]+/i, '').trim()
      aptSuite = aptMatch[1]
    }

    const updatedAddress: AddressDetails = {
      address: address.trim(),
      aptSuite: aptSuite.trim(),
      city: suggestion.city || '',
      state: suggestion.state || '',
      zip: suggestion.zip || '',
      country: suggestion.country || 'US'
    }

    setDetails(d => ({
      ...d,
      [`${type}Addresses`]: d[`${type}Addresses`].map((addr, i) => i === idx ? updatedAddress : addr)
    }))

    // Clear autocomplete
    setAutocompleteQuery(prev => ({ ...prev, [type]: '', activeField: null }))
    setAutocompleteSuggestions(prev => ({ ...prev, [type]: [] }))
    setShowAutocomplete(prev => ({ ...prev, [type]: null }))

    // Validate after selection
    setTimeout(() => validateAddress(updatedAddress, type), 100)
  }

  // Validate address against service radius
  const validateAddress = async (address: AddressDetails, type: 'pickup' | 'delivery') => {
    if (!providerConfig?.base_zip || !providerConfig?.service_radius_miles) {
      setAddressErrors(prev => ({ ...prev, [type]: undefined }))
      return true // No validation if no provider config
    }

    const addressStr = buildAddressString(address)
    if (!addressStr || !address.address || !address.city || !address.state || !address.zip) {
      return true // Wait for complete address
    }

    try {
      setValidatingAddresses(true)
      const res = await fetch('/api/movers/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressStr,
          providerBaseZip: providerConfig.base_zip,
          serviceRadiusMiles: providerConfig.service_radius_miles,
          maxTravelDistanceMiles: providerConfig.max_travel_distance_miles
        })
      })
      const result = await res.json()
      
      // Debug: Log what we're comparing against
      if (result.baseZip || result.serviceRadiusMiles) {
        console.log(`[Address Validation ${type}]`, {
          baseZip: result.baseZip || providerConfig?.base_zip,
          serviceRadiusMiles: result.serviceRadiusMiles || providerConfig?.service_radius_miles,
          distanceMiles: result.distanceMiles,
          withinServiceRadius: result.withinServiceRadius
        })
      }
      
      // Check if address exceeds max travel distance (hard error)
      if (!result.valid || result.exceedsMaxTravel) {
        setAddressErrors(prev => ({ ...prev, [type]: result.error || 'Invalid address' }))
        return false
      }
      
      // Address is valid but beyond service radius (warning, will show destination fee)
      if (result.warning && !result.withinServiceRadius) {
        // Clear error but show warning - address is still valid, just outside service radius
        setAddressErrors(prev => ({ ...prev, [type]: undefined }))
        // Could show a warning message here if needed, but allow booking
        return true
      }
      
      // Address is within service radius
      setAddressErrors(prev => ({ ...prev, [type]: undefined }))
      return true
    } catch (e) {
      setAddressErrors(prev => ({ ...prev, [type]: 'Failed to validate address' }))
      return false
    } finally {
      setValidatingAddresses(false)
    }
  }

  async function computeDistance(autoAdvance: boolean = false) {
    // Validate ALL addresses before calculating
    if (providerConfig?.base_zip && providerConfig?.service_radius_miles) {
      // Validate all pickup addresses
      for (let i = 0; i < details.pickupAddresses.length; i++) {
        const pickup = details.pickupAddresses[i]
        const valid = await validateAddress(pickup, 'pickup')
        if (!valid) {
          return false // Don't calculate if any address is invalid
        }
      }
      
      // Validate all delivery addresses
      for (let i = 0; i < details.deliveryAddresses.length; i++) {
        const delivery = details.deliveryAddresses[i]
        const valid = await validateAddress(delivery, 'delivery')
        if (!valid) {
          return false // Don't calculate if any address is invalid
        }
      }
    }
    
    // Find the furthest address from base zip for destination fee calculation
    // Send all addresses and let backend calculate the furthest one
    const allAddresses = [...details.pickupAddresses, ...details.deliveryAddresses]
      .map(addr => buildAddressString(addr))
      .filter(addr => addr && addr.trim() !== '')
    
    // Use first pickup and delivery for trip distance
    const firstPickup = details.pickupAddresses[0]
    const firstDelivery = details.deliveryAddresses[0]
    
    setLoadingDistance(true)
    setDistanceMi(null)
    // Always recalculate - get fresh values for all selections
    const selectedHeavy = heavySelections.filter(s=>s.count>0)
    const payload = {
      pickup_address: buildAddressString(firstPickup),
      dropoff_address: buildAddressString(firstDelivery),
      all_addresses: allAddresses, // Send all addresses for furthest calculation
      move_size: `${teamSize}-bedroom`,
      move_date: details.moveDate ? new Date(details.moveDate).toISOString() : undefined,
      packing_help: needsPacking ? (packingChoice === 'kit' ? 'kit' : 'paygo') : 'none',
      packing_rooms: needsPacking && packingRooms > 0 ? packingRooms : 0,
      heavy_item_band: selectedHeavy.length > 1 ? 'multi' : (selectedHeavy.length === 1 ? `${selectedHeavy[0].min}-${selectedHeavy[0].max}` : heavyBand),
      heavy_items_count: selectedHeavy.length > 0 ? selectedHeavy.reduce((sum, s)=> sum + s.count, 0) : (heavyBand !== 'none' ? Math.max(1, heavyItemsCount) : 0),
      heavy_items: selectedHeavy.length > 0 ? selectedHeavy.map(s=>({ band: `${s.min}-${s.max}`, count: s.count, price_cents: s.price_cents })) : [],
      stairs_flights: hasStairs ? stairFlights : 0,
      storage: 'none',
      ins_coverage: 'basic',
      mover_team: teamSize,
      hourly_rate: hourlyRate,
      full_name: `${details.firstName} ${details.lastName}`.trim(),
      email: details.email,
      phone: details.phone,
    }
    
    // Debug: Log payload to see what's being sent
    console.log('[Quote Payload - Full Recalculation]', {
      packing_help: payload.packing_help,
      packing_rooms: payload.packing_rooms,
      heavy_items: payload.heavy_items,
      stairs_flights: payload.stairs_flights,
      mover_team: payload.mover_team,
      hourly_rate: payload.hourly_rate,
      needsPacking,
      packingChoice,
      packingRooms,
      hasStairs,
      stairFlights,
      selectedHeavy
    })
    
    try {
      const res = await fetch('/api/movers/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, providerId: providerIdParam, businessId: businessIdParam }) })
      const data = await res.json()
      setLoadingDistance(false)
      
      // Debug: Log quote response structure
      console.log('[Quote API Response]', {
        hasQuote: !!data.quote,
        hasPrice: !!data.price,
        quoteStructure: data.quote ? Object.keys(data.quote) : null,
        quoteId: data.quote?.id,
        fullData: data
      })
      
      // Handle validation errors from API
      if (data?.error === 'Address validation failed' && data?.details) {
        const errors: { pickup?: string; delivery?: string } = {}
        data.details.forEach((msg: string) => {
          if (msg.toLowerCase().includes('pickup')) {
            errors.pickup = msg.replace('Pickup address: ', '')
          } else if (msg.toLowerCase().includes('delivery')) {
            errors.delivery = msg.replace('Delivery address: ', '')
          }
        })
        setAddressErrors(errors)
        return false
      }
      
      if (data?.error) {
        console.error('[Quote API Error]', data.error)
        return false
      }
      
      if (data?.trip_distances?.distance != null) {
        setDistanceMi(data.trip_distances.distance) // Keep decimal precision for total route distance
      }
      setQuote(data)
      
      // Auto-advance to step 5 if requested and calculation succeeded
      if (autoAdvance && data?.price) {
        setStep(5)
      }
      
      return true
    } catch (error) {
      console.error('Error calculating quote:', error)
      setLoadingDistance(false)
      return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <ol className="flex items-center text-sm gap-3">
          {[1,2,3,4,5,6,7].map(n => (
            <li
              key={n}
              className={`px-3 py-1 rounded-full border transition-colors ${
                n===step
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'border-orange-200 text-orange-700 hover:bg-orange-50'
              }`}
            >
              Step {n}
            </li>
          ))}
        </ol>
      </div>

      {step === 3 && (
        <section>
          <h1 className="text-3xl font-semibold mb-2">Packing, heavy items, and stairs</h1>
          <p className="text-gray-600 mb-4">Tell us about packing needs, item weights, and access so we can tailor your quote.</p>
          <div className="mb-6 p-4 border rounded bg-orange-50/40">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-800">
              <div><span className="text-gray-600">Selected team:</span> <span className="font-medium">{teamSize} movers</span></div>
              <div className="hidden md:block h-4 w-px bg-orange-200" />
              <div><span className="text-gray-600">Rate:</span> <span className="font-medium">{hourlyRate ? `$${hourlyRate}/hr` : '—'}</span>{selectedTier?.min_hours ? <span className="text-gray-600"> · {selectedTier.min_hours} hr min</span> : null}</div>
              {providerName ? (
                <>
                  <div className="hidden md:block h-4 w-px bg-orange-200" />
                  <div><span className="text-gray-600">Provider:</span> <span className="font-medium">{providerName}</span></div>
                </>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {true && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Choose your packing option</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={()=>{ setNeedsPacking(true); setPackingChoice('kit') }}
                    className={`group p-5 border rounded-xl transition-all text-left hover:shadow-md hover:-translate-y-0.5 ${packingChoice==='kit' ? 'border-orange-500 shadow-md ring-1 ring-orange-200' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold">Full Packing Kit</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Best Value</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">
                      {packingCfg?.per_room_cents ? (packingRooms > 0 ? `$${Math.round(((packingCfg.per_room_cents||0)*packingRooms)/100)}` : `$${Math.round((packingCfg.per_room_cents||0)/100)}/room`) : '$—'}
                    </div>
                    <ul className="mt-3 list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Complete packing supplies for your move</li>
                      {(packingCfg?.materials || []).filter(m=>m.included).slice(0,4).map(m => (
                        <li key={m.name}>{m.name}</li>
                      ))}
                    </ul>
                  </button>
                  <button
                    type="button"
                    onClick={()=>{ setNeedsPacking(true); setPackingChoice('paygo') }}
                    className={`group p-5 border rounded-xl transition-all text-left hover:shadow-md hover:-translate-y-0.5 ${packingChoice==='paygo' ? 'border-orange-500 shadow-md ring-1 ring-orange-200' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold">Pay as You Go</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Flexible</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">$0</div>
                    <div className="mt-3 text-sm text-gray-700">Choose individual items as needed</div>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                      {(packingCfg?.materials || []).slice(0,6).map(m => (
                        <li key={m.name}>{m.name}: ${Math.round((m.price_cents||0)/100)}</li>
                      ))}
                    </ul>
                  </button>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={()=>{ setNeedsPacking(false); setPackingChoice('none') }}
                    className={`w-full md:w-auto px-6 py-3 rounded-xl border transition hover:shadow ${needsPacking ? 'border-gray-300' : 'border-orange-500 shadow ring-1 ring-orange-200'}`}
                  >
                    I will pack everything myself
                  </button>
                </div>
                {needsPacking && (
                  <div className="mt-6">
                    <label className="block text-sm font-semibold mb-4 text-gray-900">How many rooms?</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            if (num === 6) {
                              // For 6+, set to 6 and show custom input
                              setPackingRooms(6)
                            } else {
                              setPackingRooms(num)
                            }
                          }}
                          className={`
                            relative p-4 rounded-xl border-2 transition-all duration-200 font-semibold text-lg
                            ${packingRooms === num || (num === 6 && packingRooms >= 6)
                              ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 shadow-md shadow-orange-500/20 scale-105'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-sm'
                            }
                          `}
                        >
                          {num === 6 ? (
                            <span className="block">
                              <span className="block text-base">6+</span>
                              <span className="text-xs font-normal text-gray-500 mt-0.5">Custom</span>
                            </span>
                          ) : (
                            <span>{num}</span>
                          )}
                          {(packingRooms === num || (num === 6 && packingRooms >= 6)) && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {packingRooms >= 6 && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm text-gray-600">Custom number:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPackingRooms(Math.max(6, packingRooms - 1))}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={6}
                            value={packingRooms}
                            onChange={e => setPackingRooms(Math.max(6, parseInt(e.target.value) || 6))}
                            className="w-20 text-center border border-gray-300 rounded-lg px-3 py-1.5 font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPackingRooms(packingRooms + 1)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-700 transition-colors font-semibold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="col-span-1 md:col-span-3">
              <label className="block text-sm font-medium mb-2">Any heavy items?</label>
              {(heavyTiers && heavyTiers.length > 0) || (heavySelections && heavySelections.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {heavySelections.map((s, idx) => (
                    <div key={s.key} className={`p-4 border rounded-xl transition-all hover:shadow-md ${s.count>0 ? 'border-orange-500 ring-1 ring-orange-200' : 'border-gray-200'}`}>
                      <div className="font-medium mb-1">{s.min}–{s.max} lbs</div>
                      <div className="text-sm text-gray-700 mb-3">{s.price_cents ? `$${Math.round((s.price_cents||0)/100)} each` : '$— each'}</div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setHeavySelections(prev=>prev.map((p,i)=> i===idx ? { ...p, count: Math.max(0, (p.count||0)-1) } : p))}>−</button>
                        <input type="number" min={0} className="w-16 text-center border rounded p-1" value={s.count} onChange={e=>{ const n = Math.max(0, parseInt(e.target.value||'0')); setHeavySelections(prev => prev.map((p,i)=> i===idx ? { ...p, count: n } : p)) }} />
                        <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setHeavySelections(prev=>prev.map((p,i)=> i===idx ? { ...p, count: (p.count||0)+1 } : p))}>+</button>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-3 space-y-1">
                    <p className="text-sm text-gray-700">Heavy items subtotal: <span className="font-medium">${Math.round((heavySubtotalCents||0)/100)}</span></p>
                    {!stairsPolicy.included && hasStairs && (
                      <p className="text-sm text-gray-700">Stairs subtotal: <span className="font-medium">${Math.round((stairsSubtotalCents||0)/100)}</span></p>
                    )}
                    <p className="text-sm text-gray-900 font-semibold">Extras total: ${Math.round((extrasSubtotalCents||0)/100)}</p>
                    <p className="text-xs text-gray-600">Each quantity is priced per item in its weight band.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <select className="border p-2 rounded w-full" value={heavyBand} onChange={e=>setHeavyBand(e.target.value)}>
                    <option value="none">None</option>
                    <option value="200-400">200–400 lbs</option>
                    <option value="400-600">400–600 lbs</option>
                    <option value="600-800">600–800 lbs</option>
                  </select>
                  {heavyBand !== 'none' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium mb-1">How many heavy items?</label>
                      <input type="number" min={1} className="border p-2 rounded w-full" value={heavyItemsCount} onChange={e=>setHeavyItemsCount(Math.max(1, parseInt(e.target.value||'1')))} />
                      <p className="text-xs text-gray-600 mt-1">Note: each heavy-item fee covers one item. Add quantity for multiple items.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="col-span-1 md:col-span-3">
              <div className={`p-4 border rounded-xl ${hasStairs? 'border-orange-500 ring-1 ring-orange-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input id="has-stairs" type="checkbox" checked={hasStairs} onChange={e=>setHasStairs(e.target.checked)} />
                    Stairs at pickup or dropoff
                  </label>
                  {!stairsPolicy.included && (
                    <div className="text-sm text-gray-700">${Math.round((stairsPolicy.per_flight_cents||0)/100)} / flight</div>
                  )}
                </div>
                {hasStairs && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-gray-600">Total flights</span>
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStairFlights(s=>Math.max(0, (s||0)-1))}>−</button>
                      <input type="number" min={0} className="w-20 text-center border rounded p-1" value={stairFlights} onChange={e=>setStairFlights(Math.max(0, parseInt(e.target.value||'0')))} />
                      <button type="button" className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStairFlights(s=>(s||0)+1)}>+</button>
                    </div>
                    <div className="ml-auto text-sm text-gray-800">Stairs subtotal: <span className="font-medium">${Math.round((stairsSubtotalCents||0)/100)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(2)}>← Back</button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>setStep(4)}>Continue →</button>
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
          <div className="mt-6 p-4 border rounded flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Team Size</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700"
                  onClick={() => setTeamSize(s => Math.max(1, s - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={teamSize}
                  onChange={e => setTeamSize(Math.min(10, Math.max(1, parseInt(e.target.value || '1'))))}
                  className="w-16 text-center border rounded p-1"
                />
                <button
                  type="button"
                  className="px-3 py-1 border rounded hover:bg-orange-50 border-orange-200 text-orange-700"
                  onClick={() => setTeamSize(s => Math.min(10, s + 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-xl font-bold">{hourlyRate ? `$${hourlyRate}/hr` : '—'}</div>
          </div>
          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(1)}>← Back</button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>setStep(3)}>Continue →</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3 text-gray-900">Where are we moving from and to?</h1>
            <p className="text-gray-500 text-lg">Provide the pickup and delivery addresses so we can calculate an accurate quote.</p>
          </div>
          
          {/* Pickup Addresses */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Pickup Location{details.pickupAddresses.length > 1 ? 's' : ''}</h2>
                  <p className="text-sm text-gray-500">Where should we collect your items?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetails(d => ({
                  ...d,
                  pickupAddresses: [...d.pickupAddresses, { address: "", aptSuite: "", city: "", state: "", zip: "", country: "US" }]
                }))}
                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200 hover:shadow-md border border-orange-200"
              >
                + Add Another
              </button>
            </div>
            
            {details.pickupAddresses.map((pickup, idx) => (
              <div key={idx} className={`mb-6 p-6 rounded-xl shadow-sm transition-all duration-200 ${idx === 0 ? 'bg-white border-2 border-orange-100 shadow-md' : 'bg-gray-50/50 border border-gray-200'}`}>
                {details.pickupAddresses.length > 1 && (
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Location {idx + 1}</span>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => setDetails(d => ({
                          ...d,
                          pickupAddresses: d.pickupAddresses.filter((_, i) => i !== idx)
                        }))}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor={`pickup-address-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        id={`pickup-address-${idx}`}
                        placeholder="Start typing address..." 
                        className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${addressErrors.pickup ? 'border-red-500' : 'border-gray-300'}`}
                        value={pickup.address} 
                        onChange={e=>{
                          const value = e.target.value
                          setDetails(d=>({
                            ...d,
                            pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, address: value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, pickup: undefined }))
                          setAutocompleteQuery(prev => ({ ...prev, pickup: value, activeField: `pickup-${idx}` }))
                          searchAutocomplete(value, 'pickup', idx)
                        }}
                        onFocus={() => {
                          if (pickup.address && pickup.address.length >= 3) {
                            setAutocompleteQuery(prev => ({ ...prev, activeField: `pickup-${idx}` }))
                            searchAutocomplete(pickup.address, 'pickup', idx)
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow clicking on suggestion
                          setTimeout(() => {
                            setShowAutocomplete(prev => ({ ...prev, pickup: null }))
                            validateAddress(pickup, 'pickup')
                          }, 200)
                        }}
                        required
                      />
                      {showAutocomplete.pickup === idx && autocompleteSuggestions.pickup.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {autocompleteSuggestions.pickup.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => selectAutocomplete(suggestion, 'pickup', idx)}
                              className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{suggestion.place_name}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {addressErrors.pickup && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {addressErrors.pickup}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor={`pickup-apt-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Apartment, Suite, etc.
                      <span className="text-xs font-normal text-gray-500 ml-1">(optional)</span>
                    </label>
                    <input 
                      id={`pickup-apt-${idx}`}
                      placeholder="Apt 4B, Suite 200" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={pickup.aptSuite} 
                      onChange={e=>setDetails(d=>({
                        ...d,
                        pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, aptSuite: e.target.value} : addr)
                      }))} 
                    />
                  </div>
                  <div>
                    <label htmlFor={`pickup-city-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id={`pickup-city-${idx}`}
                      placeholder="Los Angeles" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={pickup.city} 
                      onChange={e=>{
                        setDetails(d=>({
                          ...d,
                          pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, city: e.target.value} : addr)
                        }))
                        setAddressErrors(prev => ({ ...prev, pickup: undefined }))
                      }}
                      onBlur={() => validateAddress(pickup, 'pickup')}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`pickup-state-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id={`pickup-state-${idx}`}
                        placeholder="CA" 
                        className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                        value={pickup.state} 
                        onChange={e=>{
                          setDetails(d=>({
                            ...d,
                            pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, state: e.target.value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, pickup: undefined }))
                        }}
                        onBlur={() => validateAddress(pickup, 'pickup')}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor={`pickup-zip-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id={`pickup-zip-${idx}`}
                        placeholder="90210" 
                        className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                        value={pickup.zip} 
                        onChange={e=>{
                          setDetails(d=>({
                            ...d,
                            pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, zip: e.target.value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, pickup: undefined }))
                        }}
                        onBlur={() => validateAddress(pickup, 'pickup')}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`pickup-country-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id={`pickup-country-${idx}`}
                      placeholder="United States" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={pickup.country} 
                      onChange={e=>setDetails(d=>({
                        ...d,
                        pickupAddresses: d.pickupAddresses.map((addr, i) => i === idx ? {...addr, country: e.target.value} : addr)
                      }))} 
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Addresses */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-400/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Delivery Location{details.deliveryAddresses.length > 1 ? 's' : ''}</h2>
                  <p className="text-sm text-gray-500">Where should we deliver your items?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetails(d => ({
                  ...d,
                  deliveryAddresses: [...d.deliveryAddresses, { address: "", aptSuite: "", city: "", state: "", zip: "", country: "US" }]
                }))}
                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200 hover:shadow-md border border-orange-200"
              >
                + Add Another
              </button>
            </div>
            
            {details.deliveryAddresses.map((delivery, idx) => (
              <div key={idx} className={`mb-6 p-6 rounded-xl shadow-sm transition-all duration-200 ${idx === 0 ? 'bg-white border-2 border-orange-100 shadow-md' : 'bg-gray-50/50 border border-gray-200'}`}>
                {details.deliveryAddresses.length > 1 && (
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Location {idx + 1}</span>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => setDetails(d => ({
                          ...d,
                          deliveryAddresses: d.deliveryAddresses.filter((_, i) => i !== idx)
                        }))}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor={`delivery-address-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        id={`delivery-address-${idx}`}
                        placeholder="Start typing address..." 
                        className={`w-full px-4 py-3.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400 ${addressErrors.delivery ? 'border-red-500' : 'border-gray-300'}`}
                        value={delivery.address} 
                        onChange={e=>{
                          const value = e.target.value
                          setDetails(d=>({
                            ...d,
                            deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, address: value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, delivery: undefined }))
                          setAutocompleteQuery(prev => ({ ...prev, delivery: value, activeField: `delivery-${idx}` }))
                          searchAutocomplete(value, 'delivery', idx)
                        }}
                        onFocus={() => {
                          if (delivery.address && delivery.address.length >= 3) {
                            setAutocompleteQuery(prev => ({ ...prev, activeField: `delivery-${idx}` }))
                            searchAutocomplete(delivery.address, 'delivery', idx)
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow clicking on suggestion
                          setTimeout(() => {
                            setShowAutocomplete(prev => ({ ...prev, delivery: null }))
                            validateAddress(delivery, 'delivery')
                          }, 200)
                        }}
                        required
                      />
                      {showAutocomplete.delivery === idx && autocompleteSuggestions.delivery.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {autocompleteSuggestions.delivery.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              onClick={() => selectAutocomplete(suggestion, 'delivery', idx)}
                              className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{suggestion.place_name}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {addressErrors.delivery && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {addressErrors.delivery}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor={`delivery-apt-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Apartment, Suite, etc.
                      <span className="text-xs font-normal text-gray-500 ml-1">(optional)</span>
                    </label>
                    <input 
                      id={`delivery-apt-${idx}`}
                      placeholder="Apt 4B, Suite 200" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={delivery.aptSuite} 
                      onChange={e=>setDetails(d=>({
                        ...d,
                        deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, aptSuite: e.target.value} : addr)
                      }))} 
                    />
                  </div>
                  <div>
                    <label htmlFor={`delivery-city-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id={`delivery-city-${idx}`}
                      placeholder="Los Angeles" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={delivery.city} 
                      onChange={e=>{
                        setDetails(d=>({
                          ...d,
                          deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, city: e.target.value} : addr)
                        }))
                        setAddressErrors(prev => ({ ...prev, delivery: undefined }))
                      }}
                      onBlur={() => validateAddress(delivery, 'delivery')}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`delivery-state-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id={`delivery-state-${idx}`}
                        placeholder="CA" 
                        className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                        value={delivery.state} 
                        onChange={e=>{
                          setDetails(d=>({
                            ...d,
                            deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, state: e.target.value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, delivery: undefined }))
                        }}
                        onBlur={() => validateAddress(delivery, 'delivery')}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor={`delivery-zip-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id={`delivery-zip-${idx}`}
                        placeholder="90210" 
                        className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                        value={delivery.zip} 
                        onChange={e=>{
                          setDetails(d=>({
                            ...d,
                            deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, zip: e.target.value} : addr)
                          }))
                          setAddressErrors(prev => ({ ...prev, delivery: undefined }))
                        }}
                        onBlur={() => validateAddress(delivery, 'delivery')}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`delivery-country-${idx}`} className="block text-sm font-semibold mb-2.5 text-gray-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id={`delivery-country-${idx}`}
                      placeholder="United States" 
                      className="w-full px-4 py-3.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:border-gray-400" 
                      value={delivery.country} 
                      onChange={e=>setDetails(d=>({
                        ...d,
                        deliveryAddresses: d.deliveryAddresses.map((addr, i) => i === idx ? {...addr, country: e.target.value} : addr)
                      }))} 
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-4 py-2 border rounded hover:bg-orange-50 border-orange-200 text-orange-700" onClick={()=>setStep(3)}>← Back</button>
            <button 
              onClick={async () => {
                // Always recalculate everything (movers, stairs, heavy items, packing, destination fee, etc.)
                await computeDistance(true) // true = auto-advance to step 5 after calculation
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]" 
              disabled={
                loadingDistance || 
                validatingAddresses ||
                !details.pickupAddresses[0]?.address || 
                !details.pickupAddresses[0]?.city || 
                !details.pickupAddresses[0]?.state || 
                !details.pickupAddresses[0]?.zip ||
                !details.deliveryAddresses[0]?.address || 
                !details.deliveryAddresses[0]?.city || 
                !details.deliveryAddresses[0]?.state || 
                !details.deliveryAddresses[0]?.zip ||
                !!addressErrors.pickup ||
                !!addressErrors.delivery
              }
            >
              {loadingDistance ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculating...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section>
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Trip Estimation and Prices</h1>
          
          {quote?.price && (
            <div className="space-y-6">
              {/* Movers Section */}
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-900">Movers</h2>
                <p className="text-gray-700">
                  {teamSize} movers • ${(() => {
                    const selectedTier = tiers.find(t => t.crew_size === teamSize)
                    const hourlyRateCents = selectedTier?.hourly_rate_cents || quote?.price?.hourly_rate_cents || 14000
                    return (hourlyRateCents / 100).toFixed(0)
                  })()}/hr
                </p>
              </div>

              {/* Total (first 3 hours + selected extras) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Total (first 3 hours + selected extras)</h2>
                  <span className="text-2xl font-bold text-gray-900">${quote.price.breakdown.total}</span>
                </div>
                
                <div className="space-y-3 mb-4">
                  {(() => {
                    const selectedTier = tiers.find(t => t.crew_size === teamSize)
                    const minHours = selectedTier?.min_hours || 3
                    const hourlyRateCents = selectedTier?.hourly_rate_cents || quote?.price?.hourly_rate_cents || 14000
                    const hourlyRate = (hourlyRateCents / 100).toFixed(0)
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Base ({minHours}h @ ${hourlyRate}/hr)</span>
                        <span className="font-semibold text-gray-900">${quote.price.breakdown.base_hourly}</span>
                      </div>
                    )
                  })()}

                  {quote.price.breakdown.packing > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Packing</span>
                      <span className="font-semibold text-gray-900">${quote.price.breakdown.packing}</span>
                    </div>
                  )}

                  {quote.price.breakdown.heavy_items > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Heavy Items</span>
                      <span className="font-semibold text-gray-900">${quote.price.breakdown.heavy_items}</span>
                    </div>
                  )}

                  {quote.price.breakdown.stairs > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Stairs</span>
                      <span className="font-semibold text-gray-900">${quote.price.breakdown.stairs}</span>
                    </div>
                  )}
                  
                  {quote.price.destination_fee && parseFloat(quote.price.destination_fee) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Destination fee</span>
                      <span className="font-semibold text-gray-900">${quote.price.destination_fee}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Pay as You Go</span>
                    <span className="font-semibold text-gray-900">$0</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                {distanceMi != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {details.pickupAddresses.length > 1 || details.deliveryAddresses.length > 1 
                        ? 'Total Route Distance' 
                        : 'Estimated Distance'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{distanceMi.toFixed(1)} mi</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Double Drive Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {quote.price.double_drive_time ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {quote.price.double_drive_time && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-700">
                        <strong>What's Double Drive Time?</strong> If the distance between your pick up and drop-off locations is more than 10 miles, going from your pick-up to drop-off locations we're going to double the drive time (so, for example, if it takes us 30 minutes to drive from your pick up to drop off location, we will double it and write down 1 hour instead for the drive time). It is a standard procedure for all licensed and insured moving companies in CA and is reflected on a standard contract as "double drive time".
                      </p>
                    </div>
                  )}
                </div>
                
                {quote.price.destination_fee && parseFloat(quote.price.destination_fee) > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Destination Fee</span>
                      <span className="text-sm font-semibold text-gray-900">${quote.price.destination_fee}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-700">
                        Applied when traveling outside Los Angeles. Calculated from our base to your furthest address.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Grand Total (Due Today) */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-gray-900">Grand Total (Due Today)</h2>
                  <span className="text-2xl font-bold text-gray-900">${quote.price.breakdown.total}</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Covers the first 3 hours and selected extras. Additional time and any optional supplies are billed after service.
                </p>
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-between">
            <button 
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 border-gray-300 text-gray-700 font-medium transition-colors" 
              onClick={()=>setStep(4)}
            >
              ← Back
            </button>
            <button 
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-lg shadow-orange-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
              onClick={()=>setStep(6)} 
              disabled={!quote}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-3xl font-semibold mb-3 text-gray-900">{providerName ? `Book with ${providerName}` : 'Start your booking'}</h1>
          {businessInfo && (
            <div className="mb-6">
              {businessInfo.city || businessInfo.state ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  {[businessInfo.city, businessInfo.state].filter(Boolean).join(', ')}
                </span>
              ) : null}
            </div>
          )}
          <p className="text-gray-600 mb-6 text-base">When would you like to schedule your move?</p>
          
          <div className="flex flex-col items-center max-w-lg mx-auto">
            {/* Modern Calendar */}
            <div className="mb-6 w-full">
              <label className="block text-xs font-semibold mb-3 text-gray-700 uppercase tracking-wide text-center">Select Date</label>
              <ModernCalendar 
                selectedDate={details.moveDate || undefined}
                onDateSelect={(date) => {
                  // Format date in local timezone to avoid timezone shift issues
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  const dateString = `${year}-${month}-${day}`
                  console.log('[Date Select]', { selected: date, formatted: dateString, dateString })
                  setDetails(d=>({...d,moveDate:dateString}))
                }}
                minDate={new Date()}
              />
              {details.moveDate && (() => {
                // Parse date string in local timezone to avoid UTC shift
                const [year, month, day] = details.moveDate.split('-').map(Number)
                const selectedDate = new Date(year, month - 1, day)
                selectedDate.setHours(0, 0, 0, 0)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return selectedDate < today
              })() && (
                <p className="mt-3 text-sm text-red-600 flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Move date cannot be in the past
                </p>
              )}
            </div>

            {/* Modern Time Slot Selector - Appears below calendar when date is selected */}
            {details.moveDate && !(() => {
              // Parse date string in local timezone to avoid UTC shift
              const [year, month, day] = details.moveDate.split('-').map(Number)
              const selectedDate = new Date(year, month - 1, day)
              selectedDate.setHours(0, 0, 0, 0)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return selectedDate < today
            })() && (
              <div className="mb-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                <label className="block text-xs font-semibold mb-3 text-gray-700 uppercase tracking-wide text-center">Preferred Time</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDetails(d=>({...d,timeSlot:'morning'} as any))}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                      (details as any).timeSlot === 'morning'
                        ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-semibold mb-0.5 ${
                          (details as any).timeSlot === 'morning' ? 'text-orange-700' : 'text-gray-900'
                        }`}>
                          Morning
                        </div>
                        <div className="text-xs text-gray-600">8:00 AM - 12:00 PM</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-all ${
                        (details as any).timeSlot === 'morning'
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                      }`}>
                        {(details as any).timeSlot === 'morning' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetails(d=>({...d,timeSlot:'afternoon'} as any))}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                      (details as any).timeSlot === 'afternoon'
                        ? 'border-orange-500 bg-orange-50 shadow-sm shadow-orange-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-semibold mb-0.5 ${
                          (details as any).timeSlot === 'afternoon' ? 'text-orange-700' : 'text-gray-900'
                        }`}>
                          Afternoon
                        </div>
                        <div className="text-xs text-gray-600">12:00 PM - 5:00 PM</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-all ${
                        (details as any).timeSlot === 'afternoon'
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300 bg-white group-hover:border-gray-400'
                      }`}>
                        {(details as any).timeSlot === 'afternoon' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button 
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-base shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]" 
              onClick={()=>setStep(2)} 
              disabled={!details.moveDate || !(details as any).timeSlot || (details.moveDate ? new Date(details.moveDate) < new Date() : false)}
            >
              Continue →
            </button>
          </div>
        </section>
      )}

      {step === 6 && (
        <ContactInfoStep
          details={details}
          setDetails={setDetails}
          quote={quote}
          onBack={() => setStep(5)}
          onContinue={() => setStep(7)}
          supabase={supabase}
        />
      )}

      {step === 7 && (
        <ReservationSubmissionStep
          details={details}
          quote={quote}
          providerId={providerIdParam}
          businessId={businessIdParam}
          timeSlot={(details as any).timeSlot}
          onBack={() => setStep(6)}
          heavySelections={heavySelections}
          hasStairs={hasStairs}
          stairFlights={stairFlights}
          needsPacking={needsPacking}
          packingChoice={packingChoice}
          packingRooms={packingRooms}
        />
      )}

      {step !== 1 && step !== 2 && step !== 3 && step !== 4 && step !== 5 && step !== 6 && step !== 7 && (
        <section>
          <h1 className="text-2xl font-semibold mb-2">{providerName ? `Book with ${providerName}` : 'Start your booking'}</h1>
          {businessInfo && (
            <div className="mb-4 text-sm text-gray-700">
              <div className="flex flex-wrap items-center gap-2">
                {businessInfo.city || businessInfo.state ? (
                  <span className="inline-flex items-center px-2 py-1 rounded border border-orange-200 text-orange-700">{[businessInfo.city, businessInfo.state].filter(Boolean).join(', ')}</span>
                ) : null}
              </div>
            </div>
          )}
          <p className="text-gray-600 mb-6">Answer a few quick questions and we'll craft a fair, transparent quote—then secure your crew in minutes.</p>
          <button className="px-6 py-3 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow" onClick={()=>setStep(1)}>Begin →</button>
        </section>
      )}
    </div>
  )
}

export default function MoversBookingWizard() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <WizardInner />
    </Suspense>
  )
}


