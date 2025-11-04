'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, Archive, CheckCheck, X } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'info'
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200'
        }
      case 'warning':
        return {
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-900',
          buttonBg: 'bg-orange-600 hover:bg-orange-700',
          borderColor: 'border-orange-200'
        }
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-900',
          buttonBg: 'bg-gray-600 hover:bg-gray-700',
          borderColor: 'border-gray-200'
        }
    }
  }

  const styles = getVariantStyles()
  const Icon = variant === 'destructive' ? Trash2 : variant === 'warning' ? AlertTriangle : CheckCheck

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md border-2 ${styles.borderColor} shadow-xl bg-white`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <DialogTitle className={`text-xl font-bold ${styles.titleColor}`}>
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 pt-2 leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6 py-2 border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={`px-6 py-2 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all ${styles.buttonBg}`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

