'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Send, X, AlertCircle, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuoteFormProps {
  bookingId: string
  onQuoteSent?: () => void
}

export function QuoteForm({ bookingId, onQuoteSent }: QuoteFormProps) {
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const amountCents = Math.round(parseFloat(quoteAmount) * 100)
      
      if (!amountCents || amountCents <= 0) {
        setError('Please enter a valid quote amount')
        return
      }

      if (!quoteMessage.trim()) {
        setError('Please enter a message for the customer')
        return
      }

      // Call the send_quote function
      const { data, error: quoteError } = await supabase.rpc('send_quote', {
        p_booking_id: bookingId,
        p_quote_amount_cents: amountCents,
        p_quote_message: quoteMessage.trim(),
        p_quote_notes: quoteNotes.trim() || null,
        p_valid_until_days: 7
      })

      if (quoteError) {
        console.error('Quote error:', quoteError)
        setError(quoteError.message || 'Failed to send quote. Please try again.')
        return
      }

      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        setError(data.replace('ERROR: ', ''))
        return
      }

      setSuccess(true)
      onQuoteSent?.()
      
      // Refresh the page after a delay
      setTimeout(() => {
        router.refresh()
      }, 2000)

    } catch (err) {
      console.error('Error sending quote:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mt-6 pt-6 border-t">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">Quote Sent Successfully! ✅</h4>
              <p className="text-sm text-green-700 mt-1">
                The customer has been notified and will receive a notification. 
                They can view and respond to your quote in their dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 pt-6 border-t">
      <h4 className="font-medium mb-4">Send Quote</h4>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`quote-amount-${bookingId}`}>Quote Amount ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id={`quote-amount-${bookingId}`}
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`quote-notes-${bookingId}`}>Internal Notes</Label>
            <Input
              id={`quote-notes-${bookingId}`}
              placeholder="Additional details (not sent to customer)..."
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor={`quote-message-${bookingId}`}>Message to Customer *</Label>
          <Textarea
            id={`quote-message-${bookingId}`}
            placeholder="Explain your quote, pricing breakdown, and any conditions or terms..."
            rows={4}
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            required
            className="min-h-[100px]"
          />
          <p className="text-xs text-gray-500 mt-1">
            This message will be sent to the customer along with the quote amount.
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Quote
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              setQuoteAmount('')
              setQuoteMessage('')
              setQuoteNotes('')
              setError('')
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </form>
    </div>
  )
}
