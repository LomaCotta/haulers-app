'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Mail, Send } from 'lucide-react'

export default function TestEmailPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('Test Email from Haulers.app')
  const [message, setMessage] = useState('This is a test email from the Haulers notification system.')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)

  const checkConfig = async () => {
    try {
      const response = await fetch('/api/email/test')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error checking config:', error)
    }
  }

  const sendTestEmail = async () => {
    if (!to.trim()) {
      setResult({ success: false, error: 'Please enter an email address' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          message
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Failed to send test email'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Email Service</h1>
        <p className="text-gray-600">Test the Resend email integration</p>
      </div>

      {/* Configuration Check */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={checkConfig} variant="outline">
              Check Configuration
            </Button>
            {config && (
              <div className={`p-4 rounded-lg ${
                config.configured 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {config.configured ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    config.configured ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {config.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>From Email:</strong> {config.fromEmail}</p>
                  <p><strong>From Name:</strong> {config.fromName}</p>
                  <p className="mt-2">{config.message}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify the notification system is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="to">To Email Address</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Leave empty to send to your account email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>

          <Button
            onClick={sendTestEmail}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg border-2 ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.success ? 'Success!' : 'Failed'}
                </span>
              </div>
              {result.success ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Message ID:</strong> {result.messageId || 'N/A'}</p>
                  <p><strong>Sent to:</strong> {result.sentTo}</p>
                  <p><strong>From:</strong> {result.details?.fromEmail}</p>
                  <p className="mt-2 text-green-700">{result.message}</p>
                </div>
              ) : (
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Error:</strong> {result.error}</p>
                  {result.details && (
                    <div className="mt-3 pt-3 border-t border-red-200 space-y-1">
                      <p><strong>Configured:</strong> {result.details.configured ? 'Yes' : 'No'}</p>
                      {result.details.apiKeyFormat && (
                        <p><strong>API Key Format:</strong> <span className={result.details.apiKeyFormat === 'valid' ? 'text-green-700' : 'text-red-700'}>{result.details.apiKeyFormat}</span></p>
                      )}
                      {result.details.apiKeyPreview && (
                        <p><strong>API Key Preview:</strong> <code className="bg-gray-100 px-1 rounded">{result.details.apiKeyPreview}</code></p>
                      )}
                      {result.details.rawKeyPreview && result.details.rawKeyPreview !== result.details.apiKeyPreview && (
                        <p><strong>Raw Key Preview:</strong> <code className="bg-gray-100 px-1 rounded">{result.details.rawKeyPreview}</code></p>
                      )}
                      {result.details.hasQuotes && (
                        <p className="text-orange-700"><strong>⚠️ Warning:</strong> API key has quotes - they will be automatically removed</p>
                      )}
                      {result.details.fromEmail && (
                        <p><strong>From Email:</strong> {result.details.fromEmail}</p>
                      )}
                      {result.details.resendError && (
                        <p className="mt-2 pt-2 border-t border-red-200">
                          <strong>Resend Error:</strong> {result.details.resendError}
                        </p>
                      )}
                      {result.details.resendCode && (
                        <p><strong>Resend Code:</strong> {result.details.resendCode}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-red-200 bg-red-50 p-3 rounded">
                    <p className="font-semibold mb-2">Troubleshooting:</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Make sure your RESEND_API_KEY is correct and active</li>
                      <li>API keys start with "re_" - verify the format</li>
                      <li>Restart your dev server after updating .env.local</li>
                      <li className="font-semibold text-red-700">⚠️ Domain Verification Required: If using a custom domain (e.g., support@haulers.app), you must verify it in Resend first</li>
                      <li className="font-semibold text-green-700">✅ Quick Fix: Change RESEND_FROM_EMAIL to "onboarding@resend.dev" in .env.local for testing (no verification needed)</li>
                      <li>Verify domains at: <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">https://resend.com/domains</a></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

