'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

interface MissionFormProps {
  isOpen: boolean
  onClose: () => void
  type: 'discord_join' | 'category_vote' | 'donation' | 'founding_supporter' | 'city_node_pilot' | 'white_label_demo'
  title: string
  description: string
}

const CATEGORIES = [
  'Electricians',
  'Plumbers',
  'Cleaners',
  'Landscapers',
  'Handypeople',
  'Painters',
  'Roofers',
  'HVAC',
  'Other'
]

export function MissionForm({ isOpen, onClose, type, title, description }: MissionFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setToast({ show: true, message: "Please provide your email address.", type: 'error' })
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
      return
    }

    setSubmitting(true)

    try {
      const additionalData: any = {}
      
      if (type === 'category_vote' && category) {
        additionalData.category = category
      }
      
      if (type === 'donation' && amount) {
        additionalData.amount = amount
      }

      const response = await fetch('/api/mission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_type: type,
          name: name || null,
          email,
          phone: phone || null,
          organization: organization || null,
          message: message || null,
          additional_data: additionalData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      setToast({ show: true, message: data.message || "Thank you! We'll be in touch soon.", type: 'success' })
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)

      // Reset form
      setName('')
      setEmail('')
      setPhone('')
      setOrganization('')
      setMessage('')
      setCategory('')
      setAmount('')
      
      onClose()
    } catch (error: any) {
      setToast({ show: true, message: error.message || "Failed to submit. Please try again.", type: 'error' })
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-50 to-white border-2 border-orange-200 shadow-2xl">
        <DialogHeader className="border-b border-orange-100 pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900 font-medium">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {(type === 'city_node_pilot' || type === 'white_label_demo' || type === 'founding_supporter') && (
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-gray-900 font-medium">Organization</Label>
                <Input
                  id="organization"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Your organization"
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            )}

            {(type === 'city_node_pilot' || type === 'white_label_demo' || type === 'donation' || type === 'founding_supporter') && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-900 font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            )}

            {type === 'category_vote' && (
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-900 font-medium">Which category should we build next? *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'donation' && (
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-900 font-medium">Donation Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500">Any amount helps! We'll contact you with payment details.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message" className="text-gray-900 font-medium">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                rows={4}
                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-orange-100 pt-4 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={submitting}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !email || (type === 'category_vote' && !category)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border backdrop-blur-sm max-w-md transition-all ${
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
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast({ show: false, message: '', type: 'success' })}
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors ${
                  toast.type === 'success' ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'
                }`}
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

