'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, ArrowRight, X } from 'lucide-react'

interface ApprovalDialogProps {
  isOpen: boolean
  onClose: () => void
  businessName?: string
  submittedAt?: Date
}

export function ApprovalDialog({ isOpen, onClose, businessName, submittedAt }: ApprovalDialogProps) {
  const [timeElapsed, setTimeElapsed] = useState('')

  useEffect(() => {
    if (submittedAt) {
      const updateTime = () => {
        const now = new Date()
        const diff = now.getTime() - submittedAt.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) {
          setTimeElapsed(`${days} day${days > 1 ? 's' : ''} ago`)
        } else if (hours > 0) {
          setTimeElapsed(`${hours} hour${hours > 1 ? 's' : ''} ago`)
        } else if (minutes > 0) {
          setTimeElapsed(`${minutes} minute${minutes > 1 ? 's' : ''} ago`)
        } else {
          setTimeElapsed('Just now')
        }
      }

      updateTime()
      const interval = setInterval(updateTime, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [submittedAt])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            Changes Submitted Successfully!
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-lg">
            Your business profile changes have been submitted for admin review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Business Info */}
          {businessName && (
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="font-semibold text-slate-700">Business:</span>
                <span className="text-blue-700 font-medium">{businessName}</span>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Under Review</p>
                <p className="text-sm text-amber-700">
                  Our admin team will review your changes within 24-48 hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">What Happens Next?</p>
                <p className="text-sm text-green-700">
                  You'll receive an email notification once your changes are approved
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Review Timeline</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-slate-600">Changes submitted {timeElapsed}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-amber-300"></div>
                <span className="text-slate-600">Admin review in progress</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                <span className="text-slate-500">Changes go live after approval</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50 py-3 rounded-xl"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
